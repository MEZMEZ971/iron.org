import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { readFileSync, writeFileSync } from "fs";
import * as dotenv from "dotenv";
dotenv.config();

// قراءة ABI و Bytecode من artifacts
const implArtifact = JSON.parse(readFileSync(
    "./artifacts/contracts/ForwarderImplementation.sol/ForwarderImplementation.json",
    "utf8"
));
const factoryArtifact = JSON.parse(readFileSync(
    "./artifacts/contracts/ForwarderFactory.sol/ForwarderFactory.json",
    "utf8"
));

async function main() {
    const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
    const CENTRAL_WALLET = (process.env.MAIN_PARTNER_WALLET_ADDRESS ||
        process.env.CENTRAL_WALLET) as `0x${string}`;
    const RPC_URL = process.env.ETH_RPC_URL!;

    if (!PRIVATE_KEY || !CENTRAL_WALLET || !RPC_URL) {
        throw new Error("❌ Check your .env file!");
    }

    const account = privateKeyToAccount(PRIVATE_KEY);
    
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(RPC_URL),
    });

    const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http(RPC_URL),
    });

    console.log("🚀 Deploying with:", account.address);
    const balance = await publicClient.getBalance({ address: account.address });
    console.log("💰 Balance:", formatEther(balance), "ETH");

    // 1. نشر Implementation
    console.log("\n📄 Deploying ForwarderImplementation...");
    const implHash = await walletClient.deployContract({
        abi: implArtifact.abi,
        bytecode: implArtifact.bytecode,
    });
    const implReceipt = await publicClient.waitForTransactionReceipt({ hash: implHash });
    const implAddress = implReceipt.contractAddress!;
    console.log("✅ Implementation:", implAddress);

    // 2. نشر Factory
    console.log("\n🏭 Deploying ForwarderFactory...");
    const factoryHash = await walletClient.deployContract({
        abi: factoryArtifact.abi,
        bytecode: factoryArtifact.bytecode,
        args: [implAddress, CENTRAL_WALLET],
    });
    const factoryReceipt = await publicClient.waitForTransactionReceipt({ hash: factoryHash });
    const factoryAddress = factoryReceipt.contractAddress!;
    console.log("✅ Factory:", factoryAddress);

    // 3. حفظ العناوين
    const addresses = {
        implementation: implAddress,
        factory: factoryAddress,
        centralWallet: CENTRAL_WALLET,
        network: "sepolia",
        deployedAt: new Date().toISOString()
    };

    writeFileSync("deployed-addresses.json", JSON.stringify(addresses, null, 2));
    console.log("\n🎉 Deployment Complete!");
    console.table(addresses);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});