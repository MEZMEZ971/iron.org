const { STRATEGIES } = require("./strategies.cjs");
const { getFrontendUrl } = require("./lib/appUrls.cjs");
const { normalizeInviteCode } = require("./lib/referralCodeGenerator.cjs");

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

function buildInviteLink(referralCode, baseUrl) {
  const origin = baseUrl || getFrontendUrl();
  if (!origin) {
    const err = new Error("FRONTEND_URL is not configured");
    err.code = "FRONTEND_URL_MISSING";
    throw err;
  }
  const code = normalizeInviteCode(referralCode);
  if (!code) {
    const err = new Error("Invalid invite code");
    err.code = "INVALID_INVITE_CODE";
    throw err;
  }
  const url = new URL("/register", origin.replace(/\/$/, ""));
  url.searchParams.set("ref", code);
  return url.toString();
}

module.exports = {
  getInviteRewardMatrix,
  buildInviteLink,
  STRATEGY_PRODUCT_NAMES,
  REWARD_TIERS,
};
