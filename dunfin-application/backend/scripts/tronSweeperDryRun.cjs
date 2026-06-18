#!/usr/bin/env node
/**
 * Safe Tron TRC20 sweeper dry-run — reads balances and estimates fees only.
 * Never broadcasts transactions.
 *
 * Usage:
 *   node scripts/tronSweeperDryRun.cjs
 *   node scripts/tronSweeperDryRun.cjs --json
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { prisma } = require("../lib/prisma.cjs");
const { TRON_STABLECOINS } = require("../lib/depositStablecoins.cjs");
const {
  isSweeperConfigured,
} = require("../cron/tronSweeper.cjs");
const {
  deriveTronWallet,
  createTronWeb,
  getTronTreasuryAddress,
  getGasFunderPrivateKey,
  sanitizeHexKey,
  getTrxBalanceTrx,
  getTrc20BalanceRaw,
} = require("../lib/tronWallet.cjs");
const { sanitizePrivateKey, DEPLOYER_KEY_IS_PLACEHOLDER } = require("../config/crypto.cjs");

const MIN_TRX_FOR_SWEEP =
  Number(process.env.TRON_SWEEP_MIN_TRX) > 0
    ? Number(process.env.TRON_SWEEP_MIN_TRX)
    : 20;

const TRX_FUEL_AMOUNT =
  Number(process.env.TRON_SWEEP_FUEL_TRX) > 0
    ? Number(process.env.TRON_SWEEP_FUEL_TRX)
    : 20;

/** Conservative TRX burn when sub-wallet has no free energy/bandwidth for TRC20 transfer. */
const EST_TRC20_SWEEP_TRX = Number(process.env.TRON_SWEEP_EST_TRX) > 0
  ? Number(process.env.TRON_SWEEP_EST_TRX)
  : 15;

const EST_TRX_FUEL_TX_TRX = 0.3;

const jsonMode = process.argv.includes("--json");
const RPC_TIMEOUT_MS = Number(process.env.TRON_DRY_RUN_TIMEOUT_MS) || 15_000;

