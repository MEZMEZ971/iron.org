const { prisma } = require("../lib/prisma.cjs");
const { TRON_STABLECOINS } = require("../lib/depositStablecoins.cjs");
const {
  deriveTronWallet,
  createTronWeb,
  configureTronSigner,
  getTronTreasuryAddress,
  getGasFunderPrivateKey,
  isValidTronBase58Address,
  isValidTronContractAddress,
  isOwnerAddressError,
  fetchTrc20BalanceFromTronGrid,
  waitForTxConfirmation,
  getTrxBalanceTrx,
  getTrc20BalanceRaw,
  sleep,
} = require("../lib/tronWallet.cjs");

const MIN_TRX_FOR_SWEEP =
  Number(process.env.TRON_SWEEP_MIN_TRX) > 0
    ? Number(process.env.TRON_SWEEP_MIN_TRX)
    : 20;

const TRX_FUEL_AMOUNT =
  Number(process.env.TRON_SWEEP_FUEL_TRX) > 0
    ? Number(process.env.TRON_SWEEP_FUEL_TRX)
    : 20;

/** Minimum gap between completed sweep cycles (default 5 min). */
const MIN_CYCLE_INTERVAL_MS =
  Number(process.env.TRON_SWEEPER_MIN_INTERVAL_MS) > 0
    ? Number(process.env.TRON_SWEEPER_MIN_INTERVAL_MS)
    : 5 * 60_000;

/** Mandatory cool-down after any probe/sweep failure (default 60s). */
const FAILURE_COOLDOWN_MS =
  Number(process.env.TRON_SWEEPER_FAILURE_COOLDOWN_MS) > 0
    ? Number(process.env.TRON_SWEEPER_FAILURE_COOLDOWN_MS)
    : 60_000;

/** Delay between TronGrid balance probes to avoid CPU/RPC stampedes. */
const PROBE_DELAY_MS =
  Number(process.env.TRON_SWEEPER_PROBE_DELAY_MS) > 0
    ? Number(process.env.TRON_SWEEPER_PROBE_DELAY_MS)
    : 400;

const cycleLocks = new Set();
let cycleRunning = false;
let nextCycleAllowedAt = 0;
let circuitOpenUntil = 0;
let consecutiveFailures = 0;

function isSweeperConfigured() {
  return (
    process.env.TRON_SWEEPER_ENABLED !== "false" &&
    Boolean(process.env.TRON_DEPOSIT_MASTER_SECRET) &&
    Boolean(process.env.TRON_GAS_FUNDER_PRIVATE_KEY) &&
    Boolean(
      process.env.TRON_TREASURY_ADDRESS ||
        process.env.TRON_CENTRAL_WALLET ||
        (process.env.MAIN_PARTNER_WALLET_ADDRESS &&
          !String(process.env.MAIN_PARTNER_WALLET_ADDRESS).startsWith("0x"))
    )
  );
}

function isCooldownActive() {
  const now = Date.now();
  return now < nextCycleAllowedAt || now < circuitOpenUntil;
}

function openFailureCircuit(reason, cooldownMs = FAILURE_COOLDOWN_MS) {
  const until = Date.now() + cooldownMs;
  circuitOpenUntil = until;
  nextCycleAllowedAt = Math.max(nextCycleAllowedAt, until);
  consecutiveFailures += 1;
  console.warn(
    `[tron-sweeper] circuit open (${reason}) — pausing ${Math.round(cooldownMs / 1000)}s (failures=${consecutiveFailures})`
  );
}

function markCycleSuccess() {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
  nextCycleAllowedAt = Date.now() + MIN_CYCLE_INTERVAL_MS;
}

function validateSweeperRuntimeConfig({ treasuryAddress, funderAddress }) {
  if (!isValidTronBase58Address(treasuryAddress)) {
    return { ok: false, reason: "invalid_treasury" };
  }
  if (!isValidTronBase58Address(funderAddress)) {
    return { ok: false, reason: "invalid_owner_address" };
  }
  for (const token of TRON_STABLECOINS) {
    if (!isValidTronContractAddress(token.contract)) {
      return { ok: false, reason: `invalid_contract_${token.symbol}` };
    }
  }
  return { ok: true };
}

async function loadActiveTronDepositWallets() {
  const rows = await prisma.networkDepositAddress.findMany({
    where: {
      tron: true,
      network: "TRC20",
      user: { accountActive: true },
      address: { not: "" },
    },
    select: {
      userId: true,
      address: true,
      network: true,
    },
    orderBy: { updatedAt: "asc" },
    take:
      Number(process.env.TRON_SWEEPER_BATCH_SIZE) > 0
        ? Number(process.env.TRON_SWEEPER_BATCH_SIZE)
        : 25,
  });

  return rows.filter((row) => isValidTronBase58Address(row.address));
}

