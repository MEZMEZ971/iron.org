const { prisma } = require("./lib/prisma.cjs");
const { decimalToNumber } = require("./lib/userMapper.cjs");
const { trunc6 } = require("./lib/formatNumbers.cjs");

/** Commission % of downline daily yield per generation (payout time). */
const GEN_COMMISSION_RATE = {
  1: 0.1,
  2: 0.05,
  3: 0.02,
};

function commissionFromYield(dailyYield, generation) {
  const rate = GEN_COMMISSION_RATE[generation] || 0;
  return trunc6(Number(dailyYield) * rate);
}

/**
 * Credit Gen 1–3 referrers from trader's settled daily yield.
 */
async function distributeReferralCommissions(traderUserId, dailyYield, tradeId, tx) {
  const db = tx || prisma;
  const trader = await db.user.findUnique({
    where: { id: traderUserId },
    select: { referredById: true },
  });
  if (!trader?.referredById || dailyYield <= 0) return;

  let beneficiaryId = trader.referredById;
  let generation = 1;

  while (beneficiaryId && generation <= 3) {
    const amount = commissionFromYield(dailyYield, generation);
    if (amount > 0) {
      const beneficiary = await db.user.findUnique({
        where: { id: beneficiaryId },
        select: { walletBalance: true },
      });
      const nextWallet = trunc6(decimalToNumber(beneficiary?.walletBalance) + amount);

      await db.teamCommissionPayout.create({
        data: {
          beneficiaryUserId: beneficiaryId,
          sourceUserId: traderUserId,
          generation,
          amount,
          tradeId: tradeId || null,
        },
      });

      await db.user.update({
        where: { id: beneficiaryId },
        data: { walletBalance: nextWallet },
      });
    }

    const parent = await db.user.findUnique({
      where: { id: beneficiaryId },
      select: { referredById: true },
    });
    beneficiaryId = parent?.referredById ?? null;
    generation += 1;
  }
}

/** Legacy estimate for team analytics dashboards (capital × default yield × gen rate). */
const DAILY_YIELD_RATE = 0.024;

function commissionFromCapital(capitalAmount, generation) {
  return commissionFromYield(Number(capitalAmount) * DAILY_YIELD_RATE, generation);
}

module.exports = {
  GEN_COMMISSION_RATE,
  DAILY_YIELD_RATE,
  commissionFromYield,
  commissionFromCapital,
  distributeReferralCommissions,
};
