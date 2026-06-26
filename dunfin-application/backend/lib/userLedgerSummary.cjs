const { prisma } = require("./prisma.cjs");
const { trunc6 } = require("./formatNumbers.cjs");
const { decimalToNumber } = require("./userMapper.cjs");
const { computeDailyProfit } = require("./strategyRoi.cjs");
const { getTradeSessionState } = require("../strategies.cjs");
const {
  WALLET_CREDIT_TXN_TYPES,
} = require("./walletBalanceReconciliation.cjs");

const REWARD_TXN_TYPES = [
  "ADMIN_REWARD",
  "LUCKY_WHEEL_REWARD",
  "BROKER_RANK_UPGRADE_BONUS",
  "BROKER_SALARY",
];

const PROMO_TXN_TYPES = [...REWARD_TXN_TYPES, "TRIAL_WELCOME_BONUS"];

const COMPLETED_WITHDRAWAL_STATUS = "COMPLETED";

function mapWithdrawalFeedStatus(status) {
  if (status === COMPLETED_WITHDRAWAL_STATUS) return "COMPLETED";
  if (status === "REJECTED") return "REJECTED";
  return "PENDING";
}

function rewardTypeLabel(type) {
  switch (type) {
    case "LUCKY_WHEEL_REWARD":
      return "Lucky Spin Reward";
    case "BROKER_SALARY":
      return "Broker Salary";
    case "BROKER_RANK_UPGRADE_BONUS":
      return "Broker Rank Bonus";
    case "TRIAL_WELCOME_BONUS":
      return "Welcome Trial";
    case "ADMIN_REWARD":
      return "Admin Reward";
    default:
      return "Reward";
  }
}

function commissionLabel(generation) {
  return `Team Commission L${generation}`;
}

/**
 * Liquid USDT available for trading; locked capital is tracked separately.
 */
function deriveBalanceSnapshot(user) {
  const walletStored = trunc6(decimalToNumber(user?.walletBalance));
  const locked = trunc6(decimalToNumber(user?.lockedCapital));
  const available = trunc6(Math.max(0, walletStored));
  const freeze = locked;
  const total = trunc6(available + freeze);
  return { available, freeze, total, walletStored, locked };
}

async function aggregateLedgerTotals(userId, lockedCapital) {
  const [
    depositAgg,
    withdrawalCompletedAgg,
    withdrawalPendingAgg,
    commissionAgg,
    txnRewardAgg,
    adminCreditAgg,
    adminDebitAgg,
    trades,
  ] = await Promise.all([
    prisma.deposit.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.withdrawalRecord.aggregate({
      where: { userId, status: COMPLETED_WITHDRAWAL_STATUS },
      _sum: { amount: true },
    }),
    prisma.withdrawalRecord.aggregate({
      where: { userId, status: { in: ["PROCESSING", "PENDING_REVIEW"] } },
      _sum: { amount: true },
    }),
    prisma.teamCommissionPayout.aggregate({
      where: { beneficiaryUserId: userId },
      _sum: { amount: true },
    }),
    prisma.transactionRecord.aggregate({
      where: {
        userId,
        status: "SUCCESS",
        type: { in: REWARD_TXN_TYPES },
      },
      _sum: { amount: true },
    }),
    prisma.balanceLedgerEntry.aggregate({
      where: { userId, kind: "ADMIN_CREDIT" },
      _sum: { amount: true },
    }),
    prisma.balanceLedgerEntry.aggregate({
      where: { userId, kind: "ADMIN_DEBIT" },
      _sum: { amount: true },
    }),
    prisma.trade.findMany({
      where: { userId },
      orderBy: { executedAt: "desc" },
      take: 60,
      select: {
        id: true,
        capitalAmount: true,
        strategyId: true,
        executedAt: true,
      },
    }),
  ]);

  const locked = trunc6(lockedCapital);
  const latestTrade = trades[0] ?? null;
  const session = getTradeSessionState({
    lastTradeTime: user?.last_trade_time || user?.lastTradeTime,
    tradeSessionEndsAt: user?.tradeSessionEndsAt,
    lockedCapital: locked,
  });

  let totalTradingPnl = 0;
  for (const trade of trades) {
    const isActiveLock =
      locked > 0 && session.active && latestTrade && trade.id === latestTrade.id;
    if (!isActiveLock) {
      totalTradingPnl += computeDailyProfit(
        decimalToNumber(trade.capitalAmount),
        trade.strategyId
      );
    }
  }

  const commissions = trunc6(commissionAgg._sum.amount);
  const promoRewards = trunc6(txnRewardAgg._sum.amount);
  const adminCredits = trunc6(adminCreditAgg._sum.amount);

  return {
    totalDeposits: trunc6(depositAgg._sum.amount),
    totalWithdrawals: trunc6(withdrawalCompletedAgg._sum.amount),
    pendingWithdrawals: trunc6(withdrawalPendingAgg._sum.amount),
    totalTradingPnl: trunc6(totalTradingPnl),
    totalCommissions: commissions,
    totalRewards: trunc6(commissions + promoRewards + adminCredits),
    totalAdminDebits: trunc6(adminDebitAgg._sum.amount),
    trades,
    latestTrade,
    session,
  };
}

