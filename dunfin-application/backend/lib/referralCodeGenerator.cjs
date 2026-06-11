const crypto = require("crypto");
const { prisma } = require("./prisma.cjs");
const { shortInviteCode } = require("../invite.cjs");

const REFERRAL_PREFIX = "IRON";
const MAX_ALLOCATION_ATTEMPTS = 16;

/** One random IRON-XXXXXX candidate (not uniqueness-checked). */
function generateReferralCodeCandidate() {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${REFERRAL_PREFIX}-${suffix}`;
}

/**
 * Allocate a referral code that is not already present in `User.referralCode`.
 * @param {import('@prisma/client').PrismaClient} [db]
 */
async function allocateUniqueReferralCode(db = prisma) {
  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
    const referralCode = generateReferralCodeCandidate();
    const existing = await db.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    if (!existing) return referralCode;
  }

  const err = new Error("Unable to allocate a unique referral code");
  err.code = "REFERRAL_CODE_EXHAUSTED";
  throw err;
}

/**
 * Resolve sponsor user id from an incoming invite / referral token.
 * Returns null when missing, unknown, or ambiguous — never a fallback admin.
 */
async function findReferrerByInviteCode(code, db = prisma) {
  const raw = String(code || "").trim();
  if (!raw) return null;

  const exact = await db.user.findFirst({
    where: { referralCode: { equals: raw, mode: "insensitive" } },
    select: { id: true },
  });
  if (exact) return exact.id;

  const byUid = await db.user.findFirst({
    where: { uid: { equals: raw, mode: "insensitive" } },
    select: { id: true },
  });
  if (byUid) return byUid.id;

  const normalizedShort = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalizedShort.length < 4) return null;

  const users = await db.user.findMany({
    select: { id: true, referralCode: true },
  });

  const shortMatches = users.filter(
    (user) => shortInviteCode(user.referralCode) === normalizedShort
  );

  if (shortMatches.length === 1) {
    return shortMatches[0].id;
  }

  return null;
}

module.exports = {
  REFERRAL_PREFIX,
  MAX_ALLOCATION_ATTEMPTS,
  generateReferralCodeCandidate,
  allocateUniqueReferralCode,
  findReferrerByInviteCode,
};
