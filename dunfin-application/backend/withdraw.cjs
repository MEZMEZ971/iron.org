const bcrypt = require("bcrypt");
const { prisma } = require("./lib/prisma.cjs");
const { trunc6 } = require("./lib/formatNumbers.cjs");

const MIN_WITHDRAW = 5;
const MAX_WITHDRAW = 10000;
const FEE_PERCENT = 0.1;
const ALLOWED_NETWORKS = new Set(["ERC20", "BEP20", "TRC20"]);
const ALLOWED_CURRENCIES = new Set(["USDT", "USDC"]);

const PAYMENT_PASSWORD_NOT_SET_EN =
  "Configure your 6-digit transaction password in Settings before withdrawing.";
const PAYMENT_PASSWORD_NOT_SET_AR =
  "يرجى إعداد كلمة مرور المعاملات من الإعدادات قبل تنفيذ السحب.";

const WRONG_PAYMENT_PASSWORD_EN =
  "Incorrect transaction password! Account locked for your protection.";
const WRONG_PAYMENT_PASSWORD_AR =
  "كلمة مرور المعاملات غير صحيحة! تم حماية حسابك من محاولة السحب.";

function calcFee(amount) {
  return trunc6(amount * FEE_PERCENT);
}

function calcNet(amount) {
  return trunc6(amount - calcFee(amount));
}

function mapWithdrawalRecord(row) {
  return {
    id: row.id,
    userId: row.userId,
    currency: row.currency,
    network: row.network,
    address: row.address,
    amount: trunc6(row.amount),
    fee: trunc6(row.fee),
    netAmount: trunc6(row.netAmount),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getWithdrawPreflight(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      walletBalance: true,
      paymentPasswordHash: true,
    },
  });
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  return {
    walletBalance: trunc6(user.walletBalance),
    requiresPaymentPin: Boolean(user.paymentPasswordHash),
    minAmount: MIN_WITHDRAW,
    maxAmount: MAX_WITHDRAW,
    feePercent: FEE_PERCENT * 100,
    turnoverShortfall: 0,
  };
}

async function listWithdrawals(userId, limit = 50) {
  const rows = await prisma.withdrawalRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(mapWithdrawalRecord);
}

async function processWithdraw(userId, body) {
  const currency = String(body.currency || "USDT").toUpperCase();
  const network = String(body.network || "ERC20").toUpperCase();
  const address = String(body.address || "").trim();
  const amount = trunc6(Number(body.amount));
  const paymentPassword = String(
    body.paymentPassword ?? body.paymentPin ?? ""
  ).trim();

  if (!ALLOWED_CURRENCIES.has(currency)) {
    const err = new Error("Invalid currency");
    err.code = "INVALID_CURRENCY";
    throw err;
  }
  if (!ALLOWED_NETWORKS.has(network)) {
    const err = new Error("Invalid network");
    err.code = "INVALID_NETWORK";
    throw err;
  }
  if (!address || address.length < 8) {
    const err = new Error("Withdrawal address required");
    err.code = "INVALID_ADDRESS";
    throw err;
  }
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAW) {
    const err = new Error(`Minimum withdrawal amount is ${MIN_WITHDRAW}`);
    err.code = "MIN_AMOUNT";
    throw err;
  }
  if (amount > MAX_WITHDRAW) {
    const err = new Error(`Maximum withdrawal amount is ${MAX_WITHDRAW}`);
    err.code = "MAX_AMOUNT";
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const balance = trunc6(user.walletBalance);
  if (balance < amount) {
    const err = new Error("Insufficient balance");
    err.code = "INSUFFICIENT_BALANCE";
    throw err;
  }

  if (!user.paymentPasswordHash) {
    const err = new Error(PAYMENT_PASSWORD_NOT_SET_EN);
    err.code = "PAYMENT_PASSWORD_NOT_SET";
    err.errorAr = PAYMENT_PASSWORD_NOT_SET_AR;
    err.httpStatus = 400;
    throw err;
  }

  if (!paymentPassword) {
    const err = new Error("Transaction password is required");
    err.code = "PAYMENT_PASSWORD_REQUIRED";
    throw err;
  }

  if (!/^\d{6}$/.test(paymentPassword)) {
    const err = new Error("Transaction password must be exactly 6 digits");
    err.code = "INVALID_PAYMENT_PASSWORD";
    throw err;
  }

  const match = await bcrypt.compare(
    paymentPassword,
    user.paymentPasswordHash
  );
  if (!match) {
    const err = new Error(WRONG_PAYMENT_PASSWORD_EN);
    err.code = "WRONG_PAYMENT_PASSWORD";
    err.errorAr = WRONG_PAYMENT_PASSWORD_AR;
    err.httpStatus = 403;
    throw err;
  }

  const fee = calcFee(amount);
  const netAmount = calcNet(amount);
  const newBalance = trunc6(balance - amount);

  const record = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { walletBalance: newBalance },
    });

    return tx.withdrawalRecord.create({
      data: {
        userId,
        currency,
        network,
        address,
        amount,
        fee,
        netAmount,
        status: "PROCESSING",
      },
    });
  });

  return {
    success: true,
    withdrawal: mapWithdrawalRecord(record),
    walletBalance: newBalance,
    settlementAmount: amount,
    fee,
    netAmount,
    feePercent: FEE_PERCENT * 100,
  };
}

module.exports = {
  MIN_WITHDRAW,
  MAX_WITHDRAW,
  FEE_PERCENT,
  calcFee,
  calcNet,
  getWithdrawPreflight,
  listWithdrawals,
  processWithdraw,
};
