const { randomInt } = require("crypto");
const { prisma } = require("../lib/prisma.cjs");
const { trunc6 } = require("../lib/formatNumbers.cjs");
const { sendApiError, sendClientError } = require("../lib/apiErrors.cjs");

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const DAILY_SPINS = 1;

const SPIN_BLOCKED_EN =
  "You have already used your free spin today. Come back tomorrow!";
const SPIN_BLOCKED_AR = "لقد استهلكت دورتك المجانية اليوم. عد غداً!";

/** Eight USDT-only slices — index order matches wheel UI (clockwise from top). */
const PRIZES = Object.freeze([
  { amount: 0.1, type: "USDT", label: "USDT 0.10" },
  { amount: 0.25, type: "USDT", label: "USDT 0.25" },
  { amount: 0.5, type: "USDT", label: "USDT 0.50" },
  { amount: 1, type: "USDT", label: "USDT 1.00" },
  { amount: 2, type: "USDT", label: "USDT 2.00" },
  { amount: 5, type: "USDT", label: "USDT 5.00" },
  { amount: 10, type: "USDT", label: "USDT 10.00" },
  { amount: 100, type: "USDT", label: "GRAND: USDT 100", grand: true },
]);

/** Weighted odds (sum = 9000). Index 7 = 1/9000 GRAND prize. */
const PRIZE_WEIGHTS = Object.freeze([3000, 2500, 1800, 1100, 450, 120, 29, 1]);

function pickPrizeIndex() {
  const total = PRIZE_WEIGHTS.reduce((sum, w) => sum + w, 0);
  let roll = randomInt(0, total);
  for (let i = 0; i < PRIZE_WEIGHTS.length; i++) {
    roll -= PRIZE_WEIGHTS[i];
    if (roll < 0) return i;
  }
  return PRIZE_WEIGHTS.length - 1;
}

function isWithinSpinCooldown(lastSpinDate) {
  if (!lastSpinDate) return false;
  return Date.now() - lastSpinDate.getTime() < TWENTY_FOUR_HOURS_MS;
}

async function getWheelStatus(req, res) {
  try {
    const userId = req.auth.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true, lastSpinDate: true },
    });

    if (!user) {
      return sendClientError(res, "NOT_FOUND", "User not found", 404);
    }

    const onCooldown = isWithinSpinCooldown(user.lastSpinDate);
    const funded = trunc6(user.walletBalance) > 0;
    const spinsRemaining = onCooldown ? 0 : DAILY_SPINS;

    return res.json({
      success: true,
      spinsRemaining,
      maxSpinsPerDay: DAILY_SPINS,
      canSpin: spinsRemaining > 0 && funded,
      nextSpinAt:
        onCooldown && user.lastSpinDate
          ? new Date(user.lastSpinDate.getTime() + TWENTY_FOUR_HOURS_MS).toISOString()
          : null,
      prizes: PRIZES.map((p, index) => ({
        index,
        amount: p.amount,
        type: p.type,
        label: p.label,
        grand: Boolean(p.grand),
      })),
    });
  } catch (error) {
    return sendApiError(res, error, { success: false });
  }
}

async function spinWheel(req, res) {
  try {
    const userId = req.auth.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        walletBalance: true,
        lastSpinDate: true,
      },
    });

    if (!user) {
      return sendClientError(res, "NOT_FOUND", "User not found", 404);
    }

    if (trunc6(user.walletBalance) <= 0) {
      return sendApiError(
        res,
        {
          code: "NOT_FUNDED",
          message: "Fund your wallet before using the daily lucky wheel.",
        },
        { status: 403, success: false }
      );
    }

    if (isWithinSpinCooldown(user.lastSpinDate)) {
      return sendApiError(
        res,
        {
          code: "SPIN_ALREADY_USED",
          message: SPIN_BLOCKED_EN,
          errorAr: SPIN_BLOCKED_AR,
        },
        { status: 429, success: false }
      );
    }

    const prizeIndex = pickPrizeIndex();
    const prize = PRIZES[prizeIndex];
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.user.update({
        where: { id: userId },
        data: {
          lastSpinDate: now,
          walletBalance: { increment: prize.amount },
        },
        select: { walletBalance: true, customTokenBalance: true },
      });

      await tx.transactionRecord.create({
        data: {
          userId,
          type: "LUCKY_WHEEL_REWARD",
          amount: prize.amount,
          status: "SUCCESS",
          description: `Lucky Wheel: ${prize.label}`,
        },
      });

      return row;
    });

    return res.json({
      success: true,
      prizeIndex,
      amount: prize.amount,
      type: prize.type,
      label: prize.label,
      grand: Boolean(prize.grand),
      walletBalance: trunc6(updated.walletBalance),
      customTokenBalance: Number(updated.customTokenBalance) || 0,
      spinsRemaining: 0,
    });
  } catch (error) {
    return sendApiError(res, error, { success: false });
  }
}

module.exports = {
  spinWheel,
  getWheelStatus,
  PRIZES,
  PRIZE_WEIGHTS,
};
