const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { prisma } = require("./lib/prisma.cjs");
const {
  mapUserToLegacy,
} = require("./lib/userMapper.cjs");
const { allocateUniqueUid } = require("./lib/uidGenerator.cjs");
const {
  allocateUniqueReferralCode,
  findReferrerByInviteCode,
} = require("./lib/referralCodeGenerator.cjs");
const { getDepositAddress } = require("./deposit.cjs");

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES = "7d";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  return secret || "dunfin-dev-jwt-secret-change-me";
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizePhone(digits) {
  return String(digits || "").replace(/\D/g, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username || user.displayName,
      role: user.role || "USER",
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function mapPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.id,
    username: row.username,
    email: row.email,
    phone: row.phone,
    phoneCountryCode: row.phoneCountryCode,
    displayName: row.displayName || row.username,
    uid: row.uid,
    referralCode: row.referralCode,
    role: row.role || "USER",
  };
}

async function findUserByLoginIdentifier(identifier) {
  const raw = String(identifier || "").trim();
  if (!raw) return null;

  const username = normalizeUsername(raw);
  const email = normalizeEmail(raw);
  const phone = normalizePhone(raw);

  return prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
        { phone },
        ...(phone.length >= 6 ? [{ phone: { endsWith: phone.slice(-10) } }] : []),
      ],
    },
    include: {
      deposits: { orderBy: { createdAt: "desc" }, take: 1 },
      trades: { orderBy: { executedAt: "desc" }, take: 1 },
      networkAddresses: true,
    },
  });
}

async function ensureForwardersForUser(userId, depositClients) {
  const networks = ["ERC20", "BEP20", "TRC20"];
  const results = [];
  for (const network of networks) {
    try {
      const r = await getDepositAddress(userId, network, depositClients);
      results.push(r);
    } catch (err) {
      console.warn(`[auth] forwarder ${network} for ${userId}:`, err.message);
    }
  }
  return results;
}

async function registerUser({
  username,
  email,
  phone,
  phoneCountryCode,
  password,
  invitationCode,
}) {
  const uname = normalizeUsername(username);
  const mail = normalizeEmail(email);
  const phoneDigits = normalizePhone(phone);
  const country = String(phoneCountryCode || "+1").trim();

  if (!uname || uname.length < 3 || !/^[a-z0-9_]+$/.test(uname)) {
    const err = new Error(
      "Username must be at least 3 characters (lowercase letters, numbers, underscore only)"
    );
    err.code = "INVALID_USERNAME";
    throw err;
  }
  if (!isValidEmail(mail)) {
    const err = new Error("Invalid email address");
    err.code = "INVALID_EMAIL";
    throw err;
  }
  if (phoneDigits.length < 6) {
    const err = new Error("Invalid phone number");
    err.code = "INVALID_PHONE";
    throw err;
  }
  if (!password || String(password).length < 8) {
    const err = new Error("Password must be at least 8 characters");
    err.code = "INVALID_PASSWORD";
    throw err;
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username: uname }, { email: mail }, { phone: phoneDigits }],
    },
  });
  if (existing) {
    const err = new Error("Username, email, or phone already registered");
    err.code = "USER_EXISTS";
    throw err;
  }

  let referredById = null;
  const inviteCodeRaw = String(invitationCode || "").trim();
  if (inviteCodeRaw) {
    referredById = await findReferrerByInviteCode(inviteCodeRaw);
  }

  const id = `user_${crypto.randomBytes(12).toString("hex")}`;
  const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
  const uid = await allocateUniqueUid();
  const referralCode = await allocateUniqueReferralCode();

  const row = await prisma.user.create({
    data: {
      id,
      uid,
      username: uname,
      email: mail,
      phone: phoneDigits,
      phoneCountryCode: country,
      passwordHash,
      displayName: uname,
      referralCode,
      referredById,
    },
    include: {
      deposits: true,
      trades: true,
      networkAddresses: true,
    },
  });

  const token = signToken(row);
  return { token, user: mapPublicUser(row), legacy: mapUserToLegacy(row) };
}

const ACCOUNT_DEACTIVATED_MESSAGE =
  "Your account has been deactivated by administration. Please contact support center.";

async function loginUser({ identifier, password }, depositClients) {
  const row = await findUserByLoginIdentifier(identifier);
  if (!row || !row.passwordHash) {
    const err = new Error("Invalid credentials");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  if (row.accountActive === false) {
    const err = new Error(ACCOUNT_DEACTIVATED_MESSAGE);
    err.code = "ACCOUNT_DEACTIVATED";
    throw err;
  }

  const match = await bcrypt.compare(String(password), row.passwordHash);
  if (!match) {
    const err = new Error("Invalid credentials");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  if (depositClients) {
    await ensureForwardersForUser(row.id, depositClients);
  }

  await prisma.user.update({
    where: { id: row.id },
    data: { lastActivityAt: new Date() },
  });

  const refreshed = await prisma.user.findUnique({
    where: { id: row.id },
    include: {
      deposits: { orderBy: { createdAt: "desc" } },
      trades: { orderBy: { executedAt: "desc" } },
      networkAddresses: true,
    },
  });

  const token = signToken(refreshed);
  return {
    success: true,
    token,
    user: mapPublicUser(refreshed),
    legacy: mapUserToLegacy(refreshed),
  };
}

module.exports = {
  registerUser,
  loginUser,
  signToken,
  verifyToken,
  mapPublicUser,
  normalizeUsername,
  normalizeEmail,
  normalizePhone,
  findUserByLoginIdentifier,
  ACCOUNT_DEACTIVATED_MESSAGE,
};
