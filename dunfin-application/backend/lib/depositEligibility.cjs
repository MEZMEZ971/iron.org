const { prisma } = require("./prisma.cjs");
const { trunc6 } = require("./formatNumbers.cjs");
const { decimalToNumber } = require("./userMapper.cjs");

const DEPOSIT_REQUIRED_SPIN_EN =
  "Deposit USDT to unlock your daily lucky spin!";
const DEPOSIT_REQUIRED_SPIN_AR =
  "قم بالإيداع لتفعيل عجلة الحظ اليومية!";

async function getTotalDeposited(userId, client = prisma) {
  const agg = await client.deposit.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return trunc6(decimalToNumber(agg._sum.amount));
}

/**
 * True when the user has real credited funds (deposit ledger and/or on-chain sync),
 * excluding trial-only balances.
 */
async function hasRealDeposit(userId, client = prisma) {
  const [depositTotal, user] = await Promise.all([
    getTotalDeposited(userId, client),
    client.user.findUnique({
      where: { id: userId },
      select: { hasDeposited: true, onChainBalance: true },
    }),
  ]);
  if (!user) return false;
  if (depositTotal > 0) return true;
  if (user.hasDeposited && trunc6(decimalToNumber(user.onChainBalance)) > 0) {
    return true;
  }
  return false;
}

function isFundedMember(user, depositTotalByUserId) {
  if (!user?.id) return false;
  const depositTotal =
    depositTotalByUserId instanceof Map
      ? depositTotalByUserId.get(user.id) ?? 0
      : Number(depositTotalByUserId?.[user.id]) || 0;
  if (depositTotal > 0) return true;
  if (user.hasDeposited && trunc6(Number(user.onChainBalance)) > 0) return true;
  return false;
}

async function loadDepositTotalsByUserIds(userIds, client = prisma) {
  const map = new Map();
  if (!userIds.length) return map;
  const rows = await client.deposit.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _sum: { amount: true },
  });
  for (const row of rows) {
    map.set(row.userId, trunc6(decimalToNumber(row._sum.amount)));
  }
  return map;
}

module.exports = {
  DEPOSIT_REQUIRED_SPIN_EN,
  DEPOSIT_REQUIRED_SPIN_AR,
  getTotalDeposited,
  hasRealDeposit,
  isFundedMember,
  loadDepositTotalsByUserIds,
};
