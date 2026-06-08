/**
 * One-time import from database.json into PostgreSQL.
 * Usage: node scripts/seed-from-json.cjs
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const { prisma } = require("../lib/prisma.cjs");
const { generateReferralCode } = require("../lib/userMapper.cjs");
const {
  allocateUniqueUid,
  isValidPublicUid,
} = require("../lib/uidGenerator.cjs");

const DB_FILE = path.join(__dirname, "../database.json");

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.log("No database.json to import.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  const users = data.users || {};

  for (const [id, u] of Object.entries(users)) {
    await prisma.user.upsert({
      where: { id },
      create: {
        id,
        uid:
          u.uid && isValidPublicUid(u.uid)
            ? String(u.uid).trim()
            : await allocateUniqueUid(),
        displayName: u.displayName || null,
        referralCode: generateReferralCode(id),
        referredById: u.referredBy || null,
        hasDeposited: Boolean(u.hasDeposited),
        walletBalance: u.walletBalance || 0,
        onChainBalance: u.onChainBalance || 0,
        tradingCapital: u.tradingCapital || 0,
        lockedCapital: u.lockedCapital || 0,
        activeStrategy: u.activeStrategy ?? null,
        lastTradeTime: u.last_trade_time ? new Date(u.last_trade_time) : null,
        depositAddress: u.depositAddress || null,
      },
      update: {},
    });

    for (const dep of u.deposits || []) {
      await prisma.deposit.create({
        data: {
          userId: id,
          amount: dep.amount || 0,
          txHash: dep.txHash || null,
          createdAt: dep.at ? new Date(dep.at) : new Date(),
        },
      });
    }

    for (const t of u.tradeHistory || []) {
      await prisma.trade.create({
        data: {
          userId: id,
          capitalAmount: t.capitalAmount,
          strategyId: t.strategyId,
          teamActiveAtExecution: t.teamActiveAtExecution || 0,
          walletBalanceAfter: t.walletBalanceAfter ?? null,
          executedAt: t.executedAt ? new Date(t.executedAt) : new Date(),
        },
      });
    }

    const nets = u.depositAddresses || {};
    for (const [network, val] of Object.entries(nets)) {
      const address = typeof val === "string" ? val : val.address;
      if (!address) continue;
      await prisma.networkDepositAddress.upsert({
        where: { userId_network: { userId: id, network } },
        create: {
          userId: id,
          network,
          address,
          txHash: val.txHash || null,
          tron: Boolean(val.tron),
        },
        update: { address },
      });
    }
  }

  console.log(`Imported ${Object.keys(users).length} user(s) from database.json`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
