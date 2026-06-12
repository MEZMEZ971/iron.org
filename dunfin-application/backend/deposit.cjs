const crypto = require("crypto");
const { keccak256, toBytes } = require("viem");
const db = require("./db.cjs");
const { normalizeCurrency, resolveForwarderNetwork } = require("./lib/depositAssets.cjs");

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

function networkUserSalt(userId, network) {
  return `${userId}::${network}`;
}

function bytes32ForUser(userId, network) {
  return keccak256(toBytes(networkUserSalt(userId, network)));
}

function deriveTronAddress(userId, network) {
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
  const stored = await db.getNetworkDepositAddress(userId, network);
  if (stored) {
    return { address: stored, created: false };
  }
  const address = deriveTronAddress(userId, network);
  await db.saveNetworkDepositAddress(userId, network, address, { tron: true });
  return { address, created: true, tron: true };
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
};
