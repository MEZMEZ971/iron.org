const crypto = require("crypto");
const { keccak256, toBytes } = require("viem");
const db = require("./db.cjs");
const { normalizeCurrency, resolveForwarderNetwork } = require("./lib/depositAssets.cjs");
const { deriveTronWallet, networkUserSalt } = require("./lib/tronWallet.cjs");

const NETWORKS = Object.freeze({
  ERC20: {
    label: "ERC20 (Ethereum Network)",
    evm: true,
    tokenEnv: "USDT_ADDRESS",
  },
  BEP20: {
    label: "BEP20 (BNB Smart Chain Network)",
    evm: true,
    tokenEnv: "USDT_ADDRESS_BEP20",
  },
  TRC20: {
    label: "TRC20 (TRON Network)",
    evm: false,
  },
});

const ZERO = "0x0000000000000000000000000000000000000000";

function bytes32ForUser(userId, network) {
  return keccak256(toBytes(networkUserSalt(userId, network)));
}

/** @deprecated Legacy non-spendable derivation — pre-master-secret addresses. */
function deriveLegacyTronAddress(userId, network) {
  const payload = crypto
    .createHash("sha256")
    .update(networkUserSalt(userId, network))
    .digest();
  const addressBytes = Buffer.concat([Buffer.from([0x41]), payload.subarray(0, 20)]);
  const hash1 = crypto.createHash("sha256").update(addressBytes).digest();
  const hash2 = crypto.createHash("sha256").update(hash1).digest();
  const checksum = hash2.subarray(0, 4);
  const { default: bs58 } = require("bs58");
  return bs58.encode(Buffer.concat([addressBytes, checksum]));
}

function isTronMasterSecretConfigured() {
  return Boolean(String(process.env.TRON_DEPOSIT_MASTER_SECRET || "").trim());
}

/**
 * Require TRON_DEPOSIT_MASTER_SECRET for sweepable TRC20 deposit wallets.
 * Set TRON_ALLOW_LEGACY_DEPOSIT_ADDRESSES=true only for local dev without Tron sweep.
 */
function assertTronMasterSecretForTrc20() {
  if (isTronMasterSecretConfigured()) return;
  if (process.env.TRON_ALLOW_LEGACY_DEPOSIT_ADDRESSES === "true") {
    console.warn(
      "[deposit] TRON_ALLOW_LEGACY_DEPOSIT_ADDRESSES=true — using non-sweepable legacy TRC20 addresses"
    );
    return;
  }
  const err = new Error(
    "TRON_DEPOSIT_MASTER_SECRET is required for TRC20 deposit addresses. Configure it in backend env before assigning deposit wallets."
  );
  err.code = "TRON_MASTER_SECRET_MISSING";
  throw err;
}

function deriveSweepableTronAddress(userId, network) {
  assertTronMasterSecretForTrc20();
  if (!isTronMasterSecretConfigured()) {
    return deriveLegacyTronAddress(userId, network);
  }
  return deriveTronWallet(userId, network).address;
}

/** @deprecated Use deriveSweepableTronAddress */
function deriveTronAddress(userId, network) {
  return deriveSweepableTronAddress(userId, network);
}

function isLegacyTronDepositAddress(userId, network, storedAddress) {
  if (!storedAddress || !isTronMasterSecretConfigured()) return false;
  const sweepable = deriveTronWallet(userId, network).address;
  return sweepable !== storedAddress;
}

async function resolveEvmDepositAddress(
  userId,
  network,
  { publicClient, walletClient, factoryAddress, factoryAbi, usdtAddress }
) {
  const userIdBytes32 = bytes32ForUser(userId, network);
  const stored = await db.getNetworkDepositAddress(userId, network);
  if (stored) {
    return { address: stored, created: false, userIdBytes32 };
  }

  let forwarder = await publicClient.readContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: "userForwarders",
    args: [userIdBytes32],
  });

  if (forwarder === ZERO) {
    const hash = await walletClient.writeContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: "createForwarder",
      args: [userIdBytes32],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    forwarder = await publicClient.readContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: "userForwarders",
      args: [userIdBytes32],
    });
    await db.saveNetworkDepositAddress(userId, network, forwarder, { txHash: hash });
    if (network === "ERC20") {
      await db.saveUser(userId, forwarder);
    }
    return { address: forwarder, created: true, userIdBytes32, txHash: hash };
  }

  await db.saveNetworkDepositAddress(userId, network, forwarder);
  if (network === "ERC20") {
    await db.saveUser(userId, forwarder);
  }
  return { address: forwarder, created: false, userIdBytes32 };
}

async function resolveTrc20DepositAddress(userId, network) {
  const sweepableAddress = deriveSweepableTronAddress(userId, network);
  const stored = await db.getNetworkDepositAddress(userId, network);

  if (stored === sweepableAddress) {
    return { address: stored, created: false, upgraded: false };
  }

  if (stored && stored !== sweepableAddress) {
    await db.saveNetworkDepositAddress(userId, network, sweepableAddress, { tron: true });
    console.warn(
      `[deposit] upgraded TRC20 address for ${userId}: ${stored} -> ${sweepableAddress}`
    );
    return {
      address: sweepableAddress,
      created: false,
      upgraded: true,
      previousAddress: stored,
      tron: true,
    };
  }

  await db.saveNetworkDepositAddress(userId, network, sweepableAddress, { tron: true });
  return { address: sweepableAddress, created: true, tron: true };
}

async function getDepositAddress(userId, network, clients, currency = "USDT") {
  const requestedNetwork = String(network || "TRC20").toUpperCase();
  const net = NETWORKS[requestedNetwork];
  if (!net) {
    const err = new Error(`Unsupported network: ${requestedNetwork}`);
    err.code = "INVALID_NETWORK";
    throw err;
  }

  const asset = normalizeCurrency(currency);
  await db.getOrCreateUser(userId);

  if (net.evm) {
    const forwarderNetwork = resolveForwarderNetwork(requestedNetwork);
    const result = await resolveEvmDepositAddress(userId, forwarderNetwork, clients);

    if (requestedNetwork === "BEP20") {
      await db.saveNetworkDepositAddress(userId, "BEP20", result.address);
    }

    return {
      success: true,
      userId,
      currency: asset,
      network: requestedNetwork,
      networkLabel: net.label,
      depositAddress: result.address,
      new: result.created,
      txHash: result.txHash ?? null,
      addressType: "evm",
    };
  }

  const result = await resolveTrc20DepositAddress(userId, requestedNetwork);
  return {
    success: true,
    userId,
    currency: asset,
    network: requestedNetwork,
    networkLabel: net.label,
    depositAddress: result.address,
    new: result.created,
    txHash: null,
    addressType: "tron",
  };
}

module.exports = {
  NETWORKS,
  getDepositAddress,
  bytes32ForUser,
  networkUserSalt,
  deriveLegacyTronAddress,
  deriveSweepableTronAddress,
  isTronMasterSecretConfigured,
  isLegacyTronDepositAddress,
  assertTronMasterSecretForTrc20,
};
