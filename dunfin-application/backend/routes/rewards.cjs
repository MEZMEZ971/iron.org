const { randomInt } = require("crypto");
const { prisma } = require("../lib/prisma.cjs");
const { trunc6 } = require("../lib/formatNumbers.cjs");

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const SPIN_BLOCKED_EN =
  "You have already used your free spin today. Come back tomorrow!";
const SPIN_BLOCKED_AR = "لقد استهلكت دورتك المجانية اليوم. عد غداً!";

/** Index-aligned prizes — weights: high → low probability */
const PRIZES = Object.freeze([
  { amount: 0.1, type: "USDT", label: "0.10 USDT" },
  { amount: 0.5, type: "USDT", label: "0.50 USDT" },
  { amount: 1, type: "DADB", label: "1.00 DADB Coin" },
  { amount: 2, type: "DADB", label: "2.00 DADB Coin" },
  { amount: 0.05, type: "USDT", label: "0.05 USDT" },
  { amount: 5, type: "DADB", label: "5.00 DADB Coin" },
]);

/** 0: high, 1: medium, 2–3: medium, 4: medium-low, 5: jackpot low */
const PRIZE_WEIGHTS = Object.freeze([40, 22, 18, 12, 5, 3]);

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
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (trunc6(user.walletBalance) <= 0) {
      return res.status(403).json({
        success: false,
        code: "NOT_FUNDED",
        error: "Fund your wallet before using the daily lucky wheel.",
      });
    }

    if (isWithinSpinCooldown(user.lastSpinDate)) {
      return res.status(429).json({
        success: false,
        code: "SPIN_ALREADY_USED",
        error: SPIN_BLOCKED_EN,
        errorAr: SPIN_BLOCKED_AR,
      });
    }

    const prizeIndex = pickPrizeIndex();
    const prize = PRIZES[prizeIndex];
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const data = { lastSpinDate: now };
      if (prize.type === "USDT") {
        data.walletBalance = { increment: prize.amount };
      } else {
        data.customTokenBalance = { increment: prize.amount };
      }

      const row = await tx.user.update({
        where: { id: userId },
        data,
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
      walletBalance: trunc6(updated.walletBalance),
      customTokenBalance: Number(updated.customTokenBalance) || 0,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { spinWheel, PRIZES, PRIZE_WEIGHTS };
