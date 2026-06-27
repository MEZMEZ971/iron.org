const { trunc6 } = require("./formatNumbers.cjs");
const { decimalToNumber } = require("./userMapper.cjs");
const { calculateLedgerWalletBalance } = require("./walletBalanceReconciliation.cjs");
const { isTrialCurrentlyActive } = require("./trialBalance.cjs");

/**
 * Spendable wallet for trading: max(DB walletBalance, ledger aggregate).
 * Ledger includes deposits, admin credits, wheel rewards, commissions, and settled PnL.
 */
async function resolveTradableWalletBalance(userId, user, client) {
  const stored = trunc6(decimalToNumber(user?.walletBalance));
  let ledger = stored;
  try {
    ledger = trunc6(await calculateLedgerWalletBalance(userId, client));
  } catch (err) {
    console.warn("[trade-balance] ledger read failed:", err.message);
  }
  return trunc6(Math.max(stored, ledger));
}

/** Wallet + active trial credit — used for strategy qualification and capital lock. */
async function resolveTradableBalance(userId, user, client) {
  const wallet = await resolveTradableWalletBalance(userId, user, client);
  const trial = isTrialCurrentlyActive(user)
    ? trunc6(decimalToNumber(user?.trialBalance))
    : 0;
  return trunc6(wallet + trial);
}

/**
 * Inside a trade transaction: heal walletBalance upward when ledger > stored
 * so reward-only rows can lock capital without a chain deposit cross-check.
 */
async function syncTradableWalletInTx(userId, user, tx) {
  const stored = trunc6(decimalToNumber(user.walletBalance));
  const effectiveWallet = await resolveTradableWalletBalance(userId, user, tx);

  if (effectiveWallet > stored + 0.000001) {
    await tx.user.update({
      where: { id: userId },
      data: { walletBalance: effectiveWallet },
    });
  }

  return {
    ...user,
    walletBalance: effectiveWallet,
  };
}

function tradableBalanceFromUserRow(user) {
  const wallet = trunc6(decimalToNumber(user?.walletBalance));
  const trial = isTrialCurrentlyActive(user)
    ? trunc6(decimalToNumber(user?.trialBalance))
    : 0;
  return trunc6(wallet + trial);
}

module.exports = {
  resolveTradableWalletBalance,
  resolveTradableBalance,
  syncTradableWalletInTx,
  tradableBalanceFromUserRow,
};
