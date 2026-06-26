const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

// Bulletproof Environment Variable Loading:
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const prisma = new PrismaClient();

// Configuration Check
const TRON_DEPOSIT_MASTER_SECRET = process.env.TRON_DEPOSIT_MASTER_SECRET;
const TRON_GAS_FUNDER_PRIVATE_KEY = process.env.TRON_GAS_FUNDER_PRIVATE_KEY;
const TRON_TREASURY_ADDRESS = process.env.TRON_TREASURY_ADDRESS;
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY;

const USDT_CONTRACT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; // Mainnet USDT

if (!TRON_DEPOSIT_MASTER_SECRET || !TRON_GAS_FUNDER_PRIVATE_KEY || !TRON_TREASURY_ADDRESS) {
  console.error("❌ Critical environment variables are missing! Check TRON_DEPOSIT_MASTER_SECRET, TRON_GAS_FUNDER_PRIVATE_KEY, and TRON_TREASURY_ADDRESS in your .env file.");
  process.exit(1);
}

// Fallback logic to support both old (v5) and new (v6+) TronWeb constructor types
let tronWebInstance;
try {
  const { TronWeb } = require('tronweb');
  tronWebInstance = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    headers: { "TRON-PRO-API-KEY": TRONGRID_API_KEY || "" },
    privateKey: TRON_GAS_FUNDER_PRIVATE_KEY
  });
} catch (e) {
  const LegacyTronWeb = require('tronweb');
  tronWebInstance = new LegacyTronWeb({
    fullHost: 'https://api.trongrid.io',
    headers: { "TRON-PRO-API-KEY": TRONGRID_API_KEY || "" },
    privateKey: TRON_GAS_FUNDER_PRIVATE_KEY
  });
}

const tronWeb = tronWebInstance;

// Helper: Derive Tron Private Key from Master Secret and salt (using production structured salt)
function deriveTronPrivateKey(masterSecret, userId) {
  const crypto = require('crypto');
  const salt = `${userId}::TRC20`; // Matches production system networkUserSalt
  const hash = crypto.createHmac('sha256', masterSecret).update(salt).digest('hex');
  return hash;
}

