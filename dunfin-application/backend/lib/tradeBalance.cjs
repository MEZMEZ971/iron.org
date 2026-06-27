const { trunc6 } = require("./formatNumbers.cjs");
const { decimalToNumber } = require("./userMapper.cjs");
const { compileLedgerBalances } = require("./userLedgerSummary.cjs");
const { isTrialCurrentlyActive } = require("./trialBalance.cjs");

function activeTrialSpendable(user) {
  if (!isTrialCurrentlyActive(user)) return 0;
  // trialBalance is already decremented when capital is locked in an active trade
  return trunc6(decimalToNumber(user?.trialBalance));
}

/**
 * Systemic available wallet from compiled ledger (Net Assets − Locked Capital).
 */
async function resolveTradableWalletBalance(userId, user, client) {
  try {
    const compiled = await compileLedgerBalances(userId, user, {
      prismaClient: client,
      skipFeed: true,
    });
    return trunc6(compiled.computedAvailableBalance ?? compiled.availableBalance ?? 0);
  } catch (err) {
    console.warn("[trade-balance] ledger compile failed:", err.message);
    const stored = trunc6(decimalToNumber(user?.walletBalance));
    return trunc6(Math.max(0, stored));
  }
}

/** Ledger available + remaining active trial credit (never double-counts locked trial). */
async function resolveTradableBalance(userId, user, client) {
  const baseAvailable = await resolveTradableWalletBalance(userId, user, client);
  const trial = activeTrialSpendable(user);
  return trunc6(baseAvailable + trial);
}

/**
 * Canonical balance snapshot for trade APIs and portfolio hydration.
 */
async function buildTradeBalanceSnapshot(userId, user, client) {
  const compiled = await compileLedgerBalances(userId, user, {
    prismaClient: client,
    skipFeed: true,
  });
  const availableWallet = trunc6(
    compiled.computedAvailableBalance ?? compiled.availableBalance ?? 0
  );
  const lockedCapital = trunc6(compiled.lockedCapital ?? decimalToNumber(user?.lockedCapital));
  const ledgerTotal = trunc6(
    compiled.computedTotalBalance ?? availableWallet + lockedCapital
  );
  const trial = activeTrialSpendable(user);

  return {
    availableWallet,
    availableBalance: trunc6(availableWallet + trial),
    lockedCapital,
    totalBalance: trunc6(ledgerTotal + trial),
    ledgerTotalBalance: ledgerTotal,
    netAssets: trunc6(compiled.netAssets ?? ledgerTotal),
    trialBalance: trial,
  };
}

/**
 * Inside a trade transaction: align walletBalance to Net Assets − Locked Capital.
 * Never heals upward to gross net assets while capital is locked in active trades.
 */
async function syncTradableWalletInTx(userId, user, tx) {
  const snapshot = await buildTradeBalanceSnapshot(userId, user, tx);
  const stored = trunc6(decimalToNumber(user.walletBalance));

  if (Math.abs(snapshot.availableWallet - stored) > 0.000001) {
    await tx.user.update({
      where: { id: userId },
      data: { walletBalance: snapshot.availableWallet },
    });
  }

  return {
    ...user,
    walletBalance: snapshot.availableWallet,
    lockedCapital: snapshot.lockedCapital,
  };
}

function tradableBalanceFromUserRow(user) {
  const wallet = trunc6(decimalToNumber(user?.walletBalance));
  const trial = activeTrialSpendable(user);
  return trunc6(wallet + trial);
}

module.exports = {
  resolveTradableWalletBalance,
  resolveTradableBalance,
  buildTradeBalanceSnapshot,
  syncTradableWalletInTx,
  tradableBalanceFromUserRow,
  activeTrialSpendable,
};
