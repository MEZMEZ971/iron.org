const { prisma } = require("./prisma.cjs");
const { trunc6 } = require("./formatNumbers.cjs");
const { decimalToNumber } = require("./userMapper.cjs");
const { computeDailyProfit } = require("./strategyRoi.cjs");

const WALLET_CREDIT_TXN_TYPES = new Set([
  "LUCKY_WHEEL_REWARD",
  "BROKER_RANK_UPGRADE_BONUS",
  "BROKER_SALARY",
]);

const WITHDRAWAL_DEBIT_STATUSES = ["PROCESSING", "PENDING_REVIEW", "COMPLETED"];

/**
 * Reconstruct spendable wallet balance from immutable ledger tables.
 * walletBalance = deposits + credits + commissions + settled trade profits
 *                 - withdrawals - debits - lockedCapital
 */
async function calculateLedgerWalletBalance(userId, client = prisma) {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      lockedCapital: true,
    },
  });
  if (!user) return 0;

  const lockedCapital = trunc6(decimalToNumber(user.lockedCapital));

  const [
    depositAgg,
    withdrawalAgg,
    adminCreditAgg,
    adminDebitAgg,
    txnCreditAgg,
    commissionAgg,
    trades,
  ] = await Promise.all([
    client.deposit.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    client.withdrawalRecord.aggregate({
      where: { userId, status: { in: WITHDRAWAL_DEBIT_STATUSES } },
      _sum: { amount: true },
    }),
    client.balanceLedgerEntry.aggregate({
      where: { userId, kind: "ADMIN_CREDIT" },
      _sum: { amount: true },
    }),
    client.balanceLedgerEntry.aggregate({
      where: { userId, kind: "ADMIN_DEBIT" },
      _sum: { amount: true },
    }),
    client.transactionRecord.aggregate({
      where: {
        userId,
        status: "SUCCESS",
        type: { in: [...WALLET_CREDIT_TXN_TYPES] },
      },
      _sum: { amount: true },
    }),
    client.teamCommissionPayout.aggregate({
      where: { beneficiaryUserId: userId },
      _sum: { amount: true },
    }),
    client.trade.findMany({
      where: { userId },
      orderBy: { executedAt: "asc" },
      select: { capitalAmount: true, strategyId: true },
    }),
  ]);

  let tradeProfits = 0;
  for (const trade of trades) {
    tradeProfits += computeDailyProfit(
      decimalToNumber(trade.capitalAmount),
      trade.strategyId
    );
  }
  if (lockedCapital > 0 && trades.length > 0) {
    const activeTrade = trades[trades.length - 1];
    tradeProfits -= computeDailyProfit(
      decimalToNumber(activeTrade.capitalAmount),
      activeTrade.strategyId
    );
  }
  tradeProfits = trunc6(Math.max(0, tradeProfits));

  const deposits = trunc6(depositAgg._sum.amount);
  const withdrawals = trunc6(withdrawalAgg._sum.amount);
  const adminCredits = trunc6(adminCreditAgg._sum.amount);
  const adminDebits = trunc6(adminDebitAgg._sum.amount);
  const txnCredits = trunc6(txnCreditAgg._sum.amount);
  const commissions = trunc6(commissionAgg._sum.amount);

  return trunc6(
    deposits +
      adminCredits +
      txnCredits +
      commissions +
      tradeProfits -
      withdrawals -
      adminDebits -
      lockedCapital
  );
}

/**
 * Compare stored walletBalance to ledger truth; optionally heal the database field.
 * - When ledger > stored: increment walletBalance (missed deposit credit).
 * - When stored > ledger: backfill a Deposit row (legacy chain-sync credits without ledger rows).
 */
async function reconcileAndHealUserWalletBalance(userId, { heal = false, client } = {}) {
  const db = client || prisma;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, uid: true, walletBalance: true },
  });
  if (!user) {
    return { userId, found: false, stored: 0, ledger: 0, healed: false };
  }

  const stored = trunc6(decimalToNumber(user.walletBalance));
  let ledger = await calculateLedgerWalletBalance(userId, db);
  let delta = trunc6(ledger - stored);

  if (heal && delta < -0.000001) {
    const backfillAmount = trunc6(-delta);
    await db.deposit.create({
      data: {
        userId,
        amount: backfillAmount,
        txHash: null,
      },
    });
    ledger = await calculateLedgerWalletBalance(userId, db);
    delta = trunc6(ledger - stored);

    console.warn(
      `[wallet-reconcile] User ${user.uid || userId}: backfilled deposit ledger +${backfillAmount} (stored ${stored}, ledger now ${ledger})`
    );

    return {
      userId,
      uid: user.uid,
      found: true,
      stored,
      ledger,
      delta,
      healed: true,
      backfilledDeposit: backfillAmount,
    };
  }

  if (heal && delta > 0.000001) {
    await db.user.update({
      where: { id: userId },
      data: { walletBalance: ledger },
    });

    console.warn(
      `[wallet-reconcile] User ${user.uid || userId}: stored ${stored} → ${ledger} (Δ +${delta})`
    );

    return {
      userId,
      uid: user.uid,
      found: true,
      stored,
      ledger,
      delta,
      healed: true,
    };
  }

  return {
    userId,
    uid: user.uid,
    found: true,
    stored,
    ledger,
    delta,
    healed: false,
  };
}

module.exports = {
  calculateLedgerWalletBalance,
  reconcileAndHealUserWalletBalance,
  WALLET_CREDIT_TXN_TYPES,
  WITHDRAWAL_DEBIT_STATUSES,
};
