const { PrismaClient } = require('@prisma/client');
const { TronWeb } = require('tronweb');

const prisma = new PrismaClient();

// Independent live credentials to bypass third-party environment managers
const TRON_DEPOSIT_MASTER_SECRET_LIVE = "Bzk1ArsJWDcEVVx65lcxet1EAPICwSGXUAGC6lTRiNTt7YEUT0DIGE47DA92EBCC9B75AFC2D13828D32920E";
const TRON_GAS_FUNDER_PRIVATE_KEY_LIVE = "e71de8f1f912f7b08cc502f7b4e4ee7884b5fbe0df13b65797e6694880e135f8";
const TRON_TREASURY_ADDRESS_LIVE = "TRNSqjFtUToSUVsAKH8193E12TPCZrYmFt";
const TRONGRID_API_KEY_LIVE = "99701d12-6304-4aa1-9da8-37a368fc25fa";

const USDT_CONTRACT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

if (!TRON_DEPOSIT_MASTER_SECRET_LIVE || !TRON_GAS_FUNDER_PRIVATE_KEY_LIVE || !TRON_TREASURY_ADDRESS_LIVE) {
  console.error("❌ Critical credentials missing! Please edit the text placeholders directly inside scripts/forceLiveSweep.cjs");
  process.exit(1);
}

// Safely pass the clean private key string
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { "TRON-PRO-API-KEY": TRONGRID_API_KEY_LIVE || "" },
  privateKey: TRON_GAS_FUNDER_PRIVATE_KEY_LIVE
});

function deriveTronPrivateKey(masterSecret, salt) {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', masterSecret).update(salt).digest('hex');
}

async function forceLiveSweep() {
  console.log("=== STARTING FORCE LIVE SWEEP PIPELINE ===");
  console.log(`Treasury Destination: ${TRON_TREASURY_ADDRESS_LIVE}`);

  try {
    const funderAddress = tronWeb.address.fromPrivateKey(TRON_GAS_FUNDER_PRIVATE_KEY_LIVE);
    const funderTrxBalance = await tronWeb.trx.getBalance(funderAddress) / 1e6;
    console.log(`Gas Funder Wallet: ${funderAddress} | Balance: ${funderTrxBalance.toFixed(2)} TRX`);

    if (funderTrxBalance < 50) {
      console.warn("⚠️ Warning: Gas funder wallet is very low on TRX!");
    }

    const activeAddresses = await prisma.networkDepositAddress.findMany({
      where: { network: 'TRC20' }
    });

    console.log(`Found ${activeAddresses.length} TRC20 addresses in DB. Scanning balances...`);

    let sweepCount = 0;

    for (const addrRow of activeAddresses) {
      const address = addrRow.address;
      const userId = addrRow.userId;

      try {
        const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
        const rawBalance = await contract.balanceOf(address).call();
        const usdtBalance = parseInt(rawBalance) / 1e6;

        if (usdtBalance <= 0) continue;

        console.log(`\n💎 Wallet [${address}] has pending balance: ${usdtBalance} USDT`);

        const derivedPrivateKey = deriveTronPrivateKey(TRON_DEPOSIT_MASTER_SECRET_LIVE, userId);
        const subWalletAddress = tronWeb.address.fromPrivateKey(derivedPrivateKey);

        if (subWalletAddress !== address) {
          console.warn(`⚠️ Mismatch detected, but forcing recovery for address: ${address}`);
          console.warn(`   Derived address: ${subWalletAddress} | userId: ${userId}`);
          console.warn(`   Derived private key (for manual fallback): ${derivedPrivateKey}`);
        }

        const subWalletTrx = await tronWeb.trx.getBalance(address) / 1e6;
        console.log(`   Current sub-wallet TRX balance: ${subWalletTrx.toFixed(2)} TRX`);

        if (subWalletTrx < 30) {
          const trxNeeded = 32 - subWalletTrx;
          console.log(`   Fueling sub-wallet with ${trxNeeded.toFixed(2)} TRX...`);

          if (funderTrxBalance < trxNeeded) {
            console.error(`   ❌ Failed: Funder wallet lacks TRX!`);
            continue;
          }

          const fuelTx = await tronWeb.trx.sendTransaction(address, Math.ceil(trxNeeded * 1e6));
          console.log(`   ✓ Fuel Transaction Broadcasted: ${fuelTx.txid}`);
          await new Promise(resolve => setTimeout(resolve, 8000));
        }

        console.log(`   Swiping ${usdtBalance} USDT to Treasury...`);

        const subWalletTronWeb = new TronWeb({
          fullHost: 'https://api.trongrid.io',
          headers: { "TRON-PRO-API-KEY": TRONGRID_API_KEY_LIVE || "" },
          privateKey: derivedPrivateKey
        });

        const subContract = await subWalletTronWeb.contract().at(USDT_CONTRACT_ADDRESS);
        const sweepTx = await subContract.transfer(TRON_TREASURY_ADDRESS_LIVE, rawBalance).send();

        console.log(`   🚀 SWEEP SUCCESSFUL! Hash: ${sweepTx}`);
        sweepCount++;

      } catch (err) {
        console.error(`   ❌ Error processing address ${address}:`, err.message || err);
      }
    }

    console.log(`\n=== SWEEP COMPLETED | Swept ${sweepCount} wallet(s) ===`);
  } catch (globalErr) {
    console.error("❌ Global initialization or network failure:", globalErr.message || globalErr);
  }
}

forceLiveSweep()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Fatal Sweep Error:", err);
    process.exit(1);
  });
