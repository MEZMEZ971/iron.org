const { prisma } = require("../lib/prisma.cjs");
const { trunc6 } = require("../lib/formatNumbers.cjs");
const { decimalToNumber } = require("../lib/userMapper.cjs");
const { getTradeSessionState, TWENTY_FOUR_HOURS_MS } = require("../strategies.cjs");
const { computeDailyProfit } = require("../lib/strategyRoi.cjs");
const { distributeReferralCommissions } = require("../teamCommission.cjs");
const { splitDailyProfit } = require("../lib/taxHoliday.cjs");
const { TX_OPTIONS } = require("../services/tradeService.cjs");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const PAYOUT_USER_SELECT = {
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
  taxFreeUntil: true,
  hasActivatedBonusStrategy: true,
  isInvited: true,
};

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
 * Settle one expired trade inside a serializable transaction.
 * Idempotent: only one caller can clear a non-zero lockedCapital snapshot.
 * @param {string} userId
 */
async function settleUserTradePayout(userId) {
  if (!userId) return { settled: false };

  return prisma.$transaction(async (tx) => {
    const userRow = await tx.user.findUnique({
      where: { id: userId },
      select: PAYOUT_USER_SELECT,
    });

    if (!userRow) return { settled: false };

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

    const lastTrade = await tx.trade.findFirst({
      where: { userId },
      orderBy: { executedAt: "desc" },
    });

    if (lastTrade?.id) {
      const commissionAlreadyPaid = await tx.teamCommissionPayout.findFirst({
        where: { sourceUserId: userId, tradeId: lastTrade.id },
        select: { id: true },
      });
      if (commissionAlreadyPaid) {
        return { settled: false, reason: "already_settled" };
      }
    }

    const grossDailyProfit = computeDailyProfit(locked, userRow.activeStrategy);
    const split = splitDailyProfit(userRow, grossDailyProfit);
    const lockedTrial = trunc6(decimalToNumber(userRow.lockedTrialCapital));
    const lockedWallet = trunc6(Math.max(0, locked - lockedTrial));
    const monthlyPatch = normalizeMonthlyProceeds(userRow, split.userShare);

    const cleared = await tx.user.updateMany({
      where: {
        id: userId,
        lockedCapital: userRow.lockedCapital,
      },
      data: {
        walletBalance: { increment: trunc6(lockedWallet + split.userShare) },
        trialBalance: { increment: lockedTrial },
        lockedCapital: 0,
        lockedTrialCapital: 0,
        tradingCapital: 0,
        activeStrategy: null,
        tradeSessionEndsAt: null,
        ...monthlyPatch,
      },
    });

    if (cleared.count === 0) {
      return { settled: false, reason: "lock_conflict" };
    }

    if (split.userShare > 0) {
      await distributeReferralCommissions(
        userId,
        split.userShare,
        lastTrade?.id ?? null,
        tx
      );
    }

    const refreshed = await tx.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    return {
      settled: true,
      userId,
      dailyProfit: split.grossProfit,
      userProfit: split.userShare,
      platformProfit: 0,
      newWalletBalance: trunc6(decimalToNumber(refreshed?.walletBalance)),
    };
  }, TX_OPTIONS);
}

/**
 * Process all users whose trade lock has expired.
 */
async function processDuePayouts() {
  const candidates = await prisma.user.findMany({
    where: {
      lockedCapital: { gt: 0 },
      lastTradeTime: { not: null },
    },
    select: { id: true },
  });

  const results = [];
  for (const user of candidates) {
    const r = await settleUserTradePayout(user.id);
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
