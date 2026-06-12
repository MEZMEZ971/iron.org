const {
  USDT_ADDRESS,
  USDC_ADDRESS,
} = require("../config/crypto.cjs");

const EVM_STABLECOINS = Object.freeze([
  { symbol: "USDT", address: USDT_ADDRESS, decimals: 6 },
  { symbol: "USDC", address: USDC_ADDRESS, decimals: 6 },
]);

const TRON_USDT_CONTRACT =
  process.env.TRON_USDT_CONTRACT || "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_USDC_CONTRACT =
  process.env.TRON_USDC_CONTRACT || "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8";

const TRON_STABLECOINS = Object.freeze([
  { symbol: "USDT", contract: TRON_USDT_CONTRACT, decimals: 6 },
  { symbol: "USDC", contract: TRON_USDC_CONTRACT, decimals: 6 },
]);

module.exports = {
  EVM_STABLECOINS,
  TRON_STABLECOINS,
  TRON_USDT_CONTRACT,
  TRON_USDC_CONTRACT,
};
