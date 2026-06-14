const { prisma } = require("./prisma.cjs");
const { trunc6 } = require("./formatNumbers.cjs");
const { countDownlineTeamSize } = require("../teamAnalytics.cjs");

const BROKER_RANK_NONE = "NONE";
const BONUS_DESC_PREFIX = "[BROKER_RANK_UPGRADE_BONUS]";
const SALARY_INTERVAL_MS = 15 * 24 * 60 * 60 * 1000;

/** Ascending tier matrix — must match frontend `brokerProgram.ts`. */
const BROKER_TIERS = Object.freeze([
  {
    rank: "SILVER_1",
    labelEn: "Silver Broker",
    labelAr: "وسيط فضي",
    minTeamSize: 10,
    badge: "🌟 Silver Star",
    oneTimeBonus: 30,
    salary15Day: 15,
  },
  {
    rank: "GOLD_1",
    labelEn: "Golden Broker 1",
    labelAr: "وسيط ذهبي 1",
    minTeamSize: 30,
    badge: "👑 1 Golden Star",
    oneTimeBonus: 100,
    salary15Day: 30,
  },
  {
    rank: "GOLD_2",
    labelEn: "Golden Broker 2",
    labelAr: "وسيط ذهبي 2",
    minTeamSize: 100,
    badge: "👑👑 2 Golden Stars",
    oneTimeBonus: 300,
    salary15Day: 100,
  },
  {
    rank: "GOLD_3",
    labelEn: "Golden Broker 3",
    labelAr: "وسيط ذهبي 3",
    minTeamSize: 200,
    badge: "👑👑👑 3 Golden Stars",
    oneTimeBonus: 500,
    salary15Day: 200,
  },
  {
    rank: "PLATINUM_1",
    labelEn: "Platinum Broker 1",
    labelAr: "وسيط بلاتيني 1",
    minTeamSize: 400,
    badge: "💎 1 Platinum Star",
    oneTimeBonus: 1000,
    salary15Day: 300,
  },
  {
    rank: "PLATINUM_2",
    labelEn: "Platinum Broker 2",
    labelAr: "وسيط بلاتيني 2",
    minTeamSize: 600,
    badge: "💎💎 2 Platinum Stars",
    oneTimeBonus: 1500,
    salary15Day: 500,
  },
  {
    rank: "PLATINUM_3",
    labelEn: "Platinum Broker 3",
    labelAr: "وسيط بلاتيني 3",
    minTeamSize: 1000,
    badge: "💎💎💎 3 Platinum Stars",
    oneTimeBonus: 2000,
    salary15Day: 1000,
  },
]);

const RANK_ORDER = Object.freeze(
  [BROKER_RANK_NONE, ...BROKER_TIERS.map((t) => t.rank)].reduce(
    (acc, rank, index) => {
      acc[rank] = index;
      return acc;
    },
    {}
  )
);

function rankIndex(rank) {
  return RANK_ORDER[rank] ?? 0;
}

function resolveRankFromTeamSize(teamSize) {
  let matched = BROKER_RANK_NONE;
  for (const tier of BROKER_TIERS) {
    if (teamSize >= tier.minTeamSize) matched = tier.rank;
  }
  return matched;
}

function getTierByRank(rank) {
  return BROKER_TIERS.find((t) => t.rank === rank) ?? null;
}

function getNextTier(teamSize) {
  return BROKER_TIERS.find((t) => teamSize < t.minTeamSize) ?? null;
}

function buildBrokerProfileSnapshot(teamSize, brokerRank, lastSalaryPayoutAt) {
  const tier = getTierByRank(brokerRank);
  const nextTier = getNextTier(teamSize);
  const membersToNext = nextTier ? Math.max(0, nextTier.minTeamSize - teamSize) : 0;

  return {
    rank: brokerRank || BROKER_RANK_NONE,
    teamSize,
    badge: tier?.badge ?? null,
    labelEn: tier?.labelEn ?? null,
    labelAr: tier?.labelAr ?? null,
    oneTimeBonus: tier?.oneTimeBonus ?? 0,
    salary15Day: tier?.salary15Day ?? 0,
    nextTier: nextTier
      ? {
          rank: nextTier.rank,
          minTeamSize: nextTier.minTeamSize,
          labelEn: nextTier.labelEn,
          labelAr: nextTier.labelAr,
          membersToNext,
        }
      : null,
    lastSalaryPayoutAt: lastSalaryPayoutAt
      ? lastSalaryPayoutAt.toISOString()
      : null,
    tiers: BROKER_TIERS.map((t) => ({
      rank: t.rank,
      minTeamSize: t.minTeamSize,
      badge: t.badge,
      labelEn: t.labelEn,
      labelAr: t.labelAr,
      oneTimeBonus: t.oneTimeBonus,
      salary15Day: t.salary15Day,
      achieved: rankIndex(brokerRank) >= rankIndex(t.rank),
      current: brokerRank === t.rank,
    })),
  };
}

async function hasRankBonusBeenPaid(userId, rank, tx = prisma) {
  const row = await tx.transactionRecord.findFirst({
    where: {
      userId,
      type: "BROKER_RANK_UPGRADE_BONUS",
      description: `${BONUS_DESC_PREFIX} ${rank}`,
    },
    select: { id: true },
  });
  return Boolean(row);
}

