const { prisma } = require("./prisma.cjs");
const { trunc6 } = require("./formatNumbers.cjs");

const LEDGER_ID = "main";

async function creditPlatformTax(amount, tx) {
  const db = tx || prisma;
  const value = trunc6(amount);
  if (value <= 0) return 0;

  await db.platformRevenueLedger.upsert({
    where: { id: LEDGER_ID },
    create: { id: LEDGER_ID, totalCollected: value },
    update: { totalCollected: { increment: value } },
  });

  return value;
}

async function getPlatformTaxCollected() {
  const row = await prisma.platformRevenueLedger.findUnique({
    where: { id: LEDGER_ID },
  });
  return trunc6(row?.totalCollected);
}

module.exports = {
  creditPlatformTax,
  getPlatformTaxCollected,
};
