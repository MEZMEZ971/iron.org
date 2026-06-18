const { prisma } = require("../lib/prisma.cjs");

async function main() {
  const recent = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      username: true,
      createdAt: true,
      trialBalance: true,
      isTrialActive: true,
      trialExpiresAt: true,
      walletBalance: true,
    },
  });

  const bonusCount = await prisma.transactionRecord.count({
    where: { type: "TRIAL_WELCOME_BONUS" },
  });

  console.log(JSON.stringify({ bonusCount, recent }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
