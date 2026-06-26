const { Prisma } = require("@prisma/client");
const { prisma } = require("../lib/prisma.cjs");
const { trunc6 } = require("../lib/formatNumbers.cjs");
const { decimalToNumber } = require("../lib/userMapper.cjs");
const { getAffiliateNetworkFromDb } = require("../lib/affiliateStats.cjs");
const {
  autoResolveStrategy,
  getCooldownState,
  pickTradeSessionDurationMs,
  ENTRY_STRATEGY,
} = require("../strategies.cjs");
const {
  getEffectiveTradingBalance,
  isTrialCurrentlyActive,
} = require("../lib/trialBalance.cjs");

const TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 10_000,
  timeout: 30_000,
};

const TRADE_LOCK_SELECT = {
  id: true,
  accountActive: true,
  walletBalance: true,
  trialBalance: true,
  isTrialActive: true,
  trialExpiresAt: true,
  lockedCapital: true,
  lockedTrialCapital: true,
  lastTradeTime: true,
  tradeSessionEndsAt: true,
};

function computeCapitalSplit(user, capitalAmount, now = new Date()) {
  const capital = trunc6(capitalAmount);
  const trial = isTrialCurrentlyActive(user, now) ? trunc6(decimalToNumber(user.trialBalance)) : 0;
  const fromTrial = trunc6(Math.min(trial, capital));
  const fromWallet = trunc6(capital - fromTrial);
  return { capital, fromTrial, fromWallet };
}

/**
 * Atomically lock trading capital: eligibility + balance checks + trade row inside one TX.
 * @param {string} userId
 * @param {number} activeTeamCount — pre-fetched affiliate active count
 * @param {ReturnType<typeof autoResolveStrategy>} resolved — pre-validated strategy resolution
 */
async function executeTradeAtomic(userId, activeTeamCount, resolved) {
  const capital = resolved.capitalAmount;
  const tradeNow = new Date();
  const sessionEnds = new Date(tradeNow.getTime() + pickTradeSessionDurationMs());

  const txResult = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: TRADE_LOCK_SELECT,
    });

    if (!user) {
      return { ok: false, status: 404, code: "USER_NOT_FOUND", error: "User not found" };
    }
    if (user.accountActive === false) {
      return {
        ok: false,
        status: 403,
        code: "ACCOUNT_DEACTIVATED",
        error:
          "Your account has been deactivated by administration. Please contact support center.",
      };
    }

    const lockedCapital = decimalToNumber(user.lockedCapital);
    if (lockedCapital > 0) {
      return {
        ok: false,
        status: 409,
        code: "TRADE_ALREADY_ACTIVE",
        error: "A trade session is already in progress.",
      };
    }

    const cooldown = getCooldownState(
      user.lastTradeTime ? user.lastTradeTime.toISOString() : null
    );
    if (cooldown.onCooldown) {
      return {
        ok: false,
        status: 429,
        code: "COOLDOWN_ACTIVE",
        error: "Trading is locked for 24 hours after your last execution.",
        cooldown,
      };
    }

    const tradingBalance = getEffectiveTradingBalance(user);
    if (capital > tradingBalance) {
      return {
        ok: false,
        status: 400,
        code: "INSUFFICIENT_BALANCE",
        error: "Insufficient wallet balance for the requested trading capital.",
      };
    }

    const inTxResolved = autoResolveStrategy(tradingBalance, activeTeamCount);
    if (!inTxResolved.ok || inTxResolved.capitalAmount !== capital) {
      return {
        ok: false,
        status: 400,
        code: inTxResolved.code || "QUALIFICATION_DENIED",
        error: inTxResolved.errorEn,
        errorAr: inTxResolved.errorAr,
        requiredCapital: inTxResolved.requiredCapital ?? ENTRY_STRATEGY.minCapital,
        requiredTeam: inTxResolved.requiredTeam ?? ENTRY_STRATEGY.minTeam,
      };
    }

    const { fromWallet, fromTrial } = computeCapitalSplit(user, capital);

    const lockWhere = {
      id: userId,
      lockedCapital: 0,
      walletBalance: { gte: fromWallet },
    };
    if (fromTrial > 0) {
      lockWhere.trialBalance = { gte: fromTrial };
    }

    const locked = await tx.user.updateMany({
      where: lockWhere,
      data: {
        walletBalance: { decrement: fromWallet },
        trialBalance: { decrement: fromTrial },
        lockedCapital: { increment: capital },
        lockedTrialCapital: { increment: fromTrial },
        tradingCapital: capital,
        activeStrategy: resolved.strategy.id,
        lastTradeTime: tradeNow,
        tradeSessionEndsAt: sessionEnds,
        hasDeposited: true,
      },
    });

    if (locked.count === 0) {
      return {
        ok: false,
        status: 409,
        code: "TRADE_LOCK_CONFLICT",
        error: "Trade could not be locked. Refresh and try again.",
      };
    }

    const refreshed = await tx.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    const walletBalanceAfter = trunc6(decimalToNumber(refreshed?.walletBalance));

    const tradeRow = await tx.trade.create({
      data: {
        userId,
        capitalAmount: capital,
        strategyId: resolved.strategy.id,
        teamActiveAtExecution: activeTeamCount,
        walletBalanceAfter,
        executedAt: tradeNow,
      },
    });

    return {
      ok: true,
      tradeNow,
      sessionEnds,
      walletBalanceAfter,
      tradeRowId: tradeRow.id,
    };
  }, TX_OPTIONS);

  return txResult;
}

module.exports = {
  TX_OPTIONS,
  computeCapitalSplit,
  executeTradeAtomic,
};
