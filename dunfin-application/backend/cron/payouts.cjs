const { prisma } = require("../lib/prisma.cjs");
const { trunc6 } = require("../lib/formatNumbers.cjs");
const { decimalToNumber } = require("../lib/userMapper.cjs");
const { getTradeSessionState, TWENTY_FOUR_HOURS_MS } = require("../strategies.cjs");
const { computeDailyProfit } = require("../lib/strategyRoi.cjs");
const { distributeReferralCommissions } = require("../teamCommission.cjs");
const { splitDailyProfit } = require("../lib/taxHoliday.cjs");

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

  const grossDailyProfit = computeDailyProfit(locked, userRow.activeStrategy);
  const split = splitDailyProfit(userRow, grossDailyProfit);
  const wallet = decimalToNumber(userRow.walletBalance);
  const trialBalance = decimalToNumber(userRow.trialBalance);
  const lockedTrial = trunc6(decimalToNumber(userRow.lockedTrialCapital));
  const lockedWallet = trunc6(Math.max(0, locked - lockedTrial));
  const newWallet = trunc6(wallet + lockedWallet + split.userShare);
  const newTrial = trunc6(trialBalance + lockedTrial);
  const monthlyPatch = normalizeMonthlyProceeds(userRow, split.userShare);

  const lastTrade = await db.trade.findFirst({
    where: { userId: userRow.id },
    orderBy: { executedAt: "desc" },
  });

  await db.user.update({
    where: { id: userRow.id },
    data: {
      walletBalance: newWallet,
      trialBalance: newTrial,
      lockedCapital: 0,
      lockedTrialCapital: 0,
      tradingCapital: 0,
      activeStrategy: null,
      tradeSessionEndsAt: null,
      ...monthlyPatch,
    },
  });

  if (split.userShare > 0) {
    await distributeReferralCommissions(
      userRow.id,
      split.userShare,
      lastTrade?.id ?? null,
      db
    );
  }

  return {
    settled: true,
    userId: userRow.id,
    dailyProfit: split.grossProfit,
    userProfit: split.userShare,
    platformProfit: 0,
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
      trialBalance: true,
      lockedTrialCapital: true,
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
