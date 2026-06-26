const { prisma } = require("./prisma.cjs");
const { trunc6 } = require("./formatNumbers.cjs");
const { countDownlineTeamSize } = require("../teamAnalytics.cjs");
const {
  isFundedMember,
  loadDepositTotalsByUserIds,
} = require("./depositEligibility.cjs");

const BROKER_RANK_NONE = "NONE";
const BONUS_DESC_PREFIX = "[BROKER_RANK_UPGRADE_BONUS]";
const SALARY_DESC_PREFIX = "[15_DAY_BROKER_SALARY_PAYOUT]";
const SALARY_INTERVAL_MS = 15 * 24 * 60 * 60 * 1000;

/** Bracket matrix — must match frontend `brokerProgram.ts`. */
const BROKER_TIERS = Object.freeze([
  {
    rank: "SILVER_1",
    labelEn: "Silver Broker",
    labelAr: "وسيط فضي",
    minTeamSize: 10,
    maxTeamSize: 29,
    badge: "🌟 Silver Star",
    oneTimeBonus: 30,
    salary15Day: 15,
    family: "SILVER",
  },
  {
    rank: "GOLD_1",
    labelEn: "Golden Broker 1",
    labelAr: "وسيط ذهبي 1",
    minTeamSize: 30,
    maxTeamSize: 99,
    badge: "👑 1 Golden Star",
    oneTimeBonus: 100,
    salary15Day: 30,
    family: "GOLD",
  },
  {
    rank: "GOLD_2",
    labelEn: "Golden Broker 2",
    labelAr: "وسيط ذهبي 2",
    minTeamSize: 100,
    maxTeamSize: 199,
    badge: "👑👑 2 Golden Stars",
    oneTimeBonus: 300,
    salary15Day: 100,
    family: "GOLD",
  },
  {
    rank: "GOLD_3",
    labelEn: "Golden Broker 3",
    labelAr: "وسيط ذهبي 3",
    minTeamSize: 200,
    maxTeamSize: 399,
    badge: "👑👑👑 3 Golden Stars",
    oneTimeBonus: 500,
    salary15Day: 200,
    family: "GOLD",
  },
  {
    rank: "PLATINUM_1",
    labelEn: "Platinum Broker 1",
    labelAr: "وسيط بلاتيني 1",
    minTeamSize: 400,
    maxTeamSize: 599,
    badge: "💎 1 Platinum Star",
    oneTimeBonus: 1000,
    salary15Day: 300,
    family: "PLATINUM",
  },
  {
    rank: "PLATINUM_2",
    labelEn: "Platinum Broker 2",
    labelAr: "وسيط بلاتيني 2",
    minTeamSize: 600,
    maxTeamSize: 999,
    badge: "💎💎 2 Platinum Stars",
    oneTimeBonus: 1500,
    salary15Day: 500,
    family: "PLATINUM",
  },
  {
    rank: "PLATINUM_3",
    labelEn: "Platinum Broker 3",
    labelAr: "وسيط بلاتيني 3",
    minTeamSize: 1000,
    maxTeamSize: Number.MAX_SAFE_INTEGER,
    badge: "💎💎💎 3 Platinum Stars",
    oneTimeBonus: 2000,
    salary15Day: 1000,
    family: "PLATINUM",
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
  if (teamSize < 10) return BROKER_RANK_NONE;
  for (const tier of BROKER_TIERS) {
    if (teamSize >= tier.minTeamSize && teamSize <= tier.maxTeamSize) {
      return tier.rank;
    }
  }
  return BROKER_RANK_NONE;
}

function isSalaryPayoutDue(lastSalaryPayoutAt, nowMs = Date.now()) {
  if (!lastSalaryPayoutAt) return true;
  return nowMs - lastSalaryPayoutAt.getTime() >= SALARY_INTERVAL_MS;
}

function buildReferralChildrenMap(users) {
  const map = new Map();
  for (const user of users) {
    if (!user.referredById) continue;
    if (!map.has(user.referredById)) map.set(user.referredById, []);
    map.get(user.referredById).push(user.id);
  }
  return map;
}

function countThreeGenDownline(userId, childrenMap) {
  const gen1 = childrenMap.get(userId) || [];
  const gen2 = gen1.flatMap((id) => childrenMap.get(id) || []);
  const gen3 = gen2.flatMap((id) => childrenMap.get(id) || []);
  return gen1.length + gen2.length + gen3.length;
}

function countFundedThreeGenDownline(userId, childrenMap, userById, depositTotals) {
  const isFunded = (id) => isFundedMember(userById.get(id), depositTotals);
  const gen1 = (childrenMap.get(userId) || []).filter(isFunded);
  const gen2 = gen1.flatMap((id) => (childrenMap.get(id) || []).filter(isFunded));
  const gen3 = gen2.flatMap((id) => (childrenMap.get(id) || []).filter(isFunded));
  return gen1.length + gen2.length + gen3.length;
}

async function buildBrokerIndex(users) {
  const childrenMap = buildReferralChildrenMap(users);
  const userById = new Map(users.map((user) => [user.id, user]));
  const depositTotals = await loadDepositTotalsByUserIds(users.map((user) => user.id));
  return { childrenMap, userById, depositTotals };
}

async function loadActiveUsersForBrokerIndex() {
  return prisma.user.findMany({
    where: { accountActive: true },
    select: {
      id: true,
      uid: true,
      username: true,
      displayName: true,
      referredById: true,
      brokerRank: true,
      hasDeposited: true,
      onChainBalance: true,
      walletBalance: true,
      brokerSalaryBalance: true,
      lastSalaryPayoutAt: true,
    },
  });
}

async function buildBrokerRows() {
  const users = await loadActiveUsersForBrokerIndex();
  const { childrenMap, userById, depositTotals } = await buildBrokerIndex(users);
  const nowMs = Date.now();

  const rows = [];
  for (const user of users) {
    const totalTeamCount = countFundedThreeGenDownline(
      user.id,
      childrenMap,
      userById,
      depositTotals
    );
    const brokerRank = resolveRankFromTeamSize(totalTeamCount);
    if (brokerRank === BROKER_RANK_NONE) continue;

    const tier = getTierByRank(brokerRank);
    rows.push({
      id: user.id,
      username: user.username || user.displayName || user.id,
      uid: user.uid,
      totalTeamCount,
      brokerRank,
      calculatedSalary: tier?.salary15Day ?? 0,
      badge: tier?.badge ?? null,
      labelEn: tier?.labelEn ?? null,
      labelAr: tier?.labelAr ?? null,
      family: tier?.family ?? null,
      lastSalaryPayoutAt: user.lastSalaryPayoutAt
        ? user.lastSalaryPayoutAt.toISOString()
        : null,
      salaryEligible: isSalaryPayoutDue(user.lastSalaryPayoutAt, nowMs),
    });
  }

  rows.sort((a, b) => b.totalTeamCount - a.totalTeamCount);
  return rows;
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

  if (rankIndex(targetRank) < rankIndex(currentRank)) {
    await prisma.user.update({
      where: { id: userId },
      data: { brokerRank: targetRank },
    });

    return {
      upgraded: false,
      downgraded: true,
      teamSize,
      rank: targetRank,
      broker: buildBrokerProfileSnapshot(
        teamSize,
        targetRank,
        user.lastSalaryPayoutAt
      ),
    };
  }

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
  const result = await adminPayoutBrokerSalaries({ force: false });
  return { paid: result.brokersPaid, totalAmount: result.totalUsdtPaid };
}

async function adminPayoutBrokerSalaries({ force = false } = {}) {
  const users = await loadActiveUsersForBrokerIndex();
  const { childrenMap, userById, depositTotals } = await buildBrokerIndex(users);
  const nowMs = Date.now();
  const payoutAt = new Date();

  const eligible = [];
  for (const user of users) {
    const totalTeamCount = countFundedThreeGenDownline(
      user.id,
      childrenMap,
      userById,
      depositTotals
    );
    const brokerRank = resolveRankFromTeamSize(totalTeamCount);
    if (brokerRank === BROKER_RANK_NONE) continue;

    const tier = getTierByRank(brokerRank);
    if (!tier || tier.salary15Day <= 0) continue;

    const due = force || isSalaryPayoutDue(user.lastSalaryPayoutAt, nowMs);
    if (!due) continue;

    eligible.push({
      user,
      totalTeamCount,
      brokerRank,
      salary: trunc6(tier.salary15Day),
    });
  }

  if (eligible.length === 0) {
    return {
      success: true,
      brokersPaid: 0,
      totalUsdtPaid: 0,
      paidUserIds: [],
    };
  }

  const paidUserIds = [];

  await prisma.$transaction(async (tx) => {
    for (const entry of eligible) {
      const walletBalance = trunc6(Number(entry.user.walletBalance) + entry.salary);
      const brokerSalaryBalance = trunc6(
        Number(entry.user.brokerSalaryBalance) + entry.salary
      );

      await tx.user.update({
        where: { id: entry.user.id },
        data: {
          brokerRank: entry.brokerRank,
          walletBalance,
          brokerSalaryBalance,
          lastSalaryPayoutAt: payoutAt,
        },
      });

      await tx.transactionRecord.create({
        data: {
          userId: entry.user.id,
          type: "BROKER_SALARY",
          amount: entry.salary,
          status: "SUCCESS",
          description: `${SALARY_DESC_PREFIX} ${entry.brokerRank}`,
        },
      });

      paidUserIds.push(entry.user.id);
    }
  });

  const totalUsdtPaid = trunc6(
    eligible.reduce((sum, entry) => sum + entry.salary, 0)
  );

  return {
    success: true,
    brokersPaid: paidUserIds.length,
    totalUsdtPaid,
    paidUserIds,
  };
}

module.exports = {
  BROKER_RANK_NONE,
  BROKER_TIERS,
  SALARY_INTERVAL_MS,
  SALARY_DESC_PREFIX,
  resolveRankFromTeamSize,
  getTierByRank,
  getNextTier,
  buildBrokerProfileSnapshot,
  checkAndUpgradeBrokerRank,
  propagateBrokerRankCheckFromReferral,
  processBrokerSalaryPayouts,
  buildBrokerRows,
  adminPayoutBrokerSalaries,
  isSalaryPayoutDue,
  countFundedThreeGenDownline,
  buildBrokerIndex,
  buildReferralChildrenMap,
};
