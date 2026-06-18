const { prisma } = require("./lib/prisma.cjs");
const { trunc6 } = require("./lib/formatNumbers.cjs");
const { decimalToNumber } = require("./lib/userMapper.cjs");
const { getCooldownState } = require("./strategies.cjs");
const { computeDailyProfit } = require("./lib/strategyRoi.cjs");
const { splitDailyProfit } = require("./lib/taxHoliday.cjs");
const {
  processDuePayouts,
  startOfCalendarMonth,
  THIRTY_DAYS_MS,
} = require("./cron/payouts.cjs");

async function getTradeEarnings(userId) {
  await processDuePayouts().catch((err) => {
    console.warn("[payouts] auto-run failed:", err.message);
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      walletBalance: true,
      trialBalance: true,
      isTrialActive: true,
      lockedCapital: true,
      activeStrategy: true,
      lastTradeTime: true,
      monthlyTradingProceeds: true,
      proceedsPeriodStart: true,
      isInvited: true,
      taxFreeUntil: true,
      hasActivatedBonusStrategy: true,
    },
  });

  if (!user) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const walletBalance = trunc6(decimalToNumber(user.walletBalance));
  const trialBalance = user.isTrialActive
    ? trunc6(decimalToNumber(user.trialBalance))
    : 0;
  const lockedCapital = trunc6(decimalToNumber(user.lockedCapital));
  const accountBalance = trunc6(walletBalance + trialBalance + lockedCapital);

  const cooldown = getCooldownState(
    user.lastTradeTime ? user.lastTradeTime.toISOString() : null
  );

  const grossPending = cooldown.onCooldown
    ? computeDailyProfit(lockedCapital, user.activeStrategy)
    : 0;
  const pendingSplit = splitDailyProfit(user, grossPending);
  const pendingDistribution = pendingSplit.userShare;

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const tradeStartedToday =
    user.lastTradeTime && new Date(user.lastTradeTime) >= dayStart;

  const todayPendingEarnings =
    cooldown.onCooldown && tradeStartedToday ? pendingDistribution : 0;

  const now = Date.now();
  const periodStart = user.proceedsPeriodStart
    ? new Date(user.proceedsPeriodStart).getTime()
    : now;
  const periodExpired = now - periodStart >= THIRTY_DAYS_MS;
  const totalTransactionProceeds = periodExpired
    ? 0
    : trunc6(decimalToNumber(user.monthlyTradingProceeds));

  const periodEndsAt = new Date(periodStart + THIRTY_DAYS_MS).toISOString();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const monthStart = startOfCalendarMonth();

  const [dailyReferralAgg, monthlyReferralAgg] = await Promise.all([
    prisma.teamCommissionPayout.aggregate({
      where: {
        beneficiaryUserId: userId,
        executedAt: { gte: since24h },
      },
      _sum: { amount: true },
    }),
    prisma.teamCommissionPayout.aggregate({
      where: {
        beneficiaryUserId: userId,
        executedAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    ok: true,
    accountBalance,
    walletBalance,
    trialBalance,
    lockedCapital,
    currency: "USDT",
    totalTransactionProceeds,
    proceedsPeriodEndsAt: periodEndsAt,
    totalIncomeToBeDistributed: trunc6(pendingDistribution),
    grossIncomeToBeDistributed: trunc6(grossPending),
    todayPendingEarnings: trunc6(todayPendingEarnings),
    taxHolidayActive: pendingSplit.taxFree,
    userProfitSharePercent: pendingSplit.taxFree ? 100 : 60,
    teamCommissions: {
      dailyReferralEarnings: trunc6(decimalToNumber(dailyReferralAgg._sum.amount)),
      monthlyReferralEarnings: trunc6(
        decimalToNumber(monthlyReferralAgg._sum.amount)
      ),
    },
    cooldown: {
      onCooldown: cooldown.onCooldown,
      nextTradeAt: cooldown.nextTradeAt,
      remainingMs: cooldown.remainingMs,
    },
    activeStrategy: user.activeStrategy,
  };
}

module.exports = { getTradeEarnings };
