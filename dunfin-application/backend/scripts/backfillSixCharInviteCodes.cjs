/**
 * Assign 6-character invite codes to users still on legacy IRON-XXXXXX codes.
 * Usage: node scripts/backfillSixCharInviteCodes.cjs [--apply]
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { prisma } = require("../lib/prisma.cjs");
const {
  allocateUniqueReferralCode,
  isValidInviteCode,
} = require("../lib/referralCodeGenerator.cjs");

async function main() {
  const apply = process.argv.includes("--apply");
  const users = await prisma.user.findMany({
    select: { id: true, username: true, uid: true, referralCode: true },
    orderBy: { createdAt: "asc" },
  });

  const toUpdate = users.filter((user) => !isValidInviteCode(user.referralCode));
  console.log(
    `Found ${toUpdate.length} user(s) needing 6-character invite codes (${users.length} total).`
  );

  if (!apply) {
    console.log("Dry run — pass --apply to persist changes.");
    for (const user of toUpdate.slice(0, 10)) {
      console.log(`  ${user.uid} ${user.username || user.id}: ${user.referralCode}`);
    }
    if (toUpdate.length > 10) {
      console.log(`  … and ${toUpdate.length - 10} more`);
    }
    return;
  }

  for (const user of toUpdate) {
    const referralCode = await allocateUniqueReferralCode();
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode },
    });
    console.log(
      `[backfill] ${user.uid}: ${user.referralCode} -> ${referralCode}`
    );
  }

  console.log(`Updated ${toUpdate.length} user(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
