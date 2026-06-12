const { prisma } = require("../lib/prisma.cjs");
const { trunc6 } = require("../lib/formatNumbers.cjs");
const { sendApiError, sendClientError } = require("../lib/apiErrors.cjs");

const MIN_DEPOSIT_AMOUNT = 5;

async function logDepositIntent(req, res) {
  try {
    const userId = req.auth.userId;
    const amount = Number(req.body?.amount);
    const currency = String(req.body?.currency || "").trim();

    if (!Number.isFinite(amount) || amount < MIN_DEPOSIT_AMOUNT) {
      return sendClientError(
        res,
        "MIN_AMOUNT",
        `Minimum deposit amount is ${MIN_DEPOSIT_AMOUNT} USDT`,
        400
      );
    }

    if (!currency) {
      return sendClientError(res, "INVALID_CURRENCY", "currency is required", 400);
    }

    const record = await prisma.transactionRecord.create({
      data: {
        userId,
        type: "DEPOSIT_INTENT",
        amount: trunc6(amount),
        status: "PENDING",
        description: `Deposit intent: ${trunc6(amount)} ${currency}`,
      },
    });

    return res.json({
      success: true,
      intentId: record.id,
      amount: trunc6(amount),
      currency,
      status: record.status,
    });
  } catch (error) {
    return sendApiError(res, error, { success: false });
  }
}

module.exports = { logDepositIntent };
