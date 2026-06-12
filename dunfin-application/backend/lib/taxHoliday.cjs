const { prisma } = require("./prisma.cjs");
const { trunc6 } = require("./formatNumbers.cjs");

const DAY_MS = 24 * 60 * 60 * 1000;
const INVITE_TAX_FREE_DAYS = 30;
const STRATEGY_BONUS_DAYS = 20;
const USER_PROFIT_SHARE = 0.6;

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isTaxFreeActive(user, now = new Date()) {
  if (!user?.isInvited) return false;
  const until = toDate(user.taxFreeUntil);
  if (!until) return false;
  return now.getTime() <= until.getTime();
}

function taxFreeDaysRemaining(user, now = new Date()) {
  if (!isTaxFreeActive(user, now)) return 0;
  const until = toDate(user.taxFreeUntil);
  if (!until) return 0;
  const diffMs = until.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / DAY_MS));
}

function splitDailyProfit(user, grossProfit, now = new Date()) {
  const gross = Number(grossProfit) || 0;
  if (gross <= 0) {
    return { grossProfit: 0, userShare: 0, platformShare: 0, taxFree: false };
  }

  if (isTaxFreeActive(user, now)) {
    return {
      grossProfit: trunc6(gross),
      userShare: trunc6(gross),
      platformShare: 0,
      taxFree: true,
    };
  }

  const userShare = trunc6(gross * USER_PROFIT_SHARE);
  const platformShare = trunc6(gross - userShare);
  return {
    grossProfit: trunc6(gross),
    userShare,
    platformShare,
    taxFree: false,
  };
}

function inviteRegistrationTaxFields(now = new Date()) {
  return {
    isInvited: true,
    taxFreeUntil: new Date(now.getTime() + INVITE_TAX_FREE_DAYS * DAY_MS),
  };
}

function computeStrategyBonusTaxFreeUntil(user, now = new Date()) {
  const currentUntil = toDate(user.taxFreeUntil);
  if (currentUntil && now.getTime() <= currentUntil.getTime()) {
    return new Date(currentUntil.getTime() + STRATEGY_BONUS_DAYS * DAY_MS);
  }
  return new Date(now.getTime() + STRATEGY_BONUS_DAYS * DAY_MS);
}

function buildTaxHolidayProfile(user, now = new Date()) {
  const active = isTaxFreeActive(user, now);
  const until = toDate(user?.taxFreeUntil);
  return {
    isInvited: Boolean(user?.isInvited),
    hasActivatedBonusStrategy: Boolean(user?.hasActivatedBonusStrategy),
    taxFreeUntil: until ? until.toISOString() : null,
    taxHolidayActive: active,
    taxHolidayDaysRemaining: taxFreeDaysRemaining(user, now),
    profitShareMode: active ? "TAX_FREE" : "STANDARD_SPLIT",
    userProfitSharePercent: active ? 100 : 60,
    platformProfitSharePercent: active ? 0 : 40,
  };
}

async function applyStrategyActivationBonus(userId, tx) {
  const db = tx || prisma;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      isInvited: true,
      hasActivatedBonusStrategy: true,
      taxFreeUntil: true,
    },
  });

  if (!user?.isInvited || user.hasActivatedBonusStrategy) {
    return null;
  }

  const newTaxFreeUntil = computeStrategyBonusTaxFreeUntil(user);
  await db.user.update({
    where: { id: userId },
    data: {
      hasActivatedBonusStrategy: true,
      taxFreeUntil: newTaxFreeUntil,
    },
  });

  return newTaxFreeUntil;
}

module.exports = {
  DAY_MS,
  INVITE_TAX_FREE_DAYS,
  STRATEGY_BONUS_DAYS,
  USER_PROFIT_SHARE,
  isTaxFreeActive,
  taxFreeDaysRemaining,
  splitDailyProfit,
  inviteRegistrationTaxFields,
  computeStrategyBonusTaxFreeUntil,
  buildTaxHolidayProfile,
  applyStrategyActivationBonus,
};
