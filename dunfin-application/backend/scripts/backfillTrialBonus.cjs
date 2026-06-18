/**
 * Backfill missing trial credits for users who registered before trial columns
 * existed, and/or missing TRIAL_WELCOME_BONUS ledger rows.
 *
 * Usage:
 *   node scripts/backfillTrialBonus.cjs          # dry run
 *   node scripts/backfillTrialBonus.cjs --apply  # write changes
 */
const { prisma } = require("../lib/prisma.cjs");
const {
  registrationTrialFields,
  recordTrialWelcomeBonus,
} = require("../lib/trialBalance.cjs");

const apply = process.argv.includes("--apply");

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      createdAt: true,
      trialBalance: true,
      isTrialActive: true,
      trialExpiresAt: true,
      walletBalance: true,
      hasDeposited: true,
    },
    orderBy: { createdAt: "desc" },
  });

  let grantTrial = 0;
  let grantLedger = 0;

  for (const user of users) {
    const wallet = Number(user.walletBalance) || 0;
    const hasActiveTrial = user.isTrialActive && Number(user.trialBalance) > 0;
    const eligibleForTrial =
      !user.hasDeposited && wallet <= 0 && !hasActiveTrial;

    const ledger = await prisma.transactionRecord.findFirst({
      where: { userId: user.id, type: "TRIAL_WELCOME_BONUS" },
      select: { id: true },
    });

    if (eligibleForTrial) {
      grantTrial += 1;
      console.log(
        `[trial] ${apply ? "GRANT" : "would grant"} trial to ${user.username || user.id}`
      );
      if (apply) {
        const fields = registrationTrialFields(user.createdAt);
        await prisma.user.update({
          where: { id: user.id },
          data: fields,
        });
        await recordTrialWelcomeBonus(user.id);
      }
      continue;
    }

    if (hasActiveTrial && !ledger) {
      grantLedger += 1;
      console.log(
        `[ledger] ${apply ? "ADD" : "would add"} welcome row for ${user.username || user.id}`
      );
      if (apply) {
        await recordTrialWelcomeBonus(user.id);
      }
    }
  }

  console.log(
    JSON.stringify(
      { apply, grantTrial, grantLedger, scanned: users.length },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
