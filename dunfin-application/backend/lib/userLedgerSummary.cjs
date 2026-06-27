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

const LEDGER_CACHE_TTL_MS =
  Number(process.env.LEDGER_CACHE_TTL_MS) > 0
    ? Number(process.env.LEDGER_CACHE_TTL_MS)
    : 8_000;

/** @type {Map<string, { expiresAt: number, data: object }>} */
const ledgerBundleCache = new Map();

const TRADE_SELECT = {
  id: true,
  capitalAmount: true,
  strategyId: true,
  executedAt: true,
};

function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? trunc6(n) : 0;
}

function ledgerCacheKey(userId, user) {
  const wallet = decimalToNumber(user?.walletBalance);
  const locked = decimalToNumber(user?.lockedCapital);
  const lastTrade =
    user?.last_trade_time || user?.lastTradeTime || user?.tradeSessionEndsAt || "";
  return `${userId}:${wallet}:${locked}:${lastTrade}`;
}

function readCachedBundle(key) {
  const row = ledgerBundleCache.get(key);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    ledgerBundleCache.delete(key);
    return null;
  }
  return row.data;
}

function writeCachedBundle(key, data) {
  ledgerBundleCache.set(key, {
    expiresAt: Date.now() + LEDGER_CACHE_TTL_MS,
    data,
  });
}

