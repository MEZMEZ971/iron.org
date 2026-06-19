const { prisma } = require("./prisma.cjs");
const { trunc6 } = require("./formatNumbers.cjs");
const { decimalToNumber } = require("./userMapper.cjs");

/** @deprecated Platform profit share disabled — kept for admin historical totals only. */
async function creditPlatformTax(_amount, _tx) {
  return { credited: 0 };
}

async function getPlatformTaxCollected() {
  const row = await prisma.platformRevenueLedger.findUnique({
    where: { id: "singleton" },
  });
  return trunc6(decimalToNumber(row?.totalCollected));
}

module.exports = {
  creditPlatformTax,
  getPlatformTaxCollected,
};
