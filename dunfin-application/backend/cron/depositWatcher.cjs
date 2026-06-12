const { runEvmDepositCycle } = require("../lib/evmDepositWatcher.cjs");
const { runTronDepositCycle } = require("../lib/tronDepositWatcher.cjs");

async function runDepositWatcherCycle() {
  const [evm, tron] = await Promise.allSettled([
    runEvmDepositCycle(),
    runTronDepositCycle(),
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
