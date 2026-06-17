const { prisma } = require("./lib/prisma.cjs");
const { decimalToNumber } = require("./lib/userMapper.cjs");
const { isActiveMember } = require("./affiliate.cjs");
const { trunc6 } = require("./lib/formatNumbers.cjs");
const { commissionFromCapital } = require("./teamCommission.cjs");

const MEMBER_SELECT = {
  id: true,
  uid: true,
  displayName: true,
  createdAt: true,
  hasDeposited: true,
  tradingCapital: true,
  lockedCapital: true,
};

function maskAccount(uid) {
  const s = String(uid || "");
  if (s.length <= 6) return `${s.slice(0, 2)}****`;
  return `${s.slice(0, 4)}****${s.slice(-2)}`;
}

function mapMember(row) {
  const legacy = {
    id: row.id,
    uid: row.uid,
    displayName: row.displayName,
    hasDeposited: row.hasDeposited,
    tradingCapital: decimalToNumber(row.tradingCapital),
    lockedCapital: decimalToNumber(row.lockedCapital),
    createdAt: row.createdAt.toISOString(),
  };
  return {
    account: maskAccount(row.uid),
    nickname: row.displayName || "—",
    registrationTime: row.createdAt.toISOString().slice(0, 10),
    isActive: isActiveMember(legacy),
  };
}

function generationLabel(gen) {
  return `Gen ${gen}`;
}

async function loadDownlineGenerations(rootUserId) {
  const gen1 = await prisma.user.findMany({
    where: { referredById: rootUserId },
    select: MEMBER_SELECT,
    orderBy: { createdAt: "desc" },
  });

  const gen1Ids = gen1.map((u) => u.id);
  const gen2 =
    gen1Ids.length > 0
      ? await prisma.user.findMany({
          where: { referredById: { in: gen1Ids } },
          select: MEMBER_SELECT,
          orderBy: { createdAt: "desc" },
        })
      : [];

  const gen2Ids = gen2.map((u) => u.id);
  const gen3 =
    gen2Ids.length > 0
      ? await prisma.user.findMany({
          where: { referredById: { in: gen2Ids } },
          select: MEMBER_SELECT,
          orderBy: { createdAt: "desc" },
        })
      : [];

  const gen1IdSet = new Set(gen1Ids);
  const gen2IdSet = new Set(gen2Ids);
  const gen3IdSet = new Set(gen3.map((u) => u.id));

  const resolveGeneration = (userId) => {
    if (gen1IdSet.has(userId)) return 1;
    if (gen2IdSet.has(userId)) return 2;
    if (gen3IdSet.has(userId)) return 3;
    return null;
  };

  const allIds = [...gen1Ids, ...gen2Ids, ...gen3.map((u) => u.id)];

  return {
    gen1,
    gen2,
    gen3,
    gen1IdSet,
    gen2IdSet,
    gen3IdSet,
    allIds,
    resolveGeneration,
  };
}

async function aggregateTradeMetrics(downlineIds) {
  if (!downlineIds.length) {
    return { totalTurnover: 0, dailyVolume: 0 };
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalAgg, dailyAgg] = await Promise.all([
    prisma.trade.aggregate({
      where: { userId: { in: downlineIds } },
      _sum: { capitalAmount: true },
    }),
    prisma.trade.aggregate({
      where: {
        userId: { in: downlineIds },
        executedAt: { gte: since24h },
      },
      _sum: { capitalAmount: true },
    }),
  ]);

  return {
    totalTurnover: trunc6(decimalToNumber(totalAgg._sum.capitalAmount)),
    dailyVolume: trunc6(decimalToNumber(dailyAgg._sum.capitalAmount)),
  };
}

async function aggregateRebatesByGeneration(rootUserId) {
  const grouped = await prisma.teamCommissionPayout.groupBy({
    by: ["generation"],
    where: { beneficiaryUserId: rootUserId },
    _sum: { amount: true },
  });

  const rebates = { 1: 0, 2: 0, 3: 0 };
  for (const row of grouped) {
    rebates[row.generation] = trunc6(decimalToNumber(row._sum.amount));
  }
  return rebates;
}

async function computeRebatesFromTrades(downline, resolveGeneration) {
  const rebates = { 1: 0, 2: 0, 3: 0 };
  if (!downline.allIds.length) return rebates;

  const trades = await prisma.trade.findMany({
    where: { userId: { in: downline.allIds } },
    select: { userId: true, capitalAmount: true },
  });

  for (const trade of trades) {
    const gen = resolveGeneration(trade.userId);
    if (!gen) continue;
    rebates[gen] = trunc6(
      rebates[gen] + commissionFromCapital(decimalToNumber(trade.capitalAmount), gen)
    );
  }

  return rebates;
}