async function probeTokenBalance(holderAddress, token) {
  if (!isValidTronBase58Address(holderAddress)) {
    return { ok: false, reason: "invalid_holder", raw: 0n };
  }
  if (!isValidTronContractAddress(token.contract)) {
    return { ok: false, reason: "invalid_contract", raw: 0n };
  }

  try {
    const raw = await fetchTrc20BalanceFromTronGrid(holderAddress, token.contract);
    return { ok: true, raw };
  } catch (err) {
    return { ok: false, reason: err.message, raw: 0n, error: err };
  }
}

async function fundTrxIfNeeded({ funderTron, funderAddress, subAddress, readOnlyTron }) {
  if (!isValidTronBase58Address(subAddress) || !isValidTronBase58Address(funderAddress)) {
    const err = new Error("Missing or invalid owner_address for TRX fuel transfer");
    err.code = "TRON_OWNER_ADDRESS_MISSING";
    throw err;
  }

  const balanceTrx = await getTrxBalanceTrx(readOnlyTron, subAddress);
  if (balanceTrx >= MIN_TRX_FOR_SWEEP) {
    return { funded: false, balanceTrx };
  }

  if (typeof funderTron.setAddress === "function") {
    funderTron.setAddress(funderAddress);
  }

  const fuelSun = readOnlyTron.toSun(TRX_FUEL_AMOUNT);
  const receipt = await funderTron.trx.sendTransaction(subAddress, fuelSun);
  const txId =
    receipt?.txid || receipt?.transaction?.txID || receipt?.transaction?.txid;
  if (!txId) {
    throw new Error("TRX fuel transaction did not return a tx id");
  }

  await waitForTxConfirmation(funderTron, txId);
  const afterTrx = await getTrxBalanceTrx(readOnlyTron, subAddress);
  return { funded: true, txId, balanceTrx: afterTrx };
}

async function sweepToken({
  subTron,
  signerAddress,
  treasuryAddress,
  token,
  holderAddress,
}) {
  if (!isValidTronBase58Address(signerAddress) || !isValidTronBase58Address(treasuryAddress)) {
    throw new Error("Missing or invalid owner_address for TRC20 sweep");
  }

  const rawBalance = await getTrc20BalanceRaw(
    subTron,
    token.contract,
    holderAddress
  );
  if (rawBalance <= 0n) {
    return { swept: false, amount: 0, symbol: token.symbol };
  }

  if (typeof subTron.setAddress === "function") {
    subTron.setAddress(signerAddress);
  }

  const contract = await subTron.contract().at(token.contract);
  const receipt = await contract.transfer(treasuryAddress, rawBalance).send({
    feeLimit: 100_000_000,
    callValue: 0,
    shouldPollResponse: true,
    from: signerAddress,
  });

  const txId =
    receipt?.txid ||
    receipt?.transaction?.txID ||
    receipt?.transaction?.txid ||
    receipt;

  const divisor = 10n ** BigInt(token.decimals);
  const amount = Number(rawBalance) / Number(divisor);

  return {
    swept: true,
    amount,
    symbol: token.symbol,
    txId: String(txId),
    rawBalance: rawBalance.toString(),
  };
}

function validateWalletRow(row) {
  if (!row?.userId || !row?.network) {
    return { ok: false, reason: "missing_user_or_network" };
  }
  if (!isValidTronBase58Address(row.address)) {
    return { ok: false, reason: "invalid_address" };
  }
  return { ok: true };
}

async function sweepWalletRow(row, context) {
  const validation = validateWalletRow(row);
  if (!validation.ok) {
    return { skipped: true, reason: validation.reason };
  }

  const lockKey = `${row.userId}:${row.network}:${row.address}`;
  if (cycleLocks.has(lockKey)) {
    return { skipped: true, reason: "locked" };
  }

  cycleLocks.add(lockKey);
  try {
    let derivedAddress;
    let subTron;

    try {
      const derived = deriveTronWallet(row.userId, row.network);
      derivedAddress = derived.address;
      subTron = derived.tronWeb;
    } catch (err) {
      return { skipped: true, reason: "derivation_failed", error: err.message };
    }

    if (derivedAddress !== row.address) {
      return { skipped: true, reason: "address_mismatch" };
    }

    let hasTokenBalance = false;

    for (const token of TRON_STABLECOINS) {
      await sleep(PROBE_DELAY_MS);

      const probe = await probeTokenBalance(derivedAddress, token);
      if (!probe.ok) {
        const fatal = probe.error && isOwnerAddressError(probe.error);
        if (fatal) {
          openFailureCircuit("owner_address_probe");
        }
        return {
          skipped: true,
          reason: "probe_failed",
          error: probe.reason,
          token: token.symbol,
        };
      }

      if (probe.raw > 0n) {
        hasTokenBalance = true;
        break;
      }
    }

    if (!hasTokenBalance) {
      return { skipped: true, reason: "zero_balance" };
    }

    const fuel = await fundTrxIfNeeded({
      funderTron: context.funderTron,
      funderAddress: context.funderAddress,
      subAddress: derivedAddress,
      readOnlyTron: context.readOnlyTron,
    });

    if (fuel.funded) {
      console.log(
        `[tron-sweeper] funded ${derivedAddress} with ${TRX_FUEL_AMOUNT} TRX (tx=${fuel.txId})`
      );
      await sleep(2_000);
    }

    const sweeps = [];
    for (const token of TRON_STABLECOINS) {
      try {
        const result = await sweepToken({
          subTron,
          signerAddress: derivedAddress,
          treasuryAddress: context.treasuryAddress,
          token,
          holderAddress: derivedAddress,
        });
        if (result.swept) {
          sweeps.push(result);
          console.log(
            `[tron-sweeper] swept ${result.amount} ${result.symbol} from ${derivedAddress} → treasury (tx=${result.txId})`
          );
        }
      } catch (err) {
        if (isOwnerAddressError(err)) {
          openFailureCircuit("owner_address_sweep");
          return {
            skipped: true,
            reason: "sweep_owner_address",
            error: err.message,
            token: token.symbol,
          };
        }
        console.warn(
          `[tron-sweeper] sweep ${token.symbol} failed for ${derivedAddress}:`,
          err.message
        );
      }
    }

    return {
      address: derivedAddress,
      userId: row.userId,
      fuelTx: fuel.funded ? fuel.txId : null,
      sweeps,
    };
  } catch (err) {
    if (isOwnerAddressError(err)) {
      openFailureCircuit("owner_address_wallet");
    }
    return {
      skipped: true,
      address: row.address,
      userId: row.userId,
      error: err.message,
    };
  } finally {
    cycleLocks.delete(lockKey);
  }
}

