const db = require("../db.cjs");
const { trunc6 } = require("./formatNumbers.cjs");
const {
  findUserByDepositDestination,
  listMonitoredDepositDestinations,
} = require("./depositAddressIndex.cjs");
const { TRON_STABLECOINS } = require("./depositStablecoins.cjs");

const TRON_API_BASE = (
  process.env.TRON_API_URL || "https://api.trongrid.io"
).replace(/\/+$/, "");
const TRON_API_KEY =99701d12-6304-4aa1-9da8-37a368fc25fa
  process.env.TRONGRID_API_KEY || process.env.TRON_API_KEY || "";
const LOOKBACK_MS =
  Number(process.env.DEPOSIT_WATCHER_LOOKBACK_MS) || 24 * 60 * 60 * 1000;

const lastSeenByKey = new Map();

function tronHeaders() {
  const headers = { Accept: "application/json" };
  if (TRON_API_KEY) headers["TRON-PRO-API-KEY"] = TRON_API_KEY;
  return headers;
}

function parseTrc20Amount(value, decimals = 6) {
  const raw = BigInt(String(value || "0"));
  return trunc6(Number(raw) / 10 ** decimals);
}

async function fetchIncomingTrc20Transfers(address, contractAddress, minTimestamp) {
  const params = new URLSearchParams({
    limit: "50",
    contract_address: contractAddress,
    only_to: "true",
    min_timestamp: String(minTimestamp),
  });

  const url = `${TRON_API_BASE}/v1/accounts/${encodeURIComponent(address)}/transactions/trc20?${params}`;
  const res = await fetch(url, { headers: tronHeaders() });
  if (!res.ok) {
    throw new Error(`TronGrid ${res.status} for ${address}`);
  }

  const body = await res.json();
  const rows = Array.isArray(body?.data) ? body.data : [];
  return rows.filter((row) => String(row.to).trim() === address);
}

/**
 * Poll TronGrid for USDT + USDC (TRC20) transfers to permanent deposit addresses.
 */
async function runTronDepositCycle() {
  const destinations = (await listMonitoredDepositDestinations()).filter(
    (row) => row.tron || row.network === "TRC20"
  );

  let detected = 0;
  let credited = 0;
  const now = Date.now();

  for (const destination of destinations) {
    const address = destination.address;

    for (const token of TRON_STABLECOINS) {
      const cursorKey = `${address}:${token.contract}`;
      const baseline = lastSeenByKey.get(cursorKey) ?? now - LOOKBACK_MS;
      let maxTimestamp = baseline;

      let transfers = [];
      try {
        transfers = await fetchIncomingTrc20Transfers(
          address,
          token.contract,
          baseline
        );
      } catch (err) {
        console.warn(
          `[deposit-watcher][tron] poll ${token.symbol} failed for ${address}:`,
          err.message
        );
        continue;
      }

      for (const transfer of transfers) {
        const txId = String(transfer.transaction_id || "").trim();
        const toAddress = String(transfer.to || "").trim();
        const amount = parseTrc20Amount(transfer.value, token.decimals);
        const blockTimestamp = Number(transfer.block_timestamp || 0);

        if (blockTimestamp > maxTimestamp) maxTimestamp = blockTimestamp;
        if (!txId || amount <= 0) continue;

        const owner = await findUserByDepositDestination(toAddress);
        if (!owner || owner.userId !== destination.userId) continue;

        detected += 1;
        const before = await db.getUser(destination.userId);
        await db.recordDeposit(destination.userId, {
          amount,
          txHash: txId,
          network: "TRC20",
        });
        const after = await db.getUser(destination.userId);
        if ((after?.walletBalance ?? 0) > (before?.walletBalance ?? 0)) {
          credited += 1;
          console.log(
            `[deposit-watcher][tron] credited ${amount} ${token.symbol} to ${destination.userId} from ${toAddress} tx=${txId}`
          );
        }
      }

      lastSeenByKey.set(cursorKey, maxTimestamp + 1);
    }
  }

  return { scanned: destinations.length, detected, credited };
}

module.exports = {
  runTronDepositCycle,
};
