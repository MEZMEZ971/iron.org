/**
 * Production mainnet deployment — Infura gateway + EIP-1559 gas tuning.
 *
 * Required env (smart-forwarder/.env only — never backend profiles):
 *   DEPLOYER_PRIVATE_KEY
 *   ETH_RPC_URL              — dedicated Infura mainnet endpoint
 *   MAIN_PARTNER_WALLET_ADDRESS  (falls back to CENTRAL_WALLET)
 *
 * Usage (from smart-forwarder/):
 *   npm run compile && node scripts/deployMainNet.cjs
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

async function resolveGasFees(provider) {
  const feeData = await provider.getFeeData();
  const block = await provider.getBlock("latest");
  const baseFee = block?.baseFeePerGas ?? feeData.gasPrice ?? 0n;

  const networkPriority =
    feeData.maxPriorityFeePerGas ?? ethers.parseUnits("1.5", "gwei");
  const maxPriorityFeePerGas =
    networkPriority + networkPriority / 5n + 1n; // +20% headroom

  const maxFeePerGas = baseFee
    ? baseFee * 2n + maxPriorityFeePerGas
    : (feeData.maxFeePerGas ?? baseFee + maxPriorityFeePerGas);

  return { maxFeePerGas, maxPriorityFeePerGas };
}

async function deployContract(factory, deployer, gas, label) {
  console.log(`\nDeploying ${label}...`);
  const contract = await factory.connect(deployer).deploy({
    maxFeePerGas: gas.maxFeePerGas,
    maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
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

  const rpcUrl = requireEnv("ETH_RPC_URL", process.env.ETH_RPC_URL);
  const mainPartnerWallet = requireEnv(
    "MAIN_PARTNER_WALLET_ADDRESS",
    process.env.MAIN_PARTNER_WALLET_ADDRESS || process.env.CENTRAL_WALLET
  );

  if (!ethers.isAddress(mainPartnerWallet)) {
    throw new Error(`Invalid MAIN_PARTNER_WALLET_ADDRESS: ${mainPartnerWallet}`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  if (network.chainId !== 1n) {
    throw new Error(
      `ETH_RPC_URL must point to Ethereum mainnet (chainId 1). Got chainId ${network.chainId}.`
    );
  }

  const deployer = new ethers.Wallet(deployerPrivateKey, provider);
  const balance = await provider.getBalance(deployer.address);
  const gas = await resolveGasFees(provider);

  console.log("=== IRON Mainnet Forwarder Deployment ===");
  console.log(`Deployer:          ${deployer.address}`);
  console.log(`Balance:           ${ethers.formatEther(balance)} ETH`);
  console.log(`Main partner:      ${mainPartnerWallet}`);
  console.log(`RPC:               ${rpcUrl.replace(/\/v3\/[^/]+/, "/v3/***")}`);
  console.log(
    `Gas (max/priority): ${ethers.formatUnits(gas.maxFeePerGas, "gwei")} / ${ethers.formatUnits(gas.maxPriorityFeePerGas, "gwei")} gwei`
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
    {
      maxFeePerGas: gas.maxFeePerGas,
      maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
    }
  );
  const factoryReceipt = await factoryContract.deploymentTransaction().wait(2);
  const NewFactoryAddress = await factoryContract.getAddress();

  console.log(`  tx: ${factoryReceipt.hash}`);
  console.log(`  ForwarderFactory (NewFactoryAddress): ${NewFactoryAddress}`);

  const record = {
    network: "mainnet",
    chainId: Number(network.chainId),
    implementation: implAddress,
    factory: NewFactoryAddress,
    NewFactoryAddress,
    mainPartnerWallet,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    factoryTxHash: factoryReceipt.hash,
  };

  const outPath = path.join(__dirname, "..", "deployed-addresses-mainnet.json");
  writeFileSync(outPath, JSON.stringify(record, null, 2));

  console.log("\n=== Deployment complete ===");
  console.log(`NewFactoryAddress=${NewFactoryAddress}`);
  console.log(`Saved: ${outPath}`);
  console.log(
    "\nNext: set FACTORY_ADDRESS in dunfin-application/backend/.env to NewFactoryAddress and restart the API."
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
