const crypto = require("crypto");
const { prisma } = require("./prisma.cjs");

const INVITE_CODE_LENGTH = 6;
/** Uppercase letters + digits, excluding ambiguous 0/O, 1/I/L. */
const INVITE_CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const MAX_ALLOCATION_ATTEMPTS = 32;

function normalizeInviteCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, INVITE_CODE_LENGTH);
}

function isValidInviteCode(code) {
  const normalized = normalizeInviteCode(code);
  if (normalized.length !== INVITE_CODE_LENGTH) return false;
  for (const ch of normalized) {
    if (!INVITE_CODE_CHARS.includes(ch)) return false;
  }
  return true;
}

/** One random 6-character candidate (not uniqueness-checked). */
function generateReferralCodeCandidate() {
  const bytes = crypto.randomBytes(INVITE_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_CHARS[bytes[i] % INVITE_CODE_CHARS.length];
  }
  return code;
}

/**
 * Allocate a unique 6-character referral code for `User.referralCode`.
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

function isLegacyReferralCode(code) {
  const raw = String(code || "").trim().toUpperCase();
  if (!raw) return false;
  if (raw.startsWith("DFUSER")) return true;
  if (raw.length > INVITE_CODE_LENGTH) return true;
  return !isValidInviteCode(raw);
}

/**
 * Resolve sponsor user id from invite code (6-char or legacy long format).
 * Returns null when missing, unknown, or ambiguous.
 */
async function findReferrerByInviteCode(code, db = prisma) {
  const raw = String(code || "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();

  // 1. Exact match on current referralCode (handles legacy codes still in DB)
  const exactReferral = await db.user.findFirst({
    where: { referralCode: { equals: upper, mode: "insensitive" } },
    select: { id: true },
  });
  if (exactReferral) return exactReferral.id;

  // 2. Exact match on stored legacy alias (after forceBackfill migration)
  const legacyAlias = await db.user.findFirst({
    where: { legacyReferralCode: { equals: upper, mode: "insensitive" } },
    select: { id: true },
  });
  if (legacyAlias) return legacyAlias.id;

  // 3. Valid 6-character code only — never truncate long legacy strings
  if (isValidInviteCode(raw)) {
    const normalized = normalizeInviteCode(raw);
    const shortMatch = await db.user.findFirst({
      where: { referralCode: { equals: normalized, mode: "insensitive" } },
      select: { id: true },
    });
    if (shortMatch) return shortMatch.id;
  }

  return null;
}

module.exports = {
  INVITE_CODE_LENGTH,
  INVITE_CODE_CHARS,
  MAX_ALLOCATION_ATTEMPTS,
  normalizeInviteCode,
  isValidInviteCode,
  isLegacyReferralCode,
  generateReferralCodeCandidate,
  allocateUniqueReferralCode,
  findReferrerByInviteCode,
};