function parseRecordDate(record, keys = ["createdAt", "at", "executedAt", "timestamp"]) {
  for (const key of keys) {
    const raw = record?.[key];
    if (raw == null || raw === "") continue;
    const date = raw instanceof Date ? raw : new Date(raw);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function toIso(date, fallback = new Date(0)) {
  const resolved = date instanceof Date && !Number.isNaN(date.getTime()) ? date : fallback;
  try {
    return resolved.toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

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

function readSession(user, locked) {
  return getTradeSessionState({
    lastTradeTime: user?.last_trade_time || user?.lastTradeTime,
    tradeSessionEndsAt: user?.tradeSessionEndsAt,
    lockedCapital: locked,
  });
}

function normalizeDepositRows(deposits) {
  if (!Array.isArray(deposits)) return [];
  return deposits
    .map((row, index) => {
      const createdAt = parseRecordDate(row, ["createdAt", "at"]);
      if (!createdAt) return null;
      return {
        id: row.id || `legacy-dep-${index}`,
        amount: row.amount,
        txHash: row.txHash ?? null,
        createdAt,
      };
    })
    .filter(Boolean);
}

function normalizeTradeRows(trades) {
  if (!Array.isArray(trades)) return [];
  return trades
    .map((trade, index) => {
      const executedAt = parseRecordDate(trade, ["executedAt", "at", "createdAt"]);
      if (!executedAt) return null;
      return {
        id: trade.id || `legacy-trade-${index}`,
        capitalAmount: trade.capitalAmount,
        strategyId: trade.strategyId ?? 0,
        executedAt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
}

function computeTradingPnl(trades, session, locked, latestTrade) {
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
  return trunc6(totalTradingPnl);
}

/**
 * Locked capital from User row, or latest Trade row when a bot session is active.
 */
function resolveLockedCapital(user, latestTrade, session) {
  const stored = safeNum(user?.lockedCapital);
  if (stored > 0) return stored;
  if (session.active && latestTrade) {
    return safeNum(latestTrade.capitalAmount);
  }
  return 0;
}

/**
 * Liquid available = confirmed deposits + rewards + settled PnL − withdrawals − debits − locked.
 * Falls back to walletBalance row when ledger components are incomplete.
 */
function computeAvailableBalance(user, totals, lockedCapital) {
  const walletStored = safeNum(user?.walletBalance);

  const ledgerDerived = trunc6(
    safeNum(totals.totalDeposits) +
      safeNum(totals.totalRewards) +
      safeNum(totals.totalTradingPnl) -
      safeNum(totals.totalWithdrawals) -
      safeNum(totals.totalAdminDebits) -
      safeNum(totals.pendingWithdrawals) -
      safeNum(lockedCapital)
  );

  if (walletStored > 0) {
    return trunc6(Math.max(0, walletStored));
  }

  if (ledgerDerived > 0) {
    return ledgerDerived;
  }

  return trunc6(Math.max(0, walletStored));
}

function deriveBalanceSnapshot(user, totals = null) {
  const session = readSession(user, safeNum(user?.lockedCapital));
  const latestTrade = totals?.latestTrade ?? null;
  const lockedCapital = resolveLockedCapital(user, latestTrade, session);
  const sessionState = readSession(user, lockedCapital);

  const availableBalance = totals
    ? computeAvailableBalance(user, totals, lockedCapital)
    : trunc6(Math.max(0, safeNum(user?.walletBalance)));

  const inTrading =
    sessionState.active && lockedCapital > 0 ? lockedCapital : 0;
  const totalBalance = trunc6(availableBalance + lockedCapital);

  return {
    availableBalance,
    lockedCapital,
    inTrading,
    totalBalance,
    tradeSessionActive: sessionState.active,
    walletStored: safeNum(user?.walletBalance),
    session: sessionState,
    latestTrade,
  };
}

function computeAccruedYields(user, balances, totals) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const locked = balances.lockedCapital;
  const latestTrade = totals.latestTrade;
  const strategyId =
    user?.activeStrategy ?? latestTrade?.strategyId ?? 0;

  let todayPnl = 0;
  let accruedFromPriorDay = 0;

  if (locked > 0 && latestTrade) {
    const tradeDay = latestTrade.executedAt;
    if (tradeDay >= todayStart) {
      todayPnl = computeDailyProfit(
        decimalToNumber(latestTrade.capitalAmount),
        strategyId
      );
    } else if (tradeDay >= yesterdayStart && tradeDay < todayStart) {
      accruedFromPriorDay = computeDailyProfit(
        decimalToNumber(latestTrade.capitalAmount),
        strategyId
      );
    } else if (balances.tradeSessionActive || locked > 0) {
      accruedFromPriorDay = computeDailyProfit(locked, strategyId);
    }
  }

  return {
    todayPnl: trunc6(todayPnl),
    accruedFromPriorDay: trunc6(accruedFromPriorDay),
  };
}

async function fetchTradeHistory(userId, user, session, locked) {
  if (Array.isArray(user?.tradeHistory) && user.tradeHistory.length > 0) {
    const normalized = normalizeTradeRows(user.tradeHistory);
    if (normalized.length > 0) return normalized;
  }

  return prisma.trade
    .findMany({
      where: { userId },
      orderBy: { executedAt: "desc" },
      take: session.active && locked > 0 ? 10 : 30,
      select: TRADE_SELECT,
    })
    .then(normalizeTradeRows);
}

async function aggregateLedgerTotals(userId, user, balanceSnapshot) {
  const locked = balanceSnapshot.lockedCapital;
  const session = balanceSnapshot.session;

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
    fetchTradeHistory(userId, user, session, locked),
  ]);

  const latestTrade = trades[0] ?? null;
  const commissions = safeNum(commissionAgg._sum.amount);
  const promoRewards = safeNum(txnRewardAgg._sum.amount);
  const adminCredits = safeNum(adminCreditAgg._sum.amount);

  return {
    totalDeposits: safeNum(depositAgg._sum.amount),
    totalWithdrawals: safeNum(withdrawalCompletedAgg._sum.amount),
    pendingWithdrawals: safeNum(withdrawalPendingAgg._sum.amount),
    totalTradingPnl: computeTradingPnl(trades, session, locked, latestTrade),
    totalCommissions: commissions,
    totalRewards: trunc6(commissions + promoRewards + adminCredits),
    totalAdminDebits: safeNum(adminDebitAgg._sum.amount),
    trades,
    latestTrade,
    session,
  };
}

async function buildUnifiedTransactionFeed(userId, user, preloaded = {}) {
  const rows = [];
  const locked = safeNum(user?.lockedCapital);
  const session = readSession(user, locked);

  let deposits = [];
  let withdrawals = [];
  let txnRecords = [];
  let commissions = [];
  let trades = [];

  try {
    [deposits, withdrawals, txnRecords, commissions, trades] = await Promise.all([
      preloaded.deposits
        ? Promise.resolve(normalizeDepositRows(preloaded.deposits))
        : prisma.deposit
            .findMany({
              where: { userId },
              orderBy: { createdAt: "desc" },
              take: 40,
            })
            .then(normalizeDepositRows),
      preloaded.withdrawals
        ? Promise.resolve(preloaded.withdrawals)
        : prisma.withdrawalRecord.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 40,
          }),
      preloaded.txnRecords
        ? Promise.resolve(preloaded.txnRecords)
        : prisma.transactionRecord.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 40,
          }),
      preloaded.commissions
        ? Promise.resolve(preloaded.commissions)
        : prisma.teamCommissionPayout.findMany({
            where: { beneficiaryUserId: userId },
            orderBy: { executedAt: "desc" },
            take: 40,
          }),
      preloaded.trades
        ? Promise.resolve(normalizeTradeRows(preloaded.trades))
        : prisma.trade
            .findMany({
              where: { userId },
              orderBy: { executedAt: "desc" },
              take: 40,
              select: TRADE_SELECT,
            })
            .then(normalizeTradeRows),
    ]);
  } catch (err) {
    console.warn(`[ledger] transaction feed query failed for ${userId}:`, err.message);
  }

  const latestTradeId = trades[0]?.id ?? null;

  for (const d of deposits) {
    rows.push({
      id: `dep-${d.id}`,
      category: "DEPOSIT",
      type: "Deposit",
      amount: safeNum(d.amount),
      currency: "USDT",
      status: "COMPLETED",
      timestamp: toIso(d.createdAt),
      commission: null,
    });
  }

  for (const w of withdrawals) {
    const createdAt = parseRecordDate(w, ["createdAt", "at"]) || new Date(0);
    rows.push({
      id: `wd-${w.id}`,
      category: "WITHDRAWAL",
      type: "Withdrawal",
      amount: -safeNum(w.amount),
      currency: w.currency || "USDT",
      status: mapWithdrawalFeedStatus(w.status),
      timestamp: toIso(createdAt),
      commission: null,
    });
  }

  for (const trade of trades) {
    const capital = safeNum(trade.capitalAmount);
    const isActiveLock =
      locked > 0 && session.active && trade.id === latestTradeId;

    rows.push({
      id: `trade-lock-${trade.id}`,
      category: "TRADE_LOCK",
      type: "Active AI Trade",
      amount: capital,
      currency: "USDT",
      status: isActiveLock ? "LOCKED" : "COMPLETED",
      timestamp: toIso(trade.executedAt),
      commission: null,
      strategyId: trade.strategyId,
    });

    if (!isActiveLock) {
      const profit = computeDailyProfit(capital, trade.strategyId);
      if (profit > 0) {
        const payoutAt = new Date(trade.executedAt.getTime() + 24 * 60 * 60 * 1000);
        rows.push({
          id: `trade-profit-${trade.id}`,
          category: "TRADE_PROFIT",
          type: "AI Trade Profit",
          amount: profit,
          currency: "USDT",
          status: "COMPLETED",
          timestamp: toIso(payoutAt),
          commission: null,
          strategyId: trade.strategyId,
        });
      }
    }
  }

  for (const c of commissions) {
    const executedAt = parseRecordDate(c, ["executedAt", "createdAt"]) || new Date(0);
    rows.push({
      id: `comm-${c.id}`,
      category: "COMMISSION",
      type: commissionLabel(c.generation),
      amount: safeNum(c.amount),
      currency: "USDT",
      status: "COMPLETED",
      timestamp: toIso(executedAt),
      commission: null,
      generation: c.generation,
    });
  }

  for (const e of txnRecords) {
    if (e.type === "ADMIN_DEDUCTION" || e.type === "DEPOSIT_INTENT") continue;

    const isReward =
      PROMO_TXN_TYPES.includes(e.type) ||
      WALLET_CREDIT_TXN_TYPES.has(e.type);
    if (!isReward) continue;

    const isLucky = e.type === "LUCKY_WHEEL_REWARD";
    const createdAt = parseRecordDate(e, ["createdAt", "at"]) || new Date(0);
    rows.push({
      id: `txn-${e.id}`,
      category: "REWARD",
      type: rewardTypeLabel(e.type),
      amount: safeNum(e.amount),
      currency:
        isLucky && String(e.description || "").includes("DADB")
          ? "DADB"
          : "USDT",
      status: e.status === "SUCCESS" ? "COMPLETED" : e.status,
      timestamp: toIso(createdAt),
      commission: null,
    });
  }

  rows.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return rows.slice(0, 50);
}

