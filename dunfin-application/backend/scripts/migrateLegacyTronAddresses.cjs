/**
 * Re-derive sweepable TRC20 deposit addresses using TRON_DEPOSIT_MASTER_SECRET.
 * Legacy addresses (from deriveLegacyTronAddress) cannot be swept — this migrates them.
 *
 * Usage:
 *   node scripts/migrateLegacyTronAddresses.cjs           # dry run
 *   node scripts/migrateLegacyTronAddresses.cjs --apply   # persist
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { prisma } = require("../lib/prisma.cjs");
const { deriveTronWallet } = require("../lib/tronWallet.cjs");
const {
  deriveLegacyTronAddress,
  isTronMasterSecretConfigured,
} = require("../deposit.cjs");

function displayUser(row) {
  return row.user?.username || row.user?.uid || row.userId;
}

async function main() {
  const apply = process.argv.includes("--apply");

  if (!isTronMasterSecretConfigured()) {
    console.error(
      "TRON_DEPOSIT_MASTER_SECRET is not set. Add it to backend/.env before running this migration."
    );
    process.exitCode = 1;
    return;
  }

  const rows = await prisma.networkDepositAddress.findMany({
    where: {
      network: "TRC20",
      user: { accountActive: true },
    },
    select: {
      id: true,
      userId: true,
      address: true,
      tron: true,
      user: {
        select: { username: true, uid: true },
      },
    },
    orderBy: { updatedAt: "asc" },
  });

  console.log(`Scanning ${rows.length} active TRC20 NetworkDepositAddress row(s)…\n`);

  let alreadySweepable = 0;
  let needsMigration = 0;
  let migrated = 0;

  for (const row of rows) {
    const network = "TRC20";
    const oldAddress = row.address;
    const legacyAddress = deriveLegacyTronAddress(row.userId, network);
    const { address: newAddress } = deriveTronWallet(row.userId, network);
    const userLabel = displayUser(row);

    if (oldAddress === newAddress) {
      alreadySweepable += 1;
      console.log(`✓ ${userLabel}: already sweepable (${newAddress})`);
      continue;
    }

    needsMigration += 1;
    const wasLegacy = oldAddress === legacyAddress;

    console.log(`→ Migrate ${userLabel} (${row.userId})`);
    console.log(`    OLD (non-sweepable${wasLegacy ? ", legacy derivation" : ""}): ${oldAddress}`);
    console.log(`    NEW (sweepable):                         ${newAddress}`);

    if (oldAddress !== legacyAddress && oldAddress !== newAddress) {
      console.log(
        `    NOTE: stored address differs from both legacy and master-secret derivations — updating to sweepable.`
      );
    }

    if (apply) {
      await prisma.networkDepositAddress.update({
        where: { id: row.id },
        data: {
          address: newAddress,
          tron: true,
        },
      });
      migrated += 1;
      console.log(`    ✓ updated in database`);
    }

    console.log("");
  }

  console.log("--- Summary ---");
  console.log(`  Total scanned:      ${rows.length}`);
  console.log(`  Already sweepable:  ${alreadySweepable}`);
  console.log(`  Needs migration:    ${needsMigration}`);
  if (apply) {
    console.log(`  Migrated:           ${migrated}`);
  } else if (needsMigration > 0) {
    console.log("\nDry run — pass --apply to persist address updates.");
    console.log(
      "WARNING: Users must deposit to the NEW address after migration. Funds sent to old legacy addresses cannot be swept automatically."
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
