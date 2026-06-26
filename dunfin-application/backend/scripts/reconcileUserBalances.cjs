/**
 * One-time admin utility: reconcile every user's walletBalance against ledger truth.
 *
 * Usage (from dunfin-application/backend):
 *   node scripts/reconcileUserBalances.cjs
 *   node scripts/reconcileUserBalances.cjs --dry-run
 */
const { prisma } = require("../lib/prisma.cjs");
const { trunc6 } = require("../lib/formatNumbers.cjs");
const {
  reconcileAndHealUserWalletBalance,
} = require("../lib/walletBalanceReconciliation.cjs");

const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(
    dryRun
      ? "=== WALLET BALANCE RECONCILIATION (dry run) ==="
      : "=== WALLET BALANCE RECONCILIATION (live heal) ==="
  );

  const users = await prisma.user.findMany({
    select: { id: true, uid: true },
    orderBy: { createdAt: "asc" },
  });

  let adjusted = 0;
  let scanned = 0;

  for (const user of users) {
    scanned += 1;
    const result = await reconcileAndHealUserWalletBalance(user.id, {
      heal: !dryRun,
    });

    if (!result.found) continue;

    if (Math.abs(result.delta) >= 0.000001 || result.backfilledDeposit) {
      const uid = result.uid || user.id;
      if (dryRun) {
        if (result.delta > 0) {
          console.log(
            `User [${uid}]: would adjust stored balance from ${result.stored} to ${result.ledger} based on Ledger Audit (Δ +${result.delta})`
          );
        } else if (result.delta < 0) {
          console.log(
            `User [${uid}]: would backfill deposit ledger by ${trunc6(-result.delta)} USDT (stored ${result.stored}, ledger ${result.ledger})`
          );
        }
      } else if (result.backfilledDeposit) {
        console.log(
          `User [${uid}]: Deposit ledger backfilled by ${result.backfilledDeposit} USDT; wallet remains ${result.stored}.`
        );
      } else {
        console.log(
          `User [${uid}]: Stored Balance adjusted from ${result.stored} to ${result.ledger} based on Ledger Audit.`
        );
      }
      adjusted += 1;
    }
  }

  console.log(
    `\nScanned ${scanned} user(s); ${adjusted} balance(s) ${dryRun ? "would be" : "were"} corrected.`
  );
}

main()
  .catch((err) => {
    console.error("Reconciliation failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