function mask(value, { head = 4, tail = 4 } = {}) {
  const s = String(value || "").trim();
  if (!s) return "(unset)";
  if (s.length <= head + tail) return "*".repeat(s.length);
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function status(ok, detail) {
  return { ok: Boolean(ok), detail };
}

function auditEnv() {
  const tronApiKey =
    process.env.TRONGRID_API_KEY || process.env.TRON_API_KEY || "";
  const tronApiUrl = process.env.TRON_API_URL || "https://api.trongrid.io";

  const deployerSanitized = sanitizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY);
  const deployerOk = Boolean(deployerSanitized) && !DEPLOYER_KEY_IS_PLACEHOLDER;
  const mainPartner = String(process.env.MAIN_PARTNER_WALLET_ADDRESS || "").trim();
  const treasuryDedicated =
    process.env.TRON_TREASURY_ADDRESS ||
    process.env.TRON_CENTRAL_WALLET ||
    "";

  let treasuryResolved = null;
  let treasuryError = null;
  try {
    treasuryResolved = getTronTreasuryAddress();
  } catch (err) {
    treasuryError = err.message;
  }

  let gasFunderOk = false;
  let gasFunderMasked = null;
  try {
    gasFunderMasked = mask(getGasFunderPrivateKey());
    gasFunderOk = true;
  } catch {
    gasFunderMasked = mask(process.env.TRON_GAS_FUNDER_PRIVATE_KEY);
  }

  return {
    note:
      "Tron sweeper uses TRON_* env vars. DEPLOYER_PRIVATE_KEY is EVM-only; treasury is TRON_TREASURY_ADDRESS (or non-0x MAIN_PARTNER_WALLET_ADDRESS). MOTHER_WALLET_ADDRESS is not used — set TRON_TREASURY_ADDRESS.",
    evm: {
      deployerPrivateKey: status(
        deployerOk,
        deployerOk
          ? `configured (${mask(String(deployerSanitized).slice(2))})`
          : "placeholder/dummy (EVM writes disabled)"
      ),
      mainPartnerWallet: status(
        Boolean(mainPartner),
        mainPartner ? mask(mainPartner, { head: 6, tail: 6 }) : "unset"
      ),
    },
    tron: {
      apiUrl: tronApiUrl,
      apiKey: status(Boolean(tronApiKey), tronApiKey ? mask(tronApiKey) : "unset (rate limits apply)"),
      depositMasterSecret: status(
        Boolean(process.env.TRON_DEPOSIT_MASTER_SECRET),
        process.env.TRON_DEPOSIT_MASTER_SECRET
          ? mask(process.env.TRON_DEPOSIT_MASTER_SECRET)
          : "unset"
      ),
      gasFunderPrivateKey: status(gasFunderOk, gasFunderMasked),
      treasuryAddress: status(
        Boolean(treasuryResolved),
        treasuryResolved ? treasuryResolved : treasuryError || "unset"
      ),
      sweeperEnabled: process.env.TRON_SWEEPER_ENABLED !== "false",
      sweeperConfigured: isSweeperConfigured(),
      legacyDepositWarning:
        "Without TRON_DEPOSIT_MASTER_SECRET, new TRC20 addresses use legacy non-spendable derivation; the sweeper cannot sign transfers for those wallets.",
      minTrxForSweep: MIN_TRX_FOR_SWEEP,
      fuelTrxAmount: TRX_FUEL_AMOUNT,
    },
  };
}

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${RPC_TIMEOUT_MS}ms`)),
        RPC_TIMEOUT_MS
      );
    }),
  ]);
}

function formatTokenAmount(raw, decimals) {
  const divisor = 10n ** BigInt(decimals);
  return Number(raw) / Number(divisor);
}

async function loadWallets() {
  return prisma.networkDepositAddress.findMany({
    where: {
      tron: true,
      network: "TRC20",
      user: { accountActive: true },
    },
    select: {
      userId: true,
      address: true,
      network: true,
      user: { select: { username: true, uid: true } },
    },
    orderBy: { updatedAt: "asc" },
  });
}

async function inspectWallet(row, readOnlyTron) {
  let derivedAddress = null;
  let addressMatch = null;

  try {
    const derived = deriveTronWallet(row.userId, row.network);
    derivedAddress = derived.address;
    addressMatch = derived.address === row.address;
  } catch (err) {
    if (err.code !== "TRON_MASTER_SECRET_MISSING") {
      return {
        userId: row.userId,
        username: row.user?.username ?? null,
        storedAddress: row.address,
        error: err.message,
        pending: false,
      };
    }
    derivedAddress = row.address;
    addressMatch = null;
  }

  if (addressMatch === false) {
    return {
      userId: row.userId,
      username: row.user?.username ?? null,
      storedAddress: row.address,
      derivedAddress,
      addressMatch: false,
      skipped: true,
      reason: "address_mismatch_legacy",
      pending: false,
    };
  }

  const scanAddress = derivedAddress;
  let trxBalance = 0;
  let rpcError = null;
  try {
    trxBalance = await withTimeout(
      getTrxBalanceTrx(readOnlyTron, scanAddress),
      `TRX balance ${scanAddress}`
    );
  } catch (err) {
    rpcError = err.message;
  }

  const tokens = [];
  for (const token of TRON_STABLECOINS) {
    try {
      const raw = await withTimeout(
        getTrc20BalanceRaw(readOnlyTron, token.contract, scanAddress),
        `${token.symbol} balance ${scanAddress}`
      );
      const amount = formatTokenAmount(raw, token.decimals);
      if (amount > 0) {
        tokens.push({ symbol: token.symbol, amount, raw: raw.toString() });
      }
    } catch (err) {
      rpcError = rpcError || err.message;
    }
  }

  const needsFuel = trxBalance < MIN_TRX_FOR_SWEEP;
  const fuelTrxNeeded = needsFuel ? TRX_FUEL_AMOUNT : 0;
  const estimatedSweepTrxPerToken = tokens.length * EST_TRC20_SWEEP_TRX;
  const estimatedFuelTxTrx = needsFuel && tokens.length > 0 ? EST_TRX_FUEL_TX_TRX : 0;
  const estimatedTotalTrx =
    fuelTrxNeeded + estimatedFuelTxTrx + estimatedSweepTrxPerToken;

  const pending = tokens.length > 0;

  return {
    userId: row.userId,
    username: row.user?.username ?? null,
    uid: row.user?.uid ?? null,
    address: scanAddress,
    addressMatch: addressMatch ?? null,
    derivationVerified: addressMatch === true,
    trxBalance,
    tokens,
    pending,
    fees: {
      needsFuel,
      fuelTrxNeeded,
      estimatedTrc20SweepTrx: estimatedSweepTrxPerToken,
      estimatedFuelTxTrx,
      estimatedTotalTrx,
      note: "Estimates only — actual energy/bandwidth varies with chain conditions.",
    },
    rpcError,
  };
}

async function main() {
  const config = auditEnv();
  const readOnlyTron = createTronWeb();

  const wallets = await loadWallets();
  const inspections = [];

  for (const row of wallets) {
    try {
      inspections.push(await inspectWallet(row, readOnlyTron));
    } catch (err) {
      inspections.push({
        userId: row.userId,
        storedAddress: row.address,
        error: err.message,
        pending: false,
      });
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  const pendingWallets = inspections.filter((w) => w.pending);
  const rpcFailures = inspections.filter((w) => w.rpcError || w.error);
  const totalEstimatedFuelTrx = pendingWallets.reduce(
    (sum, w) => sum + (w.fees?.estimatedTotalTrx ?? 0),
    0
  );

  const report = {
    mode: "DRY_RUN",
    broadcast: false,
    timestamp: new Date().toISOString(),
    config,
    summary: {
      walletsScanned: wallets.length,
      pendingSweepCount: pendingWallets.length,
      pendingUsdtUsdc: pendingWallets.reduce(
        (sum, w) =>
          sum +
          w.tokens.reduce((t, tok) => t + tok.amount, 0),
        0
      ),
      estimatedTotalTrxRequired: totalEstimatedFuelTrx,
      rpcFailureCount: rpcFailures.length,
      safety: {
        sweeperTouchesDatabase: false,
        depositWatcherIsolated: true,
        perWalletErrorIsolation: true,
        cycleReentrancyGuard: true,
      },
    },
    pendingWallets,
    allWallets: inspections,
  };

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("=== Tron TRC20 Sweeper — DRY RUN (no broadcasts) ===\n");
  console.log(config.note);
  console.log("\n--- Config audit ---");
  console.log(
    `EVM DEPLOYER_PRIVATE_KEY: ${config.evm.deployerPrivateKey.ok ? "OK" : "WARN"} — ${config.evm.deployerPrivateKey.detail}`
  );
  console.log(
    `EVM MAIN_PARTNER_WALLET: ${config.evm.mainPartnerWallet.ok ? "OK" : "WARN"} — ${config.evm.mainPartnerWallet.detail}`
  );
  console.log(
    `Tron API (${config.tron.apiUrl}): key ${config.tron.apiKey.ok ? "OK" : "WARN"} — ${config.tron.apiKey.detail}`
  );
  console.log(
    `TRON_DEPOSIT_MASTER_SECRET: ${config.tron.depositMasterSecret.ok ? "OK" : "MISSING"} — ${config.tron.depositMasterSecret.detail}`
  );
  console.log(
    `TRON_GAS_FUNDER_PRIVATE_KEY: ${config.tron.gasFunderPrivateKey.ok ? "OK" : "MISSING"} — ${config.tron.gasFunderPrivateKey.detail}`
  );
  console.log(
    `Treasury (mother wallet): ${config.tron.treasuryAddress.ok ? "OK" : "MISSING"} — ${config.tron.treasuryAddress.detail}`
  );
  console.log(
    `Sweeper armed: ${config.tron.sweeperConfigured ? "YES" : "NO"} (TRON_SWEEPER_ENABLED=${config.tron.sweeperEnabled})`
  );

  console.log("\n--- Scan results ---");
  console.log(
    `Active TRC20 deposit wallets: ${report.summary.walletsScanned}`
  );
  console.log(`Pending sweep (token balance > 0): ${report.summary.pendingSweepCount}`);
  console.log(
    `Estimated TRX required (all pending): ~${report.summary.estimatedTotalTrxRequired.toFixed(2)} TRX`
  );
  console.log(`RPC / lookup failures: ${report.summary.rpcFailureCount}`);

  if (pendingWallets.length === 0) {
    console.log("\nNo wallets with pending TRC20 balances.");
  } else {
    console.log("\n--- Pending wallets ---");
    for (const w of pendingWallets) {
      const tokenLine = w.tokens
        .map((t) => `${t.amount} ${t.symbol}`)
        .join(", ");
      console.log(
        `• ${w.username || w.userId} (${w.address}) — ${tokenLine} | TRX: ${w.trxBalance.toFixed(4)} | est. fees ~${w.fees.estimatedTotalTrx.toFixed(2)} TRX${w.fees.needsFuel ? " (needs fuel)" : ""}`
      );
    }
  }

  if (rpcFailures.length > 0) {
    console.log("\n--- RPC / wallet errors (non-fatal in live sweeper) ---");
    for (const w of rpcFailures) {
      console.log(`• ${w.address || w.storedAddress}: ${w.rpcError || w.error}`);
    }
  }

  console.log("\n--- Safety isolation ---");
  console.log("• Sweeper never writes to user ledger / PostgreSQL balances.");
  console.log("• Per-wallet failures are caught; cycle continues.");
  console.log("• cycleRunning + per-address locks prevent overlapping sweeps.");
  console.log("• Deposit watcher credits separately; RPC errors skip cursor advance.");
  console.log("\nDry run complete — zero transactions broadcast.");
}

main()
  .catch((err) => {
    console.error("[tron-sweeper-dry-run] fatal:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
