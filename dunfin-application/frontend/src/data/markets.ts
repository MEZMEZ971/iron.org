export interface MarketTicker {
  id: string;
  pair: string;
  base: string;
  price: number;
  change24h: number;
}

export const WATCHLIST_PAIRS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "XRP/USDT"] as const;

export const INITIAL_MARKETS: MarketTicker[] = [
  { id: "btc", pair: "BTC/USDT", base: "BTC", price: 97240.5, change24h: 2.34 },
  { id: "eth", pair: "ETH/USDT", base: "ETH", price: 3642.18, change24h: -1.12 },
  { id: "bnb", pair: "BNB/USDT", base: "BNB", price: 612.44, change24h: 0.87 },
  { id: "xrp", pair: "XRP/USDT", base: "XRP", price: 2.184, change24h: 4.21 },
  { id: "sol", pair: "SOL/USDT", base: "SOL", price: 198.32, change24h: -0.45 },
  { id: "doge", pair: "DOGE/USDT", base: "DOGE", price: 0.382, change24h: 1.67 },
  { id: "ada", pair: "ADA/USDT", base: "ADA", price: 0.912, change24h: -2.08 },
  { id: "avax", pair: "AVAX/USDT", base: "AVAX", price: 38.74, change24h: 0.33 },
  { id: "link", pair: "LINK/USDT", base: "LINK", price: 18.92, change24h: 3.15 },
  { id: "dot", pair: "DOT/USDT", base: "DOT", price: 7.84, change24h: -0.92 },
  { id: "matic", pair: "MATIC/USDT", base: "MATIC", price: 0.542, change24h: 1.04 },
  { id: "ltc", pair: "LTC/USDT", base: "LTC", price: 104.2, change24h: -1.44 },
];

export function tickPrice(price: number, volatility = 0.0012): number {
  const delta = (Math.random() - 0.5) * 2 * volatility * price;
  return Math.max(price * 0.0001, price + delta);
}

export function formatPrice(symbol: string, price: number): string {
  if (symbol === "DOGE" || symbol === "XRP" || symbol === "ADA" || symbol === "MATIC") {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 4,
    });
  }
  if (price >= 1000) {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}
