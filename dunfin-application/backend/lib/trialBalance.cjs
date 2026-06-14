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

function getEffectiveTradingBalance(user) {
  const wallet = trunc6(user?.walletBalance);
  if (!user?.isTrialActive) return wallet;
  return trunc6(wallet + (user.trialBalance ?? 0));
}

/** Real funds only — trial balance is never withdrawable. */
function getWithdrawableBalance(user) {
  return trunc6(user?.walletBalance);
}

/**
 * Allocate trade capital: consume trial balance first, then wallet.
 */
function splitTradeCapitalDeduction(user, capitalAmount) {
  const capital = trunc6(capitalAmount);
  const wallet = trunc6(user?.walletBalance);
  const trial = user?.isTrialActive ? trunc6(user?.trialBalance) : 0;
  const fromTrial = trunc6(Math.min(trial, capital));
  const fromWallet = trunc6(capital - fromTrial);
  return {
    trialBalance: trunc6(trial - fromTrial),
    walletBalance: trunc6(wallet - fromWallet),
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
  getEffectiveTradingBalance,
  getWithdrawableBalance,
  splitTradeCapitalDeduction,
  evictTrialBalance,
  expireDueTrials,
};
