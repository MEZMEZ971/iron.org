/**
 * One-off manual Tron sweep — reads credentials from backend/.env only.
 * Run: node scripts/forceLiveSweep.cjs (from dunfin-application/backend)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { TronWeb } = require("tronweb");
const {
  networkUserSalt,
  getTronTreasuryAddress,
  getGasFunderPrivateKey,
  createTronWeb,
} = require("../lib/tronWallet.cjs");

const prisma = new PrismaClient();

const USDT_CONTRACT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRC20_NETWORK = "TRC20";

function loadMasterSecret() {
  const secret = String(process.env.TRON_DEPOSIT_MASTER_SECRET || "").trim();
  if (!secret) {
    console.error(
      "❌ TRON_DEPOSIT_MASTER_SECRET is not set. Add it to backend/.env before running this script."
    );
    process.exit(1);
  }
  return secret;
}

function deriveTronPrivateKey(masterSecret, userId, network = TRC20_NETWORK) {
  return crypto
    .createHmac("sha256", masterSecret)
    .update(networkUserSalt(userId, network))
    .digest("hex");
}

function assertEnvConfigured() {
  loadMasterSecret();
  try {
    getGasFunderPrivateKey();
    getTronTreasuryAddress();
  } catch (err) {
    console.error(`❌ ${err.message}`);
    console.error(
      "Configure TRON_GAS_FUNDER_PRIVATE_KEY and TRON_TREASURY_ADDRESS (or TRON_CENTRAL_WALLET) in backend/.env."
    );
    process.exit(1);
  }
}

async function forceLiveSweep() {
  assertEnvConfigured();

  const masterSecret = loadMasterSecret();
  const treasuryAddress = getTronTreasuryAddress();
  const funderKey = getGasFunderPrivateKey();
  const readOnlyTron = createTronWeb();
  const funderTron = createTronWeb({ privateKey: funderKey });

  console.log("=== STARTING FORCE LIVE SWEEP PIPELINE ===");
  console.log(`Treasury destination: ${treasuryAddress}`);

  try {
    const funderAddress = funderTron.address.fromPrivateKey(funderKey);
    let funderTrxBalance =
      (await funderTron.trx.getBalance(funderAddress)) / 1e6;
    console.log(
      `Gas funder wallet: ${funderAddress} | Balance: ${funderTrxBalance.toFixed(2)} TRX`
    );

    if (funderTrxBalance < 50) {
      console.warn("⚠️ Warning: Gas funder wallet is very low on TRX!");
    }

    const activeAddresses = await prisma.networkDepositAddress.findMany({
      where: { network: TRC20_NETWORK },
    });

    console.log(
      `Found ${activeAddresses.length} TRC20 addresses in DB. Scanning balances...`
    );

    let sweepCount = 0;

    for (const addrRow of activeAddresses) {
      const address = addrRow.address;
      const userId = addrRow.userId;
      const network = addrRow.network || TRC20_NETWORK;

      try {
        const contract = await readOnlyTron.contract().at(USDT_CONTRACT_ADDRESS);
        const rawBalance = await contract.balanceOf(address).call();
        const usdtBalance = parseInt(rawBalance, 10) / 1e6;

        if (usdtBalance <= 0) continue;

        console.log(
          `\n💎 Wallet [${address}] has pending balance: ${usdtBalance} USDT`
        );

        const derivedPrivateKey = deriveTronPrivateKey(
          masterSecret,
          userId,
          network
        );
        const subWalletAddress = readOnlyTron.address.fromPrivateKey(
          derivedPrivateKey
        );

        if (subWalletAddress !== address) {
          console.warn(
            `⚠️ Skipping ${address}: derived wallet ${subWalletAddress} does not match stored address (userId=${userId})`
          );
          continue;
        }

        const subWalletTrx =
          (await readOnlyTron.trx.getBalance(address)) / 1e6;
        console.log(
          `   Current sub-wallet TRX balance: ${subWalletTrx.toFixed(2)} TRX`
        );

        if (subWalletTrx < 30) {
          const trxNeeded = 32 - subWalletTrx;
          console.log(`   Fueling sub-wallet with ${trxNeeded.toFixed(2)} TRX...`);

          if (funderTrxBalance < trxNeeded) {
            console.error("   ❌ Failed: Funder wallet lacks TRX!");
            continue;
          }

          const fuelTx = await funderTron.trx.sendTransaction(
            address,
            Math.ceil(trxNeeded * 1e6)
          );
          console.log(`   ✓ Fuel transaction broadcasted: ${fuelTx.txid}`);
          funderTrxBalance -= trxNeeded;
          await new Promise((resolve) => setTimeout(resolve, 8000));
        }

        console.log(`   Swiping ${usdtBalance} USDT to treasury...`);

        const subWalletTronWeb = createTronWeb({ privateKey: derivedPrivateKey });
        const subContract = await subWalletTronWeb
          .contract()
          .at(USDT_CONTRACT_ADDRESS);
        const sweepTx = await subContract
          .transfer(treasuryAddress, rawBalance)
          .send();

        console.log(`   🚀 Sweep successful! Hash: ${sweepTx}`);
        sweepCount++;
      } catch (err) {
        console.error(
          `   ❌ Error processing address ${address}:`,
          err.message || err
        );
      }
    }

    console.log(`\n=== SWEEP COMPLETED | Swept ${sweepCount} wallet(s) ===`);
  } catch (globalErr) {
    console.error(
      "❌ Global initialization or network failure:",
      globalErr.message || globalErr
    );
  }
}

forceLiveSweep()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal sweep error:", err);
    process.exit(1);
  });
