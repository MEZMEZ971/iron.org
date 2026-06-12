/**
 * Central crypto / forwarder configuration for the IRON backend.
 *
 * Active factory pointer (FACTORY_ADDRESS) drives CREATE2 deposit address generation.
 * Legacy factory (LEGACY_FACTORY_ADDRESS) remains available for monitoring old forwarders
 * without touching existing user rows in PostgreSQL.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { mainnet } = require("viem/chains");

function requireAddress(name, value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    throw new Error(`Missing required env: ${name}`);
  }
  return trimmed;
}

function optionalAddress(name, value) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

const PLACEHOLDER_KEY_PATTERNS = [
  /^your[_-]?/i,
  /^changeme/i,
  /^replace[_-]?/i,
  /^insert[_-]?/i,
  /^xxx+$/i,
  /^0+$/,
  /^x+$/i,
  /placeholder/i,
  /example/i,
];

const DUMMY_DEPLOYER_PRIVATE_KEY =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

/**
 * Purify DEPLOYER_PRIVATE_KEY from .env — strip 0x, trim, validate 64 hex chars.
 * Returns `0x`-prefixed key or null when unusable.
 */
function sanitizePrivateKey(raw) {
  let fetchedKey = raw || "";
  if (fetchedKey.startsWith("0x") || fetchedKey.startsWith("0X")) {
    fetchedKey = fetchedKey.slice(2);
  }
  fetchedKey = fetchedKey.trim();

  if (!fetchedKey) return null;
  if (fetchedKey.length !== 64) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(fetchedKey)) return null;

  for (const pattern of PLACEHOLDER_KEY_PATTERNS) {
    if (pattern.test(fetchedKey)) return null;
  }

  return `0x${fetchedKey.toLowerCase()}`;
}

function resolveDeployerPrivateKey() {
  const sanitized = sanitizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY);
  if (sanitized) {
    return { privateKey: sanitized, usingPlaceholder: false };
  }

  console.warn(
    "⚠️ [Crypto Configuration Warning]: Found malformed or placeholder credentials inside backend .env variables. Using isolated dummy wallet context to keep server up."
  );
  return { privateKey: DUMMY_DEPLOYER_PRIVATE_KEY, usingPlaceholder: true };
}

const _deployerKey = resolveDeployerPrivateKey();
const DEPLOYER_PRIVATE_KEY = _deployerKey.privateKey;
const DEPLOYER_KEY_IS_PLACEHOLDER = _deployerKey.usingPlaceholder;

const ETH_RPC_URL = requireAddress("ETH_RPC_URL", process.env.ETH_RPC_URL);

/** Active CREATE2 factory — swap this after mainnet deploy (zero DB migration). */
const ACTIVE_FACTORY_ADDRESS = requireAddress(
  "FACTORY_ADDRESS",
  process.env.FACTORY_ADDRESS
);

/** Previous test/staging factory; kept for balance flush + historical forwarder reads. */
const LEGACY_FACTORY_ADDRESS = optionalAddress(
  "LEGACY_FACTORY_ADDRESS",
  process.env.LEGACY_FACTORY_ADDRESS
);

const MAIN_PARTNER_WALLET_ADDRESS =
  process.env.MAIN_PARTNER_WALLET_ADDRESS ||
  process.env.CENTRAL_WALLET ||
  null;

const USDT_ADDRESS = requireAddress("USDT_ADDRESS", process.env.USDT_ADDRESS);

const USDC_ADDRESS =
  optionalAddress("USDC_ADDRESS", process.env.USDC_ADDRESS) ||
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const CHAIN = mainnet;

const FACTORY_ABI = parseAbi([
  "function createForwarder(bytes32 userId) returns (address)",
  "function predictForwarderAddress(bytes32 userId) view returns (address)",
  "function userForwarders(bytes32) view returns (address)",
  "function batchFlushTokens(address[] forwarders, address token)",
  "function batchFlushETH(address[] forwarders)",
  "function centralWallet() view returns (address)",
  "event ForwarderCreated(bytes32 indexed userId, address indexed forwarderAddress)",
]);

const ERC20_ABI = parseAbi(["function balanceOf(address) view returns (uint256)"]);

let _clients;

function createBlockchainClients() {
  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  const transport = http(ETH_RPC_URL);

  const publicClient = createPublicClient({
    chain: CHAIN,
    transport,
  });

  const walletClient = createWalletClient({
    account,
    chain: CHAIN,
    transport,
  });

  return { account, publicClient, walletClient };
}

function getBlockchainClients() {
  if (!_clients) {
    _clients = createBlockchainClients();
  }
  return _clients;
}

function getDepositClients() {
  const { publicClient, walletClient } = getBlockchainClients();
  return {
    publicClient,
    walletClient,
    factoryAddress: ACTIVE_FACTORY_ADDRESS,
    factoryAbi: FACTORY_ABI,
    usdtAddress: USDT_ADDRESS,
  };
}

/** Factory addresses monitored for on-chain balance sync and admin flush. */
function getMonitoredFactoryAddresses() {
  const factories = [ACTIVE_FACTORY_ADDRESS];
  if (
    LEGACY_FACTORY_ADDRESS &&
    LEGACY_FACTORY_ADDRESS.toLowerCase() !== ACTIVE_FACTORY_ADDRESS.toLowerCase()
  ) {
    factories.push(LEGACY_FACTORY_ADDRESS);
  }
  return factories;
}

function getStartupSummary() {
  return {
    network: "mainnet",
    chainId: CHAIN.id,
    activeFactory: ACTIVE_FACTORY_ADDRESS,
    legacyFactory: LEGACY_FACTORY_ADDRESS,
    mainPartnerWallet: MAIN_PARTNER_WALLET_ADDRESS,
    usdt: USDT_ADDRESS,
    usdc: USDC_ADDRESS,
    monitoredFactories: getMonitoredFactoryAddresses(),
    deployerKeyPlaceholder: DEPLOYER_KEY_IS_PLACEHOLDER,
  };
}

module.exports = {
  CHAIN,
  ETH_RPC_URL,
  ACTIVE_FACTORY_ADDRESS,
  LEGACY_FACTORY_ADDRESS,
  MAIN_PARTNER_WALLET_ADDRESS,
  USDT_ADDRESS,
  USDC_ADDRESS,
  FACTORY_ABI,
  ERC20_ABI,
  getBlockchainClients,
  getDepositClients,
  getMonitoredFactoryAddresses,
  getStartupSummary,
  DEPLOYER_KEY_IS_PLACEHOLDER,
  sanitizePrivateKey,
};
