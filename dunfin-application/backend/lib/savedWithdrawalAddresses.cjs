const ALLOWED_NETWORKS = new Set(["ERC20", "BEP20", "TRC20"]);

const NETWORK_FIELD = {
  ERC20: "savedWithdrawalAddressErc20",
  BEP20: "savedWithdrawalAddressBep20",
  TRC20: "savedWithdrawalAddressTrc20",
};

function savedAddressFieldForNetwork(network) {
  const key = String(network || "").toUpperCase();
  if (!ALLOWED_NETWORKS.has(key)) return null;
  return NETWORK_FIELD[key];
}

function buildSavedWithdrawalAddresses(user) {
  return {
    ERC20: user?.savedWithdrawalAddressErc20 || null,
    BEP20: user?.savedWithdrawalAddressBep20 || null,
    TRC20: user?.savedWithdrawalAddressTrc20 || null,
  };
}

function buildSavedAddressUpdate(network, address) {
  const field = savedAddressFieldForNetwork(network);
  if (!field) return null;
  const trimmed = String(address || "").trim();
  if (!trimmed || trimmed.length < 8) return null;
  return { [field]: trimmed };
}

module.exports = {
  ALLOWED_NETWORKS,
  savedAddressFieldForNetwork,
  buildSavedWithdrawalAddresses,
  buildSavedAddressUpdate,
};
