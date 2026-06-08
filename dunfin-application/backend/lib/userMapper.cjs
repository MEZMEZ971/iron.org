function decimalToNumber(value) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function mapDeposit(row) {
  return {
    amount: decimalToNumber(row.amount),
    txHash: row.txHash,
    at: row.createdAt.toISOString(),
  };
}

function mapTrade(row) {
  return {
    executedAt: row.executedAt.toISOString(),
    capitalAmount: decimalToNumber(row.capitalAmount),
    strategyId: row.strategyId,
    teamActiveAtExecution: row.teamActiveAtExecution,
    walletBalanceAfter: decimalToNumber(row.walletBalanceAfter),
  };
}

function mapNetworkAddresses(rows) {
  const depositAddresses = {};
  for (const row of rows || []) {
    depositAddresses[row.network] = {
      address: row.address,
      txHash: row.txHash,
      tron: row.tron,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
  return depositAddresses;
}

/** Maps Prisma User (+ relations) to legacy JSON-store shape used by trading/affiliate. */
function mapUserToLegacy(row) {
  if (!row) return null;

  const depositAddresses = mapNetworkAddresses(row.networkAddresses);

  return {
    id: row.id,
    uid: row.uid || null,
    username: row.username || null,
    email: row.email || null,
    phone: row.phone || null,
    phoneCountryCode: row.phoneCountryCode || null,
    displayName: row.displayName,
    referralCode: row.referralCode,
    referredBy: row.referredById,
    referredById: row.referredById,
    hasDeposited: row.hasDeposited,
    walletBalance: decimalToNumber(row.walletBalance),
    onChainBalance: decimalToNumber(row.onChainBalance),
    tradingCapital: decimalToNumber(row.tradingCapital),
    lockedCapital: decimalToNumber(row.lockedCapital),
    activeStrategy: row.activeStrategy,
    last_trade_time: row.lastTradeTime ? row.lastTradeTime.toISOString() : null,
    lastTradeTime: row.lastTradeTime,
    tradeSessionEndsAt: row.tradeSessionEndsAt
      ? row.tradeSessionEndsAt.toISOString()
      : null,
    depositAddress: row.depositAddress,
    kycStatus: row.kycStatus || "NONE",
    depositAddresses,
    createdAt: row.createdAt.toISOString(),
    deposits: (row.deposits || []).map(mapDeposit),
    tradeHistory: (row.trades || []).map(mapTrade),
  };
}

const { generateUidCandidate } = require("./uidGenerator.cjs");

/** @deprecated Prefer `allocateUniqueUid()` before persisting to PostgreSQL. */
function generateUid() {
  return generateUidCandidate();
}

function generateReferralCode(userId) {
  const base = userId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DF${base || "USER"}${suffix}`;
}

module.exports = {
  mapUserToLegacy,
  mapDeposit,
  mapTrade,
  decimalToNumber,
  generateUid,
  generateReferralCode,
};