async function runTronSweepCycle() {
  if (!isSweeperConfigured()) {
    return { enabled: false, scanned: 0, swept: 0 };
  }

  if (isCooldownActive()) {
    return {
      skipped: true,
      reason: "cooldown",
      retryAfterMs: Math.max(nextCycleAllowedAt, circuitOpenUntil) - Date.now(),
    };
  }

  if (cycleRunning) {
    return { skipped: true, reason: "cycle_running" };
  }

  cycleRunning = true;
  const startedAt = Date.now();

  try {
    const treasuryAddress = getTronTreasuryAddress();
    const funderKey = getGasFunderPrivateKey();
    const readOnlyTron = createTronWeb();
    const funderTron = createTronWeb({ privateKey: funderKey });
    const funderAddress = configureTronSigner(funderTron, funderKey);

    const configCheck = validateSweeperRuntimeConfig({
      treasuryAddress,
      funderAddress,
    });
    if (!configCheck.ok) {
      openFailureCircuit(configCheck.reason, FAILURE_COOLDOWN_MS);
      return { enabled: true, skipped: true, reason: configCheck.reason };
    }

    const wallets = await loadActiveTronDepositWallets();
    let sweptWallets = 0;
    let skipped = 0;
    const results = [];

    for (const row of wallets) {
      if (isCooldownActive()) {
        break;
      }

      const outcome = await sweepWalletRow(row, {
        treasuryAddress,
        funderTron,
        funderAddress,
        readOnlyTron,
      });
      results.push(outcome);

      if (outcome.sweeps?.length) sweptWallets += 1;
      if (outcome.skipped) skipped += 1;

      if (
        outcome.reason === "probe_failed" ||
        outcome.reason === "sweep_owner_address" ||
        outcome.reason === "owner_address"
      ) {
        break;
      }

      await sleep(PROBE_DELAY_MS);
    }

    const summary = {
      enabled: true,
      scanned: wallets.length,
      sweptWallets,
      skipped,
      treasuryAddress,
      durationMs: Date.now() - startedAt,
    };

    if (sweptWallets > 0) {
      console.log(
        `[tron-sweeper] cycle complete: swept ${sweptWallets}/${wallets.length} wallets`
      );
    }

    markCycleSuccess();
    return { ...summary, results };
  } catch (err) {
    openFailureCircuit(err.message || "cycle_failed");
    console.warn("[tron-sweeper] cycle failed:", err.message);
    return {
      enabled: true,
      error: err.message,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    cycleRunning = false;
  }
}

/** Guarded entry for cron/server — never hammers on failure. */
async function safeRunTronSweepCycle() {
  try {
    return await runTronSweepCycle();
  } catch (err) {
    openFailureCircuit(err.message || "unhandled");
    console.warn("[tron-sweeper] unhandled:", err.message);
    return { enabled: true, error: err.message };
  }
}

function getSweeperCooldownState() {
  return {
    cycleRunning,
    consecutiveFailures,
    nextCycleAllowedAt,
    circuitOpenUntil,
    cooldownActive: isCooldownActive(),
  };
}

module.exports = {
  runTronSweepCycle,
  safeRunTronSweepCycle,
  isSweeperConfigured,
  validateWalletRow,
  isValidTronBase58Address,
  getSweeperCooldownState,
  FAILURE_COOLDOWN_MS,
  MIN_CYCLE_INTERVAL_MS,
};
