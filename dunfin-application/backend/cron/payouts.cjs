const { prisma } = require("../lib/prisma.cjs");
const { trunc6 } = require("../lib/formatNumbers.cjs");
const { decimalToNumber } = require("../lib/userMapper.cjs");
const { getTradeSessionState, TWENTY_FOUR_HOURS_MS } = require("../strategies.cjs");
const { computeDailyProfit } = require("../lib/strategyRoi.cjs");
const { distributeReferralCommissions } = require("../teamCommission.cjs");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function startOfCalendarMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function normalizeMonthlyProceeds(user, profitToAdd) {
  const now = Date.now();
  const periodStart = user.proceedsPeriodStart
    ? new Date(user.proceedsPeriodStart).getTime()
    : now;
  const expired = now - periodStart >= THIRTY_DAYS_MS;
  const base = expired ? 0 : decimalToNumber(user.monthlyTradingProceeds);
  return {
    monthlyTradingProceeds: trunc6(base + profitToAdd),
    proceedsPeriodStart: expired ? new Date() : user.proceedsPeriodStart || new Date(),
  };
}

/**
 * Settle one expired 24h trade: profit + return locked capital + referral commissions.
 */
async function settleUserTradePayout(userRow, tx) {
  const db = tx || prisma;
  const locked = decimalToNumber(userRow.lockedCapital);
  if (locked <= 0 || !userRow.lastTradeTime) return { settled: false };

  const session = getTradeSessionState({
    lastTradeTime: userRow.lastTradeTime.toISOString(),
    tradeSessionEndsAt: userRow.tradeSessionEndsAt
      ? userRow.tradeSessionEndsAt.toISOString()
      : null,
    lockedCapital: locked,
  });
  if (session.active) return { settled: false };

  const dailyProfit = computeDailyProfit(locked, userRow.activeStrategy);
  const wallet = decimalToNumber(userRow.walletBalance);
  const newWallet = trunc6(wallet + locked + dailyProfit);
  const monthlyPatch = normalizeMonthlyProceeds(userRow, dailyProfit);

  const lastTrade = await db.trade.findFirst({
    where: { userId: userRow.id },
    orderBy: { executedAt: "desc" },
  });

  await db.user.update({
    where: { id: userRow.id },
    data: {
      walletBalance: newWallet,
      lockedCapital: 0,
      tradingCapital: 0,
      activeStrategy: null,
      tradeSessionEndsAt: null,
      ...monthlyPatch,
    },
  });

  if (dailyProfit > 0) {
    await distributeReferralCommissions(
      userRow.id,
      dailyProfit,
      lastTrade?.id ?? null,
      db
    );
  }

  return {
    settled: true,
    userId: userRow.id,
    dailyProfit,
    newWalletBalance: newWallet,
  };
}

/**
 * Process all users whose 24h lock has expired.
 */
async function processDuePayouts() {
  const candidates = await prisma.user.findMany({
    where: {
      lockedCapital: { gt: 0 },
      lastTradeTime: { not: null },
    },
    select: {
      id: true,
      walletBalance: true,
      lockedCapital: true,
      activeStrategy: true,
      lastTradeTime: true,
      tradeSessionEndsAt: true,
      monthlyTradingProceeds: true,
      proceedsPeriodStart: true,
    },
  });

  const results = [];
  for (const user of candidates) {
    const r = await settleUserTradePayout(user);
    if (r.settled) results.push(r);
  }
  return { processed: results.length, results };
}

module.exports = {
  THIRTY_DAYS_MS,
  TWENTY_FOUR_HOURS_MS,
  settleUserTradePayout,
  processDuePayouts,
  normalizeMonthlyProceeds,
  startOfCalendarMonth,
};