async function countNewRegistrationsToday(downlineIds) {
  if (!downlineIds.length) return 0;

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  return prisma.user.count({
    where: {
      id: { in: downlineIds },
      createdAt: { gte: dayStart },
    },
  });
}

async function fetchContributionLogs(
  rootUserId,
  resolveGeneration,
  downlineIds,
  limit = 50
) {
  const payouts = await prisma.teamCommissionPayout.findMany({
    where: { beneficiaryUserId: rootUserId },
    orderBy: { executedAt: "desc" },
    take: limit,
    include: {
      sourceUser: { select: { uid: true, displayName: true } },
    },
  });

  if (payouts.length > 0) {
    return payouts.map((p) => ({
      account: maskAccount(p.sourceUser.uid),
      hierarchyLevel: generationLabel(p.generation),
      generation: p.generation,
      executionTime: p.executedAt.toISOString().replace("T", " ").slice(0, 19),
      earningsPayout: trunc6(decimalToNumber(p.amount)),
    }));
  }

  if (!downlineIds.length) return [];

  const trades = await prisma.trade.findMany({
    where: { userId: { in: downlineIds } },
    orderBy: { executedAt: "desc" },
    take: limit * 2,
    include: {
      user: { select: { id: true, uid: true, displayName: true } },
    },
  });

  const logs = [];
  for (const trade of trades) {
    const gen = resolveGeneration(trade.userId);
    if (!gen) continue;
    const amount = commissionFromCapital(
      decimalToNumber(trade.capitalAmount),
      gen
    );
    if (amount <= 0) continue;
    logs.push({
      account: maskAccount(trade.user.uid),
      hierarchyLevel: generationLabel(gen),
      generation: gen,
      executionTime: trade.executedAt
        .toISOString()
        .replace("T", " ")
        .slice(0, 19),
      earningsPayout: amount,
    });
  }

  return logs
    .sort(
      (a, b) =>
        new Date(b.executionTime).getTime() -
        new Date(a.executionTime).getTime()
    )
    .slice(0, limit);
}

function buildGenStats(rows, rebate) {
  const activeCount = rows.filter((r) =>
    isActiveMember({
      hasDeposited: r.hasDeposited,
      tradingCapital: decimalToNumber(r.tradingCapital),
      lockedCapital: decimalToNumber(r.lockedCapital),
    })
  ).length;

  return {
    rebate: trunc6(rebate),
    count: rows.length,
    activeCount,
    members: rows.map(mapMember),
  };
}

async function countDownlineTeamSize(userId) {
  const downline = await loadDownlineGenerations(userId);
  return downline.allIds.length;
}

async function getTeamAnalytics(userId) {
  const { checkAndUpgradeBrokerRank } = require("./lib/brokerProgram.cjs");

  await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true },
  });

  const rankResult = await checkAndUpgradeBrokerRank(userId);
  const downline = await loadDownlineGenerations(userId);
  const { totalTurnover, dailyVolume } = await aggregateTradeMetrics(
    downline.allIds
  );

  let rebates = await aggregateRebatesByGeneration(userId);
  const rebateTotal = rebates[1] + rebates[2] + rebates[3];
  if (rebateTotal === 0 && downline.allIds.length > 0) {
    rebates = await computeRebatesFromTrades(downline, downline.resolveGeneration);
  }

  const totalCommission = trunc6(rebates[1] + rebates[2] + rebates[3]);
  const headcount = downline.allIds.length;
  const newRegistrationsToday = await countNewRegistrationsToday(downline.allIds);

  const contributionLogs = await fetchContributionLogs(
    userId,
    downline.resolveGeneration,
    downline.allIds
  );

  return {
    userId,
    totalCommission,
    totalTurnover,
    dailyVolume,
    headcount,
    newRegistrationsToday,
    statsPerGen: {
      gen1: buildGenStats(downline.gen1, rebates[1]),
      gen2: buildGenStats(downline.gen2, rebates[2]),
      gen3: buildGenStats(downline.gen3, rebates[3]),
    },
    contributionLogs,
    broker: rankResult.broker,
  };
}

module.exports = { getTeamAnalytics, maskAccount, countDownlineTeamSize };
