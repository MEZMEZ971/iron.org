const SUPPORTED_CURRENCIES = new Set(["USDT", "USDC"]);

function normalizeCurrency(currency) {
  const value = String(currency || "USDT").trim().toUpperCase();
  return SUPPORTED_CURRENCIES.has(value) ? value : "USDT";
}

/** EVM forwarder networks share the same CREATE2 deployment on Ethereum mainnet. */
function resolveForwarderNetwork(network) {
  if (network === "BEP20") return "ERC20";
  return network;
}

module.exports = {
  SUPPORTED_CURRENCIES,
  normalizeCurrency,
  resolveForwarderNetwork,
};
