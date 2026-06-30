const crypto = require("crypto");
const { TronWeb } = require("tronweb");

const TRON_API_BASE = (
  process.env.TRON_API_URL || "https://api.trongrid.io"
).replace(/\/+$/, "");

const TRON_API_KEY =
  process.env.TRONGRID_API_KEY || process.env.TRON_API_KEY || "";

const TRON_BASE58_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

function networkUserSalt(userId, network) {
  return `${userId}::${network}`;
}

function tronHeaders() {
  const headers = {};
  if (TRON_API_KEY) headers["TRON-PRO-API-KEY"] = TRON_API_KEY;
  return headers;
}

function sanitizeHexKey(raw) {
  let key = String(raw || "").trim();
  if (key.startsWith("0x") || key.startsWith("0X")) key = key.slice(2);
  if (key.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(key)) {
    return null;
  }
  return key.toLowerCase();
}

function isValidTronBase58Address(address) {
  const value = String(address || "").trim();
  return TRON_BASE58_RE.test(value);
}

/**
 * Ensures TronWeb has a signer address before contract/TRX writes (fixes owner_address errors).
 */
function configureTronSigner(tronWeb, privateKey) {
  const key = sanitizeHexKey(privateKey);
  if (!key) {
    const err = new Error("Invalid Tron private key for signer configuration");
    err.code = "TRON_SIGNER_INVALID";
    throw err;
  }

  if (typeof tronWeb.setPrivateKey === "function") {
    tronWeb.setPrivateKey(key);
  }

  const address = tronWeb.address.fromPrivateKey(key);
  if (!address || !isValidTronBase58Address(address)) {
    const err = new Error("Could not derive a valid Tron signer address");
    err.code = "TRON_SIGNER_ADDRESS_MISSING";
    throw err;
  }

  if (typeof tronWeb.setAddress === "function") {
    tronWeb.setAddress(address);
  }

  return address;
}

/**
 * Deterministic Tron deposit wallet from TRON_DEPOSIT_MASTER_SECRET.
 * Private keys are derived on demand and never persisted to the database.
 */
function deriveTronWallet(userId, network = "TRC20") {
  const secret = String(process.env.TRON_DEPOSIT_MASTER_SECRET || "").trim();
  if (!secret) {
    const err = new Error("TRON_DEPOSIT_MASTER_SECRET is not configured");
    err.code = "TRON_MASTER_SECRET_MISSING";
    throw err;
  }

  const privateKey = crypto
    .createHmac("sha256", secret)
    .update(networkUserSalt(userId, network))
    .digest("hex");

  const tronWeb = createTronWeb({ privateKey });
  const address = configureTronSigner(tronWeb, privateKey);
  return { address, privateKey, tronWeb };
}

function createTronWeb({ privateKey } = {}) {
  const options = {
    fullHost: TRON_API_BASE,
    headers: tronHeaders(),
  };
  const tronWeb = new TronWeb(options);
  if (privateKey) {
    configureTronSigner(tronWeb, privateKey);
  }
  return tronWeb;
}

function getTronTreasuryAddress() {
  const dedicated =
    process.env.TRON_TREASURY_ADDRESS ||
    process.env.TRON_CENTRAL_WALLET ||
    "";
  if (dedicated.trim()) return dedicated.trim();

  const main = String(process.env.MAIN_PARTNER_WALLET_ADDRESS || "").trim();
  if (main && !main.startsWith("0x")) return main;

  const err = new Error(
    "Tron treasury address not configured. Set TRON_TREASURY_ADDRESS or a Tron-format MAIN_PARTNER_WALLET_ADDRESS."
  );
  err.code = "TRON_TREASURY_MISSING";
  throw err;
}

function getGasFunderPrivateKey() {
  const key = sanitizeHexKey(process.env.TRON_GAS_FUNDER_PRIVATE_KEY);
  if (!key) {
    const err = new Error("TRON_GAS_FUNDER_PRIVATE_KEY is missing or invalid");
    err.code = "TRON_GAS_FUNDER_MISSING";
    throw err;
  }
  return key;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTxConfirmation(tronWeb, txId, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const info = await tronWeb.trx.getTransactionInfo(txId);
      if (info && Object.keys(info).length > 0 && info.id) {
        if (info.receipt && info.receipt.result === "FAILED") {
          throw new Error(`Transaction failed on-chain: ${txId}`);
        }
        return info;
      }
    } catch (err) {
      if (err.message?.includes("failed on-chain")) throw err;
    }
    await sleep(3_000);
  }
  throw new Error(`Transaction confirmation timeout: ${txId}`);
}

async function getTrxBalanceTrx(tronWeb, address) {
  if (!isValidTronBase58Address(address)) {
    const err = new Error("Invalid Tron address for balance lookup");
    err.code = "TRON_ADDRESS_INVALID";
    throw err;
  }
  const sun = await tronWeb.trx.getBalance(address);
  return Number(sun) / 1_000_000;
}

async function getTrc20BalanceRaw(tronWeb, contractAddress, holderAddress) {
  if (!isValidTronBase58Address(holderAddress)) {
    const err = new Error("Invalid holder address for TRC20 balance lookup");
    err.code = "TRON_ADDRESS_INVALID";
    throw err;
  }
  const contract = await tronWeb.contract().at(contractAddress);
  const raw = await contract.balanceOf(holderAddress).call();
  return BigInt(String(raw));
}

module.exports = {
  networkUserSalt,
  deriveTronWallet,
  createTronWeb,
  configureTronSigner,
  isValidTronBase58Address,
  getTronTreasuryAddress,
  getGasFunderPrivateKey,
  sanitizeHexKey,
  waitForTxConfirmation,
  getTrxBalanceTrx,
  getTrc20BalanceRaw,
  sleep,
};
