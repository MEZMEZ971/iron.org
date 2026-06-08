const crypto = require("crypto");
const { prisma } = require("./prisma.cjs");

/** Inclusive bounds for public 8-digit numeric UIDs (no leading-zero shrink). */
const UID_MIN = 10_000_000;
const UID_MAX = 99_999_999;
const MAX_ALLOCATION_ATTEMPTS = 16;

/**
 * One cryptographically random 8-digit UID candidate (not uniqueness-checked).
 * @returns {string}
 */
function generateUidCandidate() {
  return String(crypto.randomInt(UID_MIN, UID_MAX + 1));
}

function isValidPublicUid(value) {
  if (typeof value !== "string" && typeof value !== "number") return false;
  const s = String(value).trim();
  return /^[0-9]{8}$/.test(s);
}

/**
 * Allocate a UID that is not already present in `User.uid`.
 * Retries on collision; throws if the pool is exhausted under contention.
 *
 * @param {import('@prisma/client').PrismaClient} [db]
 * @returns {Promise<string>}
 */
async function allocateUniqueUid(db = prisma) {
  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
    const uid = generateUidCandidate();
    const existing = await db.user.findUnique({
      where: { uid },
      select: { id: true },
    });
    if (!existing) return uid;
  }

  const err = new Error("Unable to allocate a unique public UID");
  err.code = "UID_EXHAUSTED";
  throw err;
}

module.exports = {
  UID_MIN,
  UID_MAX,
  MAX_ALLOCATION_ATTEMPTS,
  generateUidCandidate,
  isValidPublicUid,
  allocateUniqueUid,
};