function buildFallbackLedgerBundle(user) {
  const balances = deriveBalanceSnapshot(user);
  return {
    availableBalance: balances.availableBalance,
    lockedCapital: balances.lockedCapital,
    inTrading: balances.inTrading,
    totalBalance: balances.totalBalance,
    tradeSessionActive: balances.tradeSessionActive,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    totalTradingPnl: 0,
    totalCommissions: 0,
    totalRewards: 0,
    todayPnl: 0,
    accruedFromPriorDay: 0,
    recentTransactions: [],
    assets: [
      {
        symbol: "USDT",
        total: balances.totalBalance,
        available: balances.availableBalance,
        freeze: balances.lockedCapital,
      },
    ],
    fallback: true,
  };
}

function assembleLedgerBundle(user, balances, totals, recentTransactions) {
  const yields = computeAccruedYields(user, balances, totals);

  return {
    availableBalance: balances.availableBalance,
    lockedCapital: balances.lockedCapital,
    inTrading: balances.inTrading,
    totalBalance: balances.totalBalance,
    tradeSessionActive: balances.tradeSessionActive,
    totalDeposits: totals.totalDeposits,
    totalWithdrawals: totals.totalWithdrawals,
    pendingWithdrawals: totals.pendingWithdrawals,
    totalTradingPnl: totals.totalTradingPnl,
    totalCommissions: totals.totalCommissions,
    totalRewards: totals.totalRewards,
    todayPnl: yields.todayPnl,
    accruedFromPriorDay: yields.accruedFromPriorDay,
    recentTransactions,
    assets: [
      {
        symbol: "USDT",
        total: balances.totalBalance,
        available: balances.availableBalance,
        freeze: balances.lockedCapital,
      },
    ],
  };
}

