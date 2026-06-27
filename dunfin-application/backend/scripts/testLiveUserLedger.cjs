const { prisma } = require("../lib/prisma.cjs");
const { buildUserLedgerBundle, deriveBalanceSnapshot } = require("../lib/userLedgerSummary.cjs");
const { mapUserToLegacy } = require("../lib/userMapper.cjs");
const { getTradeSessionState } = require("../strategies.cjs");
const { decimalToNumber } = require("../lib/userMapper.cjs");

const LIVE_USER_ID = "user_610fe3d1d2e64bd45776a2c1";

async function main() {
  const row = await prisma.user.findUnique({
    where: { id: LIVE_USER_ID },
    include: {
      deposits: { orderBy: { createdAt: "desc" } },
      trades: { orderBy: { executedAt: "desc" } },
    },
  });

  if (!row) {
    console.error("Live user not found");
    process.exit(1);
  }

  console.log("=== RAW USER ROW ===");
  console.log({
    walletBalance: String(row.walletBalance),
    lockedCapital: String(row.lockedCapital),
    activeStrategy: row.activeStrategy,
    lastTradeTime: row.lastTradeTime?.toISOString?.() ?? row.lastTradeTime,
    tradeSessionEndsAt: row.tradeSessionEndsAt?.toISOString?.() ?? row.tradeSessionEndsAt,
    depositCount: row.deposits.length,
    tradeCount: row.trades.length,
  });

  const session = getTradeSessionState({
    lastTradeTime: row.lastTradeTime,
    tradeSessionEndsAt: row.tradeSessionEndsAt,
    lockedCapital: decimalToNumber(row.lockedCapital),
  });
  console.log("\n=== TRADE SESSION ===", session);

  const legacy = mapUserToLegacy({
    ...row,
    referredById: null,
    referralCode: row.referralCode,
    networkAddresses: [],
  });

  console.log("\n=== LEGACY MAP ===", {
    walletBalance: legacy.walletBalance,
    lockedCapital: legacy.lockedCapital,
    last_trade_time: legacy.last_trade_time,
    tradeSessionEndsAt: legacy.tradeSessionEndsAt,
    tradeHistoryLen: legacy.tradeHistory?.length,
  });

  const snap = deriveBalanceSnapshot(legacy);
  console.log("\n=== deriveBalanceSnapshot ===", snap);

  try {
    const bundle = await buildUserLedgerBundle(LIVE_USER_ID, legacy, { skipCache: true });
    console.log("\n=== buildUserLedgerBundle ===", JSON.stringify(bundle, null, 2));
  } catch (err) {
    console.error("\n=== buildUserLedgerBundle FAILED ===", err);
  }

  const { buildFallbackLedgerBundle } = require("../lib/userLedgerSummary.cjs");
  console.log("\n=== buildFallbackLedgerBundle ===", buildFallbackLedgerBundle(legacy));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