async function checkAndUpgradeBrokerRank(userId) {
  const teamSize = await countDownlineTeamSize(userId);
  const targetRank = resolveRankFromTeamSize(teamSize);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      brokerRank: true,
      walletBalance: true,
      lastSalaryPayoutAt: true,
    },
  });
  if (!user) {
    return { upgraded: false, teamSize, rank: BROKER_RANK_NONE };
  }

  const currentRank = user.brokerRank || BROKER_RANK_NONE;
  if (rankIndex(targetRank) <= rankIndex(currentRank)) {
    return {
      upgraded: false,
      teamSize,
      rank: currentRank,
      broker: buildBrokerProfileSnapshot(
        teamSize,
        currentRank,
        user.lastSalaryPayoutAt
      ),
    };
  }

  const tiersToGrant = BROKER_TIERS.filter(
    (tier) =>
      rankIndex(tier.rank) > rankIndex(currentRank) &&
      rankIndex(tier.rank) <= rankIndex(targetRank)
  );

  let totalBonus = 0;
  const grantedRanks = [];

  await prisma.$transaction(async (tx) => {
    let walletBalance = trunc6(user.walletBalance);

    for (const tier of tiersToGrant) {
      const alreadyPaid = await hasRankBonusBeenPaid(userId, tier.rank, tx);
      if (alreadyPaid) continue;

      walletBalance = trunc6(walletBalance + tier.oneTimeBonus);
      totalBonus = trunc6(totalBonus + tier.oneTimeBonus);
      grantedRanks.push(tier.rank);

      await tx.transactionRecord.create({
        data: {
          userId,
          type: "BROKER_RANK_UPGRADE_BONUS",
          amount: tier.oneTimeBonus,
          status: "SUCCESS",
          description: `${BONUS_DESC_PREFIX} ${tier.rank}`,
        },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        brokerRank: targetRank,
        ...(totalBonus > 0 ? { walletBalance } : {}),
      },
    });
  });

  const refreshed = await prisma.user.findUnique({
    where: { id: userId },
    select: { brokerRank: true, lastSalaryPayoutAt: true },
  });

  return {
    upgraded: true,
    teamSize,
    rank: refreshed?.brokerRank ?? targetRank,
    grantedRanks,
    totalBonus,
    broker: buildBrokerProfileSnapshot(
      teamSize,
      refreshed?.brokerRank ?? targetRank,
      refreshed?.lastSalaryPayoutAt ?? user.lastSalaryPayoutAt
    ),
  };
}

async function propagateBrokerRankCheckFromReferral(newUserReferrerId) {
  if (!newUserReferrerId) return;

  let currentId = newUserReferrerId;
  for (let depth = 0; depth < 3 && currentId; depth += 1) {
    await checkAndUpgradeBrokerRank(currentId);
    const row = await prisma.user.findUnique({
      where: { id: currentId },
      select: { referredById: true },
    });
    currentId = row?.referredById ?? null;
  }
}

async function processBrokerSalaryPayouts() {
  const now = Date.now();
  const users = await prisma.user.findMany({
    where: { brokerRank: { not: BROKER_RANK_NONE } },
    select: {
      id: true,
      brokerRank: true,
      walletBalance: true,
      brokerSalaryBalance: true,
      lastSalaryPayoutAt: true,
    },
  });

  let paid = 0;
  let totalAmount = 0;

  for (const user of users) {
    const tier = getTierByRank(user.brokerRank);
    if (!tier || tier.salary15Day <= 0) continue;

    const lastAt = user.lastSalaryPayoutAt?.getTime() ?? 0;
    const due = !user.lastSalaryPayoutAt || now - lastAt >= SALARY_INTERVAL_MS;
    if (!due) continue;

    const salary = trunc6(tier.salary15Day);
    const payoutAt = new Date();

    await prisma.$transaction(async (tx) => {
      const walletBalance = trunc6(Number(user.walletBalance) + salary);
      const brokerSalaryBalance = trunc6(
        Number(user.brokerSalaryBalance) + salary
      );

      await tx.user.update({
        where: { id: user.id },
        data: {
          walletBalance,
          brokerSalaryBalance,
          lastSalaryPayoutAt: payoutAt,
        },
      });

      await tx.transactionRecord.create({
        data: {
          userId: user.id,
          type: "BROKER_SALARY",
          amount: salary,
          status: "SUCCESS",
          description: `[BROKER_SALARY] ${user.brokerRank}`,
        },
      });
    });

    paid += 1;
    totalAmount = trunc6(totalAmount + salary);
  }

  return { paid, totalAmount };
}

module.exports = {
  BROKER_RANK_NONE,
  BROKER_TIERS,
  SALARY_INTERVAL_MS,
  resolveRankFromTeamSize,
  getTierByRank,
  getNextTier,
  buildBrokerProfileSnapshot,
  checkAndUpgradeBrokerRank,
  propagateBrokerRankCheckFromReferral,
  processBrokerSalaryPayouts,
};
