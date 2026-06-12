const { formatUnits } = require("viem");
const db = require("../db.cjs");
const {
  ACTIVE_FACTORY_ADDRESS,
  ERC20_ABI,
  FACTORY_ABI,
  getBlockchainClients,
} = require("../config/crypto.cjs");
const { trunc6 } = require("./formatNumbers.cjs");
const { listMonitoredDepositDestinations } = require("./depositAddressIndex.cjs");
const { EVM_STABLECOINS } = require("./depositStablecoins.cjs");

const FORWARDER_FLUSH_ABI = [
  {
    type: "function",
    name: "flushToken",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenAddress", type: "address" }],
    outputs: [],
  },
];

async function readTokenBalance(
  publicClient,
  forwarderAddress,
  tokenAddress,
  decimals = 6
) {
  const raw = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [forwarderAddress],
  });
  return trunc6(Number(formatUnits(raw, decimals)));
}

async function flushForwarderToTreasury(
  walletClient,
  publicClient,
  forwarderAddress,
  tokenAddress
) {
  try {
    const hash = await walletClient.writeContract({
      address: ACTIVE_FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "batchFlushTokens",
      args: [[forwarderAddress], tokenAddress],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch {
    const hash = await walletClient.writeContract({
      address: forwarderAddress,
      abi: FORWARDER_FLUSH_ABI,
      functionName: "flushToken",
      args: [tokenAddress],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }
}

function uniqueEvmDestinations(rows) {
  const seen = new Set();
  const unique = [];

  for (const row of rows) {
    if (row.tron) continue;
    if (row.network !== "ERC20" && row.network !== "BEP20") continue;
    const key = String(row.address).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return unique;
}

/**
 * Poll EVM forwarder balances for USDT + USDC, credit users, sweep to treasury.
 */
async function runEvmDepositCycle() {
  const { publicClient, walletClient } = getBlockchainClients();
  const destinations = uniqueEvmDestinations(
    await listMonitoredDepositDestinations()
  );

  let processed = 0;
  let swept = 0;

  for (const destination of destinations) {
    let totalStable = 0;
    const tokenBalances = [];

    for (const token of EVM_STABLECOINS) {
      const balance = await readTokenBalance(
        publicClient,
        destination.address,
        token.address,
        token.decimals
      );
      if (balance > 0) {
        totalStable += balance;
        tokenBalances.push({ token, balance });
      }
    }

    if (totalStable <= 0) continue;

    await db.setWalletBalanceFromChain(destination.userId, totalStable);
    processed += 1;

    for (const { token, balance } of tokenBalances) {
      try {
        const sweepTx = await flushForwarderToTreasury(
          walletClient,
          publicClient,
          destination.address,
          token.address
        );
        swept += 1;
        console.log(
          `[deposit-watcher][evm] swept ${balance} ${token.symbol} from ${destination.address} for ${destination.userId} tx=${sweepTx}`
        );
      } catch (err) {
        console.warn(
          `[deposit-watcher][evm] flush ${token.symbol} failed for ${destination.address}:`,
          err.message
        );
      }
    }
  }

  return { scanned: destinations.length, credited: processed, swept };
}

module.exports = {
  runEvmDepositCycle,
  readTokenBalance,
  flushForwarderToTreasury,
};
