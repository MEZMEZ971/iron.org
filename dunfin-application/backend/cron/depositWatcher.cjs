const { runEvmDepositCycle } = require("../lib/evmDepositWatcher.cjs");
// TRC20 incoming deposit polling disabled — deposits are ERC20/BEP20 only.
// Withdrawals still accept TRC20 payout addresses; historical TRC20 rows remain in DB.
// const { runTronDepositCycle } = require("../lib/tronDepositWatcher.cjs");

const TRON_DEPOSIT_WATCHER_ENABLED =
  process.env.TRON_DEPOSIT_WATCHER_ENABLED === "true";

async function runTronDepositCycleSafe() {
  if (!TRON_DEPOSIT_WATCHER_ENABLED) {
    return { scanned: 0, detected: 0, credited: 0, disabled: true };
  }
  const { runTronDepositCycle } = require("../lib/tronDepositWatcher.cjs");
  return runTronDepositCycle();
}

async function runDepositWatcherCycle() {
  const [evm, tron] = await Promise.allSettled([
    runEvmDepositCycle(),
    runTronDepositCycleSafe(),
  ]);

  if (evm.status === "rejected") {
    console.warn("[deposit-watcher] EVM cycle failed:", evm.reason?.message || evm.reason);
  }
  if (tron.status === "rejected") {
    console.warn("[deposit-watcher] TRON cycle failed:", tron.reason?.message || tron.reason);
  }

  return {
    evm: evm.status === "fulfilled" ? evm.value : null,
    tron: tron.status === "fulfilled" ? tron.value : null,
  };
}

module.exports = {
  runDepositWatcherCycle,
};
