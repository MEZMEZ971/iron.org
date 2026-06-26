const { prisma } = require("./prisma.cjs");
const { isActiveMember } = require("../affiliate.cjs");
const {
  isFundedMember,
  loadDepositTotalsByUserIds,
} = require("./depositEligibility.cjs");

const MEMBER_STATS_SELECT = {
  id: true,
  hasDeposited: true,
  onChainBalance: true,
  tradingCapital: true,
  lockedCapital: true,
};

function toLegacyMember(row) {
  return {
    id: row.id,
    hasDeposited: row.hasDeposited,
    onChainBalance: Number(row.onChainBalance) || 0,
    tradingCapital: Number(row.tradingCapital) || 0,
    lockedCapital: Number(row.lockedCapital) || 0,
  };
}

async function loadThreeGenDownline(rootUserId) {
  const gen1 = await prisma.user.findMany({
    where: { referredById: rootUserId },
    select: MEMBER_STATS_SELECT,
  });
  const gen1Ids = gen1.map((row) => row.id);

  const gen2 =
    gen1Ids.length > 0
      ? await prisma.user.findMany({
          where: { referredById: { in: gen1Ids } },
          select: MEMBER_STATS_SELECT,
        })
      : [];
  const gen2Ids = gen2.map((row) => row.id);

  const gen3 =
    gen2Ids.length > 0
      ? await prisma.user.findMany({
          where: { referredById: { in: gen2Ids } },
          select: MEMBER_STATS_SELECT,
        })
      : [];

  return { gen1, gen2, gen3 };
}

function countActiveMembers(rows) {
  return rows.filter((row) => isActiveMember(toLegacyMember(row))).length;
}

async function countFundedMembers(rows) {
  if (!rows.length) return 0;
  const depositTotals = await loadDepositTotalsByUserIds(rows.map((row) => row.id));
  return rows.filter((row) => isFundedMember(toLegacyMember(row), depositTotals)).length;
}

/**
 * Targeted 3-generation affiliate stats — avoids loading the full user table.
 */
async function getAffiliateNetworkFromDb(rootUserId) {
  const { gen1, gen2, gen3 } = await loadThreeGenDownline(rootUserId);
  const gen1Active = countActiveMembers(gen1);
  const gen2Active = countActiveMembers(gen2);
  const gen3Active = countActiveMembers(gen3);

  return {
    generations: {
      gen1: {
        ids: gen1.map((row) => row.id),
        activeCount: gen1Active,
        memberCount: gen1.length,
      },
      gen2: {
        ids: gen2.map((row) => row.id),
        activeCount: gen2Active,
        memberCount: gen2.length,
      },
      gen3: {
        ids: gen3.map((row) => row.id),
        activeCount: gen3Active,
        memberCount: gen3.length,
      },
    },
    totalActiveMembers: gen1Active + gen2Active + gen3Active,
    totalMembers: gen1.length + gen2.length + gen3.length,
  };
}

async function computeFundedDownlineCount(rootUserId) {
  const { gen1, gen2, gen3 } = await loadThreeGenDownline(rootUserId);
  const [f1, f2, f3] = await Promise.all([
    countFundedMembers(gen1),
    countFundedMembers(gen2),
    countFundedMembers(gen3),
  ]);
  return f1 + f2 + f3;
}

async function refreshAffiliateCache(userId) {
  const [network, fundedDownline] = await Promise.all([
    getAffiliateNetworkFromDb(userId),
    computeFundedDownlineCount(userId),
  ]);

  await prisma.user.update({
    where: { id: userId },
    data: {
      cachedActiveTeamCount: network.totalActiveMembers,
      cachedFundedDownlineCount: fundedDownline,
      affiliateStatsUpdatedAt: new Date(),
    },
  });

  return { network, fundedDownline };
}

/** Refresh upline caches (Gen 1–3 referrers) after a downline deposit or trade. */
async function propagateAffiliateCacheRefresh(fromUserId) {
  let currentId = fromUserId;
  for (let depth = 0; depth < 3; depth += 1) {
    const row = await prisma.user.findUnique({
      where: { id: currentId },
      select: { referredById: true },
    });
    const referrerId = row?.referredById;
    if (!referrerId) break;
    await refreshAffiliateCache(referrerId).catch((err) => {
      console.warn("[affiliate-stats] cache refresh failed:", err.message);
    });
    currentId = referrerId;
  }
}

module.exports = {
  getAffiliateNetworkFromDb,
  computeFundedDownlineCount,
  refreshAffiliateCache,
  propagateAffiliateCacheRefresh,
};
