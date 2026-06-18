const { prisma } = require("./prisma.cjs");
const { trunc6 } = require("./formatNumbers.cjs");

const TRIAL_AMOUNT = 100;
const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

function registrationTrialFields(now = new Date()) {
  return {
    trialBalance: TRIAL_AMOUNT,
    isTrialActive: true,
    trialExpiresAt: new Date(now.getTime() + TRIAL_DURATION_MS),
  };
}

async function recordTrialWelcomeBonus(userId, dbClient = prisma) {
  return dbClient.transactionRecord.create({
    data: {
      userId,
      type: "TRIAL_WELCOME_BONUS",
      amount: TRIAL_AMOUNT,
      status: "SUCCESS",
      description: "3-day welcome trial — 100 USDT trading credit (non-withdrawable)",
    },
  });
}

/**
 * Persists trial fields + immutable ledger row in the same DB transaction as signup.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} userId
 */
async function grantRegistrationTrial(userId, tx) {
  const fields = registrationTrialFields();
  await tx.user.update({
    where: { id: userId },
    data: fields,
  });
  await recordTrialWelcomeBonus(userId, tx);
  return fields;
}

function isTrialCurrentlyActive(user, now = new Date()) {
  if (!user?.isTrialActive) return false;

  const trial = trunc6(user?.trialBalance);
  if (trial <= 0) return false;

  if (user.trialExpiresAt) {
    const expiresAt =
      user.trialExpiresAt instanceof Date
        ? user.trialExpiresAt
        : new Date(user.trialExpiresAt);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime()) {
      return false;
    }
  }

  return true;
}

function getEffectiveTradingBalance(user, now = new Date()) {
  const wallet = trunc6(user?.walletBalance);
  if (!isTrialCurrentlyActive(user, now)) return wallet;
  return trunc6(wallet + (user.trialBalance ?? 0));
}

/** Real funds only — trial balance is never withdrawable. */
function getWithdrawableBalance(user) {
  return trunc6(user?.walletBalance);
}

/**
 * Allocate trade capital: consume trial balance first, then wallet.
 * lockedTrialCapital tracks non-withdrawable trial principal in escrow.
 */
function splitTradeCapitalDeduction(user, capitalAmount, now = new Date()) {
  const capital = trunc6(capitalAmount);
  const wallet = trunc6(user?.walletBalance);
  const trial = isTrialCurrentlyActive(user, now) ? trunc6(user?.trialBalance) : 0;
  const fromTrial = trunc6(Math.min(trial, capital));
  const fromWallet = trunc6(capital - fromTrial);
  return {
    trialBalance: trunc6(trial - fromTrial),
    walletBalance: trunc6(wallet - fromWallet),
    lockedTrialCapital: fromTrial,
  };
}

async function evictTrialBalance(userId, dbClient = prisma) {
  const user = await dbClient.user.findUnique({
    where: { id: userId },
    select: { isTrialActive: true, trialBalance: true },
  });
  if (!user) return { evicted: false };

  if (!user.isTrialActive && trunc6(user.trialBalance) <= 0) {
    return { evicted: false };
  }

  await dbClient.user.update({
    where: { id: userId },
    data: {
      trialBalance: 0,
      isTrialActive: false,
    },
  });

  return { evicted: true };
}

async function expireDueTrials() {
  const now = new Date();
  const due = await prisma.user.findMany({
    where: {
      isTrialActive: true,
      trialExpiresAt: { lte: now },
    },
    select: { id: true },
  });

  let evicted = 0;
  for (const row of due) {
    const result = await evictTrialBalance(row.id);
    if (result.evicted) evicted += 1;
  }

  return { checked: due.length, evicted };
}

module.exports = {
  TRIAL_AMOUNT,
  TRIAL_DURATION_MS,
  registrationTrialFields,
  recordTrialWelcomeBonus,
  grantRegistrationTrial,
  isTrialCurrentlyActive,
  getEffectiveTradingBalance,
  getWithdrawableBalance,
  splitTradeCapitalDeduction,
  evictTrialBalance,
  expireDueTrials,
};