async function buildUserLedgerBundle(userId, user, options = {}) {
  if (!user) {
    return buildFallbackLedgerBundle({ walletBalance: 0, lockedCapital: 0 });
  }

  const cacheKey = ledgerCacheKey(userId, user);
  if (!options.skipCache) {
    const cached = readCachedBundle(cacheKey);
    if (cached) return cached;
  }

  const preloaded = {
    trades: options.preloadedTrades ?? user?.tradeHistory,
    deposits: options.preloadedDeposits ?? user?.deposits,
  };

  try {
    const initialBalances = deriveBalanceSnapshot(user);
    const [totals, recentTransactions] = await Promise.all([
      aggregateLedgerTotals(userId, user, initialBalances),
      buildUnifiedTransactionFeed(userId, user, preloaded),
    ]);

    const balances = deriveBalanceSnapshot(user, totals);
    const bundle = assembleLedgerBundle(user, balances, totals, recentTransactions);

    if (!options.skipCache) {
      writeCachedBundle(cacheKey, bundle);
    }

    return bundle;
  } catch (err) {
    console.warn(`[ledger] bundle failed for ${userId}, using DB fallback:`, err.message);
    return buildFallbackLedgerBundle(user);
  }
}

module.exports = {
  deriveBalanceSnapshot,
  buildUserLedgerBundle,
  buildUnifiedTransactionFeed,
  aggregateLedgerTotals,
  buildFallbackLedgerBundle,
  safeNum,
};
