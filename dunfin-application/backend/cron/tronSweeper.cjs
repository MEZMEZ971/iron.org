const { prisma } = require("../lib/prisma.cjs");
const { TRON_STABLECOINS } = require("../lib/depositStablecoins.cjs");
const {
  deriveTronWallet,
  createTronWeb,
  getTronTreasuryAddress,
  getGasFunderPrivateKey,
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

const cycleLocks = new Set();
let cycleRunning = false;

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

async function loadActiveTronDepositWallets() {
  const rows = await prisma.networkDepositAddress.findMany({
    where: {
      tron: true,
      network: "TRC20",
      user: { accountActive: true },
    },
    select: {
      userId: true,
      address: true,
      network: true,
    },
    orderBy: { updatedAt: "asc" },
  });
  return rows;
}

async function fundTrxIfNeeded({ funderTron, subAddress, readOnlyTron }) {
  const balanceTrx = await getTrxBalanceTrx(readOnlyTron, subAddress);
  if (balanceTrx >= MIN_TRX_FOR_SWEEP) {
    return { funded: false, balanceTrx };
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
  treasuryAddress,
  token,
  holderAddress,
}) {
  const rawBalance = await getTrc20BalanceRaw(
    subTron,
    token.contract,
    holderAddress
  );
  if (rawBalance <= 0n) {
    return { swept: false, amount: 0, symbol: token.symbol };
  }

  const contract = await subTron.contract().at(token.contract);
  const receipt = await contract.transfer(treasuryAddress, rawBalance).send({
    feeLimit: 100_000_000,
    callValue: 0,
    shouldPollResponse: true,
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

async function sweepWalletRow(row, context) {
  const lockKey = `${row.userId}:${row.network}:${row.address}`;
  if (cycleLocks.has(lockKey)) {
    return { skipped: true, reason: "locked" };
  }

  cycleLocks.add(lockKey);
  try {
    const { address: derivedAddress, privateKey, tronWeb: subTron } =
      deriveTronWallet(row.userId, row.network);

    if (derivedAddress !== row.address) {
      console.warn(
        `[tron-sweeper] skip ${row.address}: stored address does not match derived wallet (legacy deposit address)`
      );
      return { skipped: true, reason: "address_mismatch" };
    }

    const readOnlyTron = context.readOnlyTron;
    let hasTokenBalance = false;

    for (const token of TRON_STABLECOINS) {
      const raw = await getTrc20BalanceRaw(
        readOnlyTron,
        token.contract,
        derivedAddress
      );
      if (raw > 0n) {
        hasTokenBalance = true;
        break;
      }
    }

    if (!hasTokenBalance) {
      return { skipped: true, reason: "zero_balance" };
    }

    const fuel = await fundTrxIfNeeded({
      funderTron: context.funderTron,
      subAddress: derivedAddress,
      readOnlyTron,
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
  } finally {
    cycleLocks.delete(lockKey);
  }
}

async function runTronSweepCycle() {
  if (!isSweeperConfigured()) {
    return { enabled: false, scanned: 0, swept: 0 };
  }

  if (cycleRunning) {
    console.log("[tron-sweeper] skip: previous cycle still running");
    return { skipped: true, reason: "cycle_running" };
  }

  cycleRunning = true;
  const startedAt = Date.now();

  try {
    const treasuryAddress = getTronTreasuryAddress();
    const funderKey = getGasFunderPrivateKey();
    const readOnlyTron = createTronWeb();
    const funderTron = createTronWeb({ privateKey: funderKey });

    const wallets = await loadActiveTronDepositWallets();
    let sweptWallets = 0;
    let skipped = 0;
    const results = [];

    for (const row of wallets) {
      try {
        const outcome = await sweepWalletRow(row, {
          treasuryAddress,
          funderTron,
          readOnlyTron,
        });
        results.push(outcome);
        if (outcome.sweeps?.length) sweptWallets += 1;
        if (outcome.skipped) skipped += 1;
      } catch (err) {
        console.warn(
          `[tron-sweeper] wallet ${row.address} failed:`,
          err.message
        );
        results.push({
          address: row.address,
          userId: row.userId,
          error: err.message,
        });
      }
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

    return { ...summary, results };
  } finally {
    cycleRunning = false;
  }
}

module.exports = {
  runTronSweepCycle,
  isSweeperConfigured,
};
