const { STRATEGIES } = require("./strategies.cjs");

const STRATEGY_PRODUCT_NAMES = Object.freeze({
  1: "Alpha Grid Master",
  2: "Quantum Arbitrage Sweeper",
  3: "Momentum Trend Rider",
  4: "Mean Reversion Core",
  5: "Macro Sentiment NLP",
  6: "Smart Allocator Sovereign",
});

const REWARD_TIERS = Object.freeze({
  1: "Tier I Baseline",
  2: "Tier II Enhanced",
  3: "Tier III Premium",
  4: "Tier IV Elite",
  5: "Tier V Executive",
  6: "Tier VI Global Apex",
});

function getInviteRewardMatrix() {
  return STRATEGIES.map((s) => ({
    strategyId: s.id,
    productName: STRATEGY_PRODUCT_NAMES[s.id] || s.name,
    minTeam: s.minTeam,
    rewardTier: REWARD_TIERS[s.id] || `Tier ${s.id}`,
    minCapital: s.minCapital,
    maxCapital: s.maxCapital,
  }));
}

function shortInviteCode(referralCode) {
  if (!referralCode) return "";
  const clean = referralCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return clean.slice(0, 5) || referralCode.slice(0, 5).toUpperCase();
}

function buildInviteLink(referralCode, baseUrl) {
  const origin = baseUrl || process.env.FRONTEND_URL || "http://localhost:5173";
  const url = new URL("/register", origin.replace(/\/$/, ""));
  const code = shortInviteCode(referralCode) || referralCode;
  url.searchParams.set("code", code);
  url.searchParams.set("ref", referralCode);
  return url.toString();
}

module.exports = {
  getInviteRewardMatrix,
  buildInviteLink,
  shortInviteCode,
  STRATEGY_PRODUCT_NAMES,
  REWARD_TIERS,
};