async function buildUnifiedTransactionFeed(userId, user) {
  const rows = [];
  const locked = trunc6(decimalToNumber(user?.lockedCapital));
  const [
    deposits,
    withdrawals,
    txnRecords,
    commissions,
    trades,
  ] = await Promise.all([
    prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.withdrawalRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.transactionRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.teamCommissionPayout.findMany({
      where: { beneficiaryUserId: userId },
      orderBy: { executedAt: "desc" },
      take: 40,
    }),
    prisma.trade.findMany({
      where: { userId },
      orderBy: { executedAt: "desc" },
      take: 40,
      select: {
        id: true,
        capitalAmount: true,
        strategyId: true,
        executedAt: true,
      },
    }),
  ]);

  const session = getTradeSessionState({
    lastTradeTime: user?.last_trade_time || user?.lastTradeTime,
    tradeSessionEndsAt: user?.tradeSessionEndsAt,
    lockedCapital: locked,
  });
  const latestTradeId = trades[0]?.id ?? null;

  for (const d of deposits) {
    rows.push({
      id: `dep-${d.id}`,
      category: "DEPOSIT",
      type: "Deposit",
      amount: trunc6(decimalToNumber(d.amount)),
      currency: "USDT",
      status: "COMPLETED",
      timestamp: d.createdAt.toISOString(),
      commission: null,
    });
  }

  for (const w of withdrawals) {
    rows.push({
      id: `wd-${w.id}`,
      category: "WITHDRAWAL",
      type: "Withdrawal",
      amount: -trunc6(decimalToNumber(w.amount)),
      currency: w.currency || "USDT",
      status: mapWithdrawalFeedStatus(w.status),
      timestamp: w.createdAt.toISOString(),
      commission: null,
    });
  }

  for (const trade of trades) {
    const capital = trunc6(decimalToNumber(trade.capitalAmount));
    const isActiveLock =
      locked > 0 && session.active && trade.id === latestTradeId;

    rows.push({
      id: `trade-lock-${trade.id}`,
      category: "TRADE_LOCK",
      type: "Active AI Trade",
      amount: capital,
      currency: "USDT",
      status: isActiveLock ? "LOCKED" : "COMPLETED",
      timestamp: trade.executedAt.toISOString(),
      commission: null,
      strategyId: trade.strategyId,
    });

    if (!isActiveLock) {
      const profit = computeDailyProfit(capital, trade.strategyId);
      if (profit > 0) {
        const payoutAt = new Date(
          trade.executedAt.getTime() + 24 * 60 * 60 * 1000
        );
        rows.push({
          id: `trade-profit-${trade.id}`,
          category: "TRADE_PROFIT",
          type: "AI Trade Profit",
          amount: profit,
          currency: "USDT",
          status: "COMPLETED",
          timestamp: payoutAt.toISOString(),
          commission: null,
          strategyId: trade.strategyId,
        });
      }
    }
  }

  for (const c of commissions) {
    rows.push({
      id: `comm-${c.id}`,
      category: "COMMISSION",
      type: commissionLabel(c.generation),
      amount: trunc6(decimalToNumber(c.amount)),
      currency: "USDT",
      status: "COMPLETED",
      timestamp: c.executedAt.toISOString(),
      commission: null,
      generation: c.generation,
    });
  }

  for (const e of txnRecords) {
    if (e.type === "ADMIN_DEDUCTION" || e.type === "DEPOSIT_INTENT") continue;

    const isReward =
      PROMO_TXN_TYPES.includes(e.type) ||
      WALLET_CREDIT_TXN_TYPES.includes(e.type);
    if (!isReward) continue;

    const isLucky = e.type === "LUCKY_WHEEL_REWARD";
    rows.push({
      id: `txn-${e.id}`,
      category: "REWARD",
      type: rewardTypeLabel(e.type),
      amount: trunc6(decimalToNumber(e.amount)),
      currency:
        isLucky && String(e.description || "").includes("DADB")
          ? "DADB"
          : "USDT",
      status: e.status === "SUCCESS" ? "COMPLETED" : e.status,
      timestamp: e.createdAt.toISOString(),
      commission: null,
    });
  }

  rows.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return rows.slice(0, 50);
}

async function buildUserLedgerBundle(userId, user) {
  const balances = deriveBalanceSnapshot(user);
  const totals = await aggregateLedgerTotals(userId, balances.locked);
  const recentTransactions = await buildUnifiedTransactionFeed(userId, user);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  let todayPnl = 0;
  if (
    balances.locked > 0 &&
    totals.session.active &&
    totals.latestTrade &&
    totals.latestTrade.executedAt >= todayStart
  ) {
    todayPnl = computeDailyProfit(
      decimalToNumber(totals.latestTrade.capitalAmount),
      totals.latestTrade.strategyId
    );
  }

  return {
    availableBalance: balances.available,
    lockedCapital: balances.freeze,
    totalBalance: balances.total,
    totalDeposits: totals.totalDeposits,
    totalWithdrawals: totals.totalWithdrawals,
    pendingWithdrawals: totals.pendingWithdrawals,
    totalTradingPnl: totals.totalTradingPnl,
    totalCommissions: totals.totalCommissions,
    totalRewards: totals.totalRewards,
    todayPnl: trunc6(todayPnl),
    recentTransactions,
    assets: [
      {
        symbol: "USDT",
        total: balances.total,
        available: balances.available,
        freeze: balances.freeze,
      },
    ],
  };
}

module.exports = {
  deriveBalanceSnapshot,
  buildUserLedgerBundle,
  buildUnifiedTransactionFeed,
  aggregateLedgerTotals,
};
