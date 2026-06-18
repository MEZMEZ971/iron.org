/**
 * One-time migration: replace legacy long referralCode values (DFUSER…, IRON-…, etc.)
 * with unique 6-character codes while preserving old links via legacyReferralCode.
 *
 * Usage:
 *   node scripts/forceBackfillLegacyCodes.cjs           # dry run
 *   node scripts/forceBackfillLegacyCodes.cjs --apply   # persist
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { prisma } = require("../lib/prisma.cjs");
const {
  allocateUniqueReferralCode,
  isValidInviteCode,
  isLegacyReferralCode,
} = require("../lib/referralCodeGenerator.cjs");

function needsMigration(user) {
  const code = String(user.referralCode || "").trim();
  if (!code) return true;
  if (code.toUpperCase().startsWith("DFUSER")) return true;
  if (code.length > 6) return true;
  return !isValidInviteCode(code);
}

function displayUser(user) {
  return user.username || user.uid || user.id;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      uid: true,
      username: true,
      role: true,
      referralCode: true,
      legacyReferralCode: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const targets = users.filter(needsMigration);

  console.log(
    `Found ${targets.length} user(s) with legacy referralCode (${users.length} total).`
  );

  if (targets.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  if (!apply) {
    console.log("Dry run — pass --apply to persist changes.\n");
    for (const user of targets) {
      console.log(
        `  Would migrate ${displayUser(user)} (${user.role}): ${user.referralCode}`
      );
    }
    return;
  }

  let migrated = 0;

  for (const user of targets) {
    const oldCode = String(user.referralCode || "").trim();
    const referralCode = await allocateUniqueReferralCode();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        referralCode,
        legacyReferralCode: user.legacyReferralCode || oldCode || null,
      },
    });

    console.log(
      `Migrated User ${displayUser(user)}: ${oldCode} -> ${referralCode}`
    );
    migrated += 1;
  }

  console.log(`\nDone. Migrated ${migrated} user(s). Old codes resolve via legacyReferralCode.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
