const { prisma } = require("../lib/prisma.cjs");
const { trunc6 } = require("../lib/formatNumbers.cjs");

const MIN_DEPOSIT_AMOUNT = 5;

async function logDepositIntent(req, res) {
  try {
    const userId = req.auth.userId;
    const amount = Number(req.body?.amount);
    const currency = String(req.body?.currency || "").trim();

    if (!Number.isFinite(amount) || amount < MIN_DEPOSIT_AMOUNT) {
      return res.status(400).json({
        success: false,
        code: "MIN_AMOUNT",
        error: `Minimum deposit amount is ${MIN_DEPOSIT_AMOUNT} USDT`,
      });
    }

    if (!currency) {
      return res.status(400).json({
        success: false,
        code: "INVALID_CURRENCY",
        error: "currency is required",
      });
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
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { logDepositIntent };