async function forceLiveSweep() {
  console.log("=== STARTING FORCE LIVE SWEEP PIPELINE ===");
  console.log(`Treasury Destination: ${TRON_TREASURY_ADDRESS}`);
  
  // Get Funder Address & Check TRX Balance
  const funderAddress = tronWeb.address.fromPrivateKey(TRON_GAS_FUNDER_PRIVATE_KEY);
  
  // Set the default address to resolve the "owner_address isn't set" issue
  tronWeb.setAddress(funderAddress);
  
  const funderTrxBalance = await tronWeb.trx.getBalance(funderAddress) / 1e6;
  console.log(`Gas Funder Wallet: ${funderAddress} | Balance: ${funderTrxBalance.toFixed(2)} TRX`);

  // Dynamic Treasury Activation Check (Failsafe for Out Of Energy)
  let treasuryIsActive = false;
  try {
    const accountInfo = await tronWeb.trx.getAccount(TRON_TREASURY_ADDRESS);
    if (accountInfo && Object.keys(accountInfo).length > 0) {
      treasuryIsActive = true;
    }
  } catch (e) {
    treasuryIsActive = false;
  }

  // Set required TRX threshold dynamically based on activation status
  const requiredGasTRX = treasuryIsActive ? 32 : 65;
  console.log(`ℹ️ Treasury Address Activation Status: ${treasuryIsActive ? "ACTIVE" : "INACTIVE"}. Required Sweep Gas: ${requiredGasTRX} TRX`);

  if (funderTrxBalance < requiredGasTRX) {
    console.warn(`⚠️ Warning: Gas funder wallet is very low on TRX! You should load at least ${requiredGasTRX} TRX to perform sweeps safely.`);
  }

  // Fetch all active TRC20 deposit addresses from Database
  const activeAddresses = await prisma.networkDepositAddress.findMany({
    where: { network: 'TRC20' }
  });

  console.log(`Found ${activeAddresses.length} TRC20 deposit addresses in DB. Scanning on-chain balances...`);

  let sweepCount = 0;

  for (const addrRow of activeAddresses) {
    const address = addrRow.address;
    const userId = addrRow.userId;

    try {
      // Query USDT Contract Balance on-chain passing explicitly the owner address to avoid RPC errors
      const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
      const rawBalance = await contract.balanceOf(address).call({ from: funderAddress });
      const usdtBalance = parseInt(rawBalance) / 1e6;

      if (usdtBalance <= 0) {
        continue; // Skip wallets with no USDT
      }

      console.log(`\n💎 Wallet [${address}] (User: ${userId}) has pending balance: ${usdtBalance} USDT`);

      // Derive sub-wallet private key using matching production salt
      const derivedPrivateKey = deriveTronPrivateKey(TRON_DEPOSIT_MASTER_SECRET, userId);
      const subWalletAddress = tronWeb.address.fromPrivateKey(derivedPrivateKey);

      if (subWalletAddress !== address) {
        console.error(`❌ Address mismatch for user ${userId}. (Expected DB address: ${address} | Derived: ${subWalletAddress}). Skipping to prevent security failures.`);
        continue;
      }

      // Check sub-wallet current TRX balance for gas
      const subWalletTrx = await tronWeb.trx.getBalance(address) / 1e6;
      console.log(`   Current sub-wallet TRX balance: ${subWalletTrx.toFixed(2)} TRX`);

      // If TRX is less than required dynamic threshold
      if (subWalletTrx < requiredGasTRX) {
        const trxNeeded = requiredGasTRX - subWalletTrx;
        console.log(`   Fueling sub-wallet with ${trxNeeded.toFixed(2)} TRX from Gas Funder...`);
        
        if (funderTrxBalance < trxNeeded) {
          console.error(`   ❌ Failed: Funder wallet does not have enough TRX to fuel this sweep!`);
          continue;
        }

        // Broadcast TRX transfer
        const fuelTx = await tronWeb.trx.sendTransaction(address, Math.ceil(trxNeeded * 1e6));
        console.log(`   ✓ Fuel Transaction Broadcasted. Hash: ${fuelTx.txid}`);
        console.log(`   Waiting 8 seconds for TRX to settle on blockchain...`);
        await new Promise(resolve => setTimeout(resolve, 8000));
      }

      // Perform the transfer of 100% USDT to Treasury
      console.log(`   Swiping ${usdtBalance} USDT to Treasury [${TRON_TREASURY_ADDRESS}]...`);
      
      let subWalletTronWeb;
      const TronWebClass = require('tronweb').TronWeb || require('tronweb');
      subWalletTronWeb = new TronWebClass({
        fullHost: 'https://api.trongrid.io',
        headers: { "TRON-PRO-API-KEY": TRONGRID_API_KEY || "" },
        privateKey: derivedPrivateKey
      });
      
      // Explicitly set sub-wallet address on its own instance to avoid signature issues
      subWalletTronWeb.setAddress(address);

      const subContract = await subWalletTronWeb.contract().at(USDT_CONTRACT_ADDRESS);
      const sweepTx = await subContract.transfer(TRON_TREASURY_ADDRESS, rawBalance).send({ from: address });

      console.log(`   🚀 SWEEP SUCCESSFUL! Transaction Hash: ${sweepTx}`);
      sweepCount++;

    } catch (err) {
      console.error(`   ❌ Error processing address ${address}:`, err.message || err);
    }
  }

  console.log(`\n=== SWEEP COMPLETED ===`);
  console.log(`Successfully swept ${sweepCount} wallet(s) directly to your central treasury.`);
}

forceLiveSweep()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Fatal Sweep Error:", err);
    process.exit(1);
  });