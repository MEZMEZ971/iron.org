const db = require("./db.cjs");
const { prisma } = require("./lib/prisma.cjs");
const { trunc6 } = require("./lib/formatNumbers.cjs");
const {
  enrichStrategyWithYields,
  computeEstimatedProceeds,
  formatYieldDisplay,
} = require("./lib/tradingLevels.cjs");
const { getAffiliateNetworkFromDb, propagateAffiliateCacheRefresh } = require("./lib/affiliateStats.cjs");
const {
  autoResolveStrategy,
  getStrategyEligibility,
  getCooldownState,
  getTradeSessionState,
  ENTRY_STRATEGY,
} = require("./strategies.cjs");
const { processDuePayouts, settleUserTradePayout } = require("./cron/payouts.cjs");
const { executeTradeAtomic } = require("./services/tradeService.cjs");
const { touchUserActivity } = require("./lib/userActivity.cjs");
const {
  getEffectiveTradingBalance,
  isTrialCurrentlyActive,
} = require("./lib/trialBalance.cjs");

async function releaseExpiredLock(userId) {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      lockedCapital: true,
      lastTradeTime: true,
      tradeSessionEndsAt: true,
    },
  });
  if (!row) return null;

  const locked = Number(row.lockedCapital) || 0;
  const session = getTradeSessionState({
    lastTradeTime: row.lastTradeTime ? row.lastTradeTime.toISOString() : null,
    tradeSessionEndsAt: row.tradeSessionEndsAt
      ? row.tradeSessionEndsAt.toISOString()
      : null,
    lockedCapital: locked,
  });
  if (locked > 0 && !session.active) {
    await settleUserTradePayout(userId);
    return { settled: true };
  }
  return null;
}

async function executeTrade(userId) {
  if (!userId) {
    return { ok: false, status: 400, error: "userId required" };
  }

  const accountRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountActive: true },
  });
  if (accountRow && accountRow.accountActive === false) {
    return {
      ok: false,
      status: 403,
      error:
        "Your account has been deactivated by administration. Please contact support center.",
      code: "ACCOUNT_DEACTIVATED",
    };
  }

  await db.getOrCreateUser(userId);
  await releaseExpiredLock(userId);

  const user = await db.getOrCreateUser(userId);

  const cooldown = getCooldownState(user.last_trade_time);
  if (cooldown.onCooldown) {
    return {
      ok: false,
      status: 429,
      error: "Trading is locked for 24 hours after your last execution.",
      cooldown,
    };
  }

  const tradingBalance = getEffectiveTradingBalance(user);
  const network = await getAffiliateNetworkFromDb(userId);
  const activeTeamCount = network.totalActiveMembers;

  const resolved = autoResolveStrategy(tradingBalance, activeTeamCount);

  if (!resolved.ok) {
    return {
      ok: false,
      status: 400,
      code: resolved.code || "QUALIFICATION_DENIED",
      error: resolved.errorEn,
      errorAr: resolved.errorAr,
      requiredCapital: resolved.requiredCapital ?? ENTRY_STRATEGY.minCapital,
      requiredTeam: resolved.requiredTeam ?? ENTRY_STRATEGY.minTeam,
      network: {
        totalActiveMembers: activeTeamCount,
        walletBalance: trunc6(tradingBalance),
      },
    };
  }

  const capital = resolved.capitalAmount;
  if (capital > tradingBalance) {
    return {
      ok: false,
      status: 400,
      error: "Insufficient wallet balance for the requested trading capital.",
      code: "INSUFFICIENT_BALANCE",
    };
  }

  const txResult = await executeTradeAtomic(userId, activeTeamCount, resolved);

  if (!txResult.ok) {
    return txResult;
  }

  const now = txResult.tradeNow.toISOString();
  const sessionEndsAt = txResult.sessionEnds.toISOString();
  const newWalletBalance = txResult.walletBalanceAfter;

  touchUserActivity(userId);

  propagateAffiliateCacheRefresh(userId).catch((err) => {
    console.warn("[affiliate-stats] propagate after trade:", err.message);
  });

  return {
    ok: true,
    trade: {
      userId,
      capitalAmount: capital,
      strategy: resolved.strategy,
      executedAt: now,
      walletBalance: newWalletBalance,
      lockedCapital: capital,
      lockedUntil: sessionEndsAt,
      sessionEndsAt,
      network: {
        totalActiveMembers: activeTeamCount,
        generations: {
          gen1: network.generations.gen1.activeCount,
          gen2: network.generations.gen2.activeCount,
          gen3: network.generations.gen3.activeCount,
        },
      },
    },
    cooldown: getCooldownState(now),
    user: await getTradeStatus(userId),
  };
}

async function getTradeStatus(userId) {
  await releaseExpiredLock(userId);
  const user = await db.getOrCreateUser(userId);

  const network = await getAffiliateNetworkFromDb(userId);
  const walletBalance = Number(user.walletBalance) || 0;
  const trialBalance = isTrialCurrentlyActive(user)
    ? Number(user.trialBalance) || 0
    : 0;
  const tradingBalance = getEffectiveTradingBalance(user);
  const lockedCapital = Number(user.lockedCapital) || 0;
  const activeTeamCount = network.totalActiveMembers;

  const cooldown = getCooldownState(user.last_trade_time);
  const tradeSession = getTradeSessionState({
    lastTradeTime: user.last_trade_time,
    tradeSessionEndsAt: user.tradeSessionEndsAt,
    lockedCapital,
  });
  const strategies = getStrategyEligibility(tradingBalance, activeTeamCount).map(
    enrichStrategyWithYields
  );
  const resolved = autoResolveStrategy(tradingBalance, activeTeamCount);
  const activeStrategy = user.activeStrategy ?? null;
  const estimatedProceeds =
    lockedCapital > 0 && activeStrategy != null
      ? computeEstimatedProceeds(lockedCapital, activeStrategy)
      : null;
  const dailyYieldLabel =
    activeStrategy != null ? formatYieldDisplay(activeStrategy) : null;

  return {
    userId,
    walletBalance: trunc6(walletBalance),
    trialBalance: trunc6(trialBalance),
    availableBalance: trunc6(tradingBalance),
    lockedCapital: trunc6(lockedCapital),
    tradingCapital: trunc6(user.tradingCapital),
    activeStrategy,
    estimatedProceeds,
    dailyYieldLabel,
    last_trade_time: user.last_trade_time ?? null,
    cooldown,
    affiliate: {
      totalActiveMembers: activeTeamCount,
      totalMembers: network.totalMembers,
      gen1Active: network.generations.gen1.activeCount,
      gen2Active: network.generations.gen2.activeCount,
      gen3Active: network.generations.gen3.activeCount,
    },
    strategies,
    tradeSession,
    botActive: tradeSession.active,
    eligibility: {
      eligible: resolved.ok,
      error: resolved.ok ? null : resolved.errorEn,
      errorAr: resolved.ok ? null : resolved.errorAr,
      code: resolved.ok ? null : resolved.code || "QUALIFICATION_DENIED",
      requiredCapital: resolved.ok
        ? null
        : (resolved.requiredCapital ?? ENTRY_STRATEGY.minCapital),
      requiredTeam: resolved.ok
        ? null
        : (resolved.requiredTeam ?? ENTRY_STRATEGY.minTeam),
      matchedStrategy: resolved.ok ? resolved.strategy : null,
      autoLockAmount: resolved.ok ? trunc6(resolved.capitalAmount) : null,
    },
  };
}

module.exports = {
  executeTrade,
  getTradeStatus,
};
