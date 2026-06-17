/**
 * Production BSC mainnet deployment — legacy gas pricing (gasPrice).
 *
 * Required env (smart-forwarder/.env only — never backend profiles):
 *   DEPLOYER_PRIVATE_KEY
 *   BSC_RPC_URL                 — BSC mainnet JSON-RPC endpoint
 *   MAIN_PARTNER_WALLET_ADDRESS (falls back to CENTRAL_WALLET)
 *
 * Usage (from smart-forwarder/):
 *   npm run compile && npm run deploy:bsc
 */
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  override: true,
});
console.log(
  "🔒 [Security Gate] Enforcing local contract credentials. Ignoring external backend profiles."
);

const { ethers } = require("ethers");
const { readFileSync, writeFileSync } = require("fs");

const ARTIFACTS = path.join(__dirname, "..", "artifacts", "contracts");

function loadArtifact(contractName) {
  const file = path.join(
    ARTIFACTS,
    `${contractName}.sol`,
    `${contractName}.json`
  );
  return JSON.parse(readFileSync(file, "utf8"));
}

function requireEnv(name, value) {
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return String(value).trim();
}

async function resolveBscGasPrice(provider) {
  const feeData = await provider.getFeeData();
  const networkGas = feeData.gasPrice ?? 0n;
  if (!networkGas) {
    const fallback = await provider.getGasPrice();
    return { gasPrice: fallback };
  }
  // Add a little headroom to reduce "replacement underpriced" / stuck tx risk.
  const gasPrice = networkGas + networkGas / 10n + 1n; // +10%
  return { gasPrice };
}

async function deployContract(factory, deployer, gas, label) {
  console.log(`\nDeploying ${label}...`);
  const contract = await factory.connect(deployer).deploy({
    gasPrice: gas.gasPrice,
  });
  const receipt = await contract.deploymentTransaction().wait(2);
  const address = await contract.getAddress();
  console.log(`  tx: ${receipt.hash}`);
  console.log(`  ${label}: ${address}`);
  return { address, contract, receipt };
}

async function main() {
  let rawKey = process.env.DEPLOYER_PRIVATE_KEY || "";
  if (rawKey.startsWith("0x")) rawKey = rawKey.slice(2);
  rawKey = rawKey.trim();

  if (rawKey.length !== 64) {
    throw new Error(
      "DEPLOYER_PRIVATE_KEY must be 32 bytes (64 hex chars) in smart-forwarder/.env"
    );
  }
  const deployerPrivateKey = `0x${rawKey}`;

  const rpcUrl = requireEnv("BSC_RPC_URL", process.env.BSC_RPC_URL);
  const mainPartnerWallet = requireEnv(
    "MAIN_PARTNER_WALLET_ADDRESS",
    process.env.MAIN_PARTNER_WALLET_ADDRESS || process.env.CENTRAL_WALLET
  );

  if (!ethers.isAddress(mainPartnerWallet)) {
    throw new Error(`Invalid MAIN_PARTNER_WALLET_ADDRESS: ${mainPartnerWallet}`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  if (network.chainId !== 56n) {
    throw new Error(
      `BSC_RPC_URL must point to BSC mainnet (chainId 56). Got chainId ${network.chainId}.`
    );
  }

  const deployer = new ethers.Wallet(deployerPrivateKey, provider);
  const balance = await provider.getBalance(deployer.address);
  const gas = await resolveBscGasPrice(provider);

  console.log("=== IRON BSC Mainnet Forwarder Deployment ===");
  console.log(`Deployer:          ${deployer.address}`);
  console.log(`Balance:           ${ethers.formatEther(balance)} BNB`);
  console.log(`Main partner:      ${mainPartnerWallet}`);
  console.log(`RPC:               ${rpcUrl}`);
  console.log(
    `Gas (gasPrice):    ${ethers.formatUnits(gas.gasPrice, "gwei")} gwei`
  );

  const implArtifact = loadArtifact("ForwarderImplementation");
  const factoryArtifact = loadArtifact("ForwarderFactory");

  const ImplFactory = new ethers.ContractFactory(
    implArtifact.abi,
    implArtifact.bytecode,
    deployer
  );
  const { address: implAddress } = await deployContract(
    ImplFactory,
    deployer,
    gas,
    "ForwarderImplementation"
  );

  const FactoryFactory = new ethers.ContractFactory(
    factoryArtifact.abi,
    factoryArtifact.bytecode,
    deployer
  );
  console.log("\nDeploying ForwarderFactory...");
  const factoryContract = await FactoryFactory.connect(deployer).deploy(
    implAddress,
    mainPartnerWallet,
    { gasPrice: gas.gasPrice }
  );
  const factoryReceipt = await factoryContract.deploymentTransaction().wait(2);
  const NewFactoryAddress = await factoryContract.getAddress();

  console.log(`  tx: ${factoryReceipt.hash}`);
  console.log(`  ForwarderFactory (NewFactoryAddress): ${NewFactoryAddress}`);

  const record = {
    network: "bsc",
    chainId: Number(network.chainId),
    implementation: implAddress,
    factory: NewFactoryAddress,
    NewFactoryAddress,
    mainPartnerWallet,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    factoryTxHash: factoryReceipt.hash,
    gasPriceGwei: Number(ethers.formatUnits(gas.gasPrice, "gwei")),
  };

  const outPath = path.join(__dirname, "..", "deployed-addresses-bsc.json");
  writeFileSync(outPath, JSON.stringify(record, null, 2));

  console.log("\n=== Deployment complete ===");
  console.log(`NewFactoryAddress=${NewFactoryAddress}`);
  console.log(`Saved: ${outPath}`);
  console.log(
    "\nNext: set FACTORY_ADDRESS + EVM_CHAIN=BSC + BSC_RPC_URL in dunfin-application/backend/.env and restart the API."
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

