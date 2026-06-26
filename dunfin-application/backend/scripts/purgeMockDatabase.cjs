/**
 * Remove simulated users and mock financial data while preserving the live deposit user.
 *
 * Usage:
 *   node scripts/purgeMockDatabase.cjs           # dry-run (report only)
 *   node scripts/purgeMockDatabase.cjs --execute # apply changes
 */
const { prisma } = require("../lib/prisma.cjs");

const LIVE_USER_ID = "user_610fe3d1d2e64bd45776a2c1";
const EXECUTE = process.argv.includes("--execute");

async function aggregateStats() {
  const [walletAgg, depositAgg] = await Promise.all([
    prisma.user.aggregate({ _sum: { walletBalance: true, lockedCapital: true } }),
    prisma.deposit.aggregate({ _sum: { amount: true }, _count: true }),
  ]);
  return {
    users: await prisma.user.count(),
    walletSum: String(walletAgg._sum.walletBalance ?? 0),
    lockedSum: String(walletAgg._sum.lockedCapital ?? 0),
    depositSum: String(depositAgg._sum.amount ?? 0),
    depositCount: depositAgg._count,
  };
}

async function resetAdminFinancials(adminId) {
  await prisma.deposit.deleteMany({ where: { userId: adminId } });
  await prisma.trade.deleteMany({ where: { userId: adminId } });
  await prisma.balanceLedgerEntry.deleteMany({ where: { userId: adminId } });
  await prisma.transactionRecord.deleteMany({ where: { userId: adminId } });
  await prisma.notification.deleteMany({ where: { userId: adminId } });
  await prisma.teamCommissionPayout.deleteMany({
    where: {
      OR: [{ beneficiaryUserId: adminId }, { sourceUserId: adminId }],
    },
  });

  await prisma.user.update({
    where: { id: adminId },
    data: {
      walletBalance: 0,
      onChainBalance: 0,
      tradingCapital: 0,
      lockedCapital: 0,
      lockedTrialCapital: 0,
      trialBalance: 0,
      isTrialActive: false,
      hasDeposited: false,
      brokerSalaryBalance: 0,
      monthlyTradingProceeds: 0,
      customTokenBalance: 0,
      activeStrategy: null,
      lastTradeTime: null,
      tradeSessionEndsAt: null,
    },
  });
}

async function main() {
  const live = await prisma.user.findUnique({ where: { id: LIVE_USER_ID } });
  if (!live) {
    throw new Error(`Live user ${LIVE_USER_ID} not found — aborting to avoid data loss.`);
  }

  const users = await prisma.user.findMany({
    select: { id: true, role: true, email: true, uid: true, walletBalance: true },
  });

  const deleteUserIds = users
    .filter((u) => u.id !== LIVE_USER_ID && u.role !== "ADMIN")
    .map((u) => u.id);

  const resetAdminIds = users
    .filter((u) => u.id !== LIVE_USER_ID && u.role === "ADMIN")
    .map((u) => u.id);

  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`Preserving live user: ${LIVE_USER_ID} (${live.email}, uid ${live.uid})`);
  console.log(`Users to delete: ${deleteUserIds.length}`);
  console.log(`Admin accounts to reset (zero mock balances): ${resetAdminIds.length}`);

  const before = await aggregateStats();
  console.log("\nBefore:", before);

  if (!EXECUTE) {
    console.log("\nRe-run with --execute to apply.");
    return;
  }

  await prisma.teamCommissionPayout.deleteMany({
    where: {
      beneficiaryUserId: { not: LIVE_USER_ID },
      sourceUserId: { not: LIVE_USER_ID },
    },
  });

  await prisma.withdrawalRecord.deleteMany({
    where: { userId: { not: LIVE_USER_ID } },
  });

  await prisma.platformRevenueLedger.upsert({
    where: { id: "main" },
    create: { id: "main", totalCollected: 0 },
    update: { totalCollected: 0 },
  });

  for (const adminId of resetAdminIds) {
    console.log(`Resetting admin ${adminId}…`);
    await resetAdminFinancials(adminId);
  }

  for (const userId of deleteUserIds) {
    console.log(`Deleting user ${userId}…`);
    await prisma.user.delete({ where: { id: userId } });
  }

  const after = await aggregateStats();
  console.log("\nAfter:", after);

  const liveAfter = await prisma.user.findUnique({
    where: { id: LIVE_USER_ID },
    include: {
      deposits: { orderBy: { createdAt: "asc" } },
      _count: { select: { deposits: true, trades: true, transactionRecords: true } },
    },
  });
  console.log("\nLive user preserved:", {
    id: liveAfter.id,
    walletBalance: String(liveAfter.walletBalance),
    depositCount: liveAfter._count.deposits,
    deposits: liveAfter.deposits.map((d) => ({
      amount: String(d.amount),
      txHash: d.txHash,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
