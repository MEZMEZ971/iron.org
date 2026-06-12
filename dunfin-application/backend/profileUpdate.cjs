const bcrypt = require("bcrypt");
const { prisma } = require("./lib/prisma.cjs");
const { mapPublicUser, normalizeEmail } = require("./authService.cjs");

const BCRYPT_ROUNDS = 10;
const OTP_TTL_MS = 10 * 60 * 1000;

const BLOCKED_SELF_SERVICE_FIELDS = new Set([
  "isInvited",
  "taxFreeUntil",
  "hasActivatedBonusStrategy",
  "walletBalance",
  "onChainBalance",
  "lockedCapital",
  "tradingCapital",
  "role",
  "referredById",
  "referralCode",
  "uid",
  "accountActive",
  "monthlyTradingProceeds",
  "proceedsPeriodStart",
]);

function rejectPrivilegedFields(body) {
  for (const key of BLOCKED_SELF_SERVICE_FIELDS) {
    if (body[key] !== undefined) {
      const err = new Error("This field cannot be changed from the client");
      err.code = "FORBIDDEN_FIELD";
      throw err;
    }
  }
}

/** @type {Map<string, { code: string, email: string, expires: number }>} */
const emailOtpByUser = new Map();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendEmailVerificationCode(userId, email) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    const err = new Error("Invalid email address");
    err.code = "INVALID_EMAIL";
    throw err;
  }

  const taken = await prisma.user.findFirst({
    where: { email: normalized, NOT: { id: userId } },
    select: { id: true },
  });
  if (taken) {
    const err = new Error("Email is already in use");
    err.code = "EMAIL_TAKEN";
    throw err;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  emailOtpByUser.set(userId, {
    code,
    email: normalized,
    expires: Date.now() + OTP_TTL_MS,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[mock-email-otp] user=${userId} email=${normalized} code=${code}`);
  }

  return { success: true, message: "Verification code sent" };
}

async function updateUserProfile(userId, body) {
  rejectPrivilegedFields(body || {});
  const data = {};
  const row = await prisma.user.findUnique({ where: { id: userId } });
  if (!row) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  if (body.displayName !== undefined) {
    const name = String(body.displayName || "").trim();
    if (name.length < 2 || name.length > 32) {
      const err = new Error("Nickname must be 2–32 characters");
      err.code = "INVALID_NICKNAME";
      throw err;
    }
    data.displayName = name;
  }

  if (body.email !== undefined) {
    const normalized = normalizeEmail(body.email);
    const verificationCode = String(body.verificationCode || "").trim();

    if (!isValidEmail(normalized)) {
      const err = new Error("Invalid email address");
      err.code = "INVALID_EMAIL";
      throw err;
    }
    if (!verificationCode) {
      const err = new Error("Verification code required");
      err.code = "OTP_REQUIRED";
      throw err;
    }

    const stored = emailOtpByUser.get(userId);
    if (
      !stored ||
      stored.expires < Date.now() ||
      stored.email !== normalized ||
      stored.code !== verificationCode
    ) {
      const err = new Error("Invalid or expired verification code");
      err.code = "INVALID_OTP";
      throw err;
    }

    const taken = await prisma.user.findFirst({
      where: { email: normalized, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) {
      const err = new Error("Email is already in use");
      err.code = "EMAIL_TAKEN";
      throw err;
    }

    data.email = normalized;
    emailOtpByUser.delete(userId);
  }

  if (body.passwordType === "login") {
    const oldPassword = String(body.oldPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!newPassword || newPassword.length < 8) {
      const err = new Error("New password must be at least 8 characters");
      err.code = "INVALID_PASSWORD";
      throw err;
    }
    if (!row.passwordHash) {
      const err = new Error("No login password set for this account");
      err.code = "NO_PASSWORD";
      throw err;
    }
    const match = await bcrypt.compare(oldPassword, row.passwordHash);
    if (!match) {
      const err = new Error("Current password is incorrect");
      err.code = "WRONG_PASSWORD";
      throw err;
    }
    data.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  }

  if (body.passwordType === "payment") {
    const oldPassword = String(body.oldPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!/^\d{6}$/.test(newPassword)) {
      const err = new Error("Payment password must be exactly 6 digits");
      err.code = "INVALID_PAYMENT_PIN";
      throw err;
    }

    if (row.paymentPasswordHash) {
      const match = await bcrypt.compare(oldPassword, row.paymentPasswordHash);
      if (!match) {
        const err = new Error("Current payment password is incorrect");
        err.code = "WRONG_PASSWORD";
        throw err;
      }
    }

    data.paymentPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  }

  if (!Object.keys(data).length) {
    const err = new Error("No valid fields to update");
    err.code = "EMPTY_UPDATE";
    throw err;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return mapPublicUser(updated);
}

module.exports = {
  sendEmailVerificationCode,
  updateUserProfile,
};
