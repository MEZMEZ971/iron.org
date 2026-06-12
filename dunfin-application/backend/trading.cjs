const db = require("./db.cjs");
const { prisma } = require("./lib/prisma.cjs");
const { trunc6 } = require("./lib/formatNumbers.cjs");
const { getAffiliateNetwork } = require("./affiliate.cjs");
const {
  autoResolveStrategy,
  getStrategyEligibility,
  getCooldownState,
  getTradeSessionState,
  pickTradeSessionDurationMs,
  ENTRY_STRATEGY,
} = require("./strategies.cjs");
const { processDuePayouts, settleUserTradePayout } = require("./cron/payouts.cjs");
const { touchUserActivity } = require("./lib/userActivity.cjs");
const { applyStrategyActivationBonus } = require("./lib/taxHoliday.cjs");

async function releaseExpiredLock(userId) {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      walletBalance: true,
      lockedCapital: true,
      activeStrategy: true,
      lastTradeTime: true,
      tradeSessionEndsAt: true,
      monthlyTradingProceeds: true,
      proceedsPeriodStart: true,
      isInvited: true,
      taxFreeUntil: true,
      hasActivatedBonusStrategy: true,
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
    await settleUserTradePayout(row);
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

  let user = await db.getOrCreateUser(userId);
  await releaseExpiredLock(userId);
  user = await db.getOrCreateUser(userId);

  const cooldown = getCooldownState(user.last_trade_time);
  if (cooldown.onCooldown) {
    return {
      ok: false,
      status: 429,
      error: "Trading is locked for 24 hours after your last execution.",
      cooldown,
    };
  }

  const walletBalance = Number(user.walletBalance) || 0;
  const allUsers = await db.getAllUsers();
  const network = getAffiliateNetwork(allUsers, userId);
  const activeTeamCount = network.totalActiveMembers;

  const resolved = autoResolveStrategy(walletBalance, activeTeamCount);

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
        walletBalance: trunc6(walletBalance),
      },
    };
  }

  const capital = resolved.capitalAmount;
  if (capital > walletBalance) {
    return {
      ok: false,
      status: 400,
      error: "Insufficient wallet balance for the requested trading capital.",
      code: "INSUFFICIENT_BALANCE",
    };
  }

  const now = new Date().toISOString();
  const sessionEndsAt = new Date(
    Date.now() + pickTradeSessionDurationMs()
  ).toISOString();
  const newWalletBalance = walletBalance - capital;

  await db.updateUser(userId, {
    last_trade_time: now,
    tradeSessionEndsAt: sessionEndsAt,
    walletBalance: newWalletBalance,
    tradingCapital: capital,
    lockedCapital: capital,
    activeStrategy: resolved.strategy.id,
    hasDeposited: true,
    lastTrade: {
      executedAt: now,
      capitalAmount: capital,
      strategyId: resolved.strategy.id,
      teamActiveAtExecution: activeTeamCount,
      walletBalanceAfter: newWalletBalance,
    },
  });
  const bonusTaxFreeUntil = await applyStrategyActivationBonus(userId);
  touchUserActivity(userId);

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
      bonusTaxFreeUntil: bonusTaxFreeUntil
        ? bonusTaxFreeUntil.toISOString()
        : null,
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

  const allUsers = await db.getAllUsers();
  const network = getAffiliateNetwork(allUsers, userId);
  const walletBalance = Number(user.walletBalance) || 0;
  const lockedCapital = Number(user.lockedCapital) || 0;
  const activeTeamCount = network.totalActiveMembers;

  const cooldown = getCooldownState(user.last_trade_time);
  const tradeSession = getTradeSessionState({
    lastTradeTime: user.last_trade_time,
    tradeSessionEndsAt: user.tradeSessionEndsAt,
    lockedCapital,
  });
  const strategies = getStrategyEligibility(walletBalance, activeTeamCount);
  const resolved = autoResolveStrategy(walletBalance, activeTeamCount);

  return {
    userId,
    walletBalance: trunc6(walletBalance),
    availableBalance: trunc6(walletBalance),
    lockedCapital: trunc6(lockedCapital),
    tradingCapital: trunc6(user.tradingCapital),
    activeStrategy: user.activeStrategy ?? null,
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
