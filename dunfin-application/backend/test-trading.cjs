const assert = require("assert");
const {
  autoResolveStrategy,
  ABSOLUTE_MIN_BALANCE,
  getCooldownState,
  getTradeSessionState,
  pickTradeSessionDurationMs,
  TRADE_SESSION_MIN_MS,
  TRADE_SESSION_MAX_MS,
} = require("./strategies.cjs");
const { getAffiliateNetwork } = require("./affiliate.cjs");

const level0 = autoResolveStrategy(150, 0);
assert.strictEqual(level0.ok, true);
assert.strictEqual(level0.strategy.id, 0);
assert.strictEqual(level0.capitalAmount, 150);

const level0NoTeam = autoResolveStrategy(100, 0);
assert.strictEqual(level0NoTeam.ok, true);
assert.strictEqual(level0NoTeam.strategy.id, 0);

const level1 = autoResolveStrategy(350, 5);
assert.strictEqual(level1.ok, true);
assert.strictEqual(level1.strategy.id, 1);

assert.strictEqual(autoResolveStrategy(250, 5).strategy.id, 0);
assert.strictEqual(autoResolveStrategy(350, 4).strategy.id, 0);

assert.strictEqual(autoResolveStrategy(7000, 200).ok, true);
assert.strictEqual(autoResolveStrategy(7000, 200).strategy.id, 5);

assert.strictEqual(autoResolveStrategy(500, 10).strategy.id, 2);
assert.strictEqual(autoResolveStrategy(500, 4).strategy.id, 0);

const denied = autoResolveStrategy(80, 10);
assert.strictEqual(denied.ok, false);
assert.strictEqual(denied.code, "QUALIFICATION_DENIED");
assert.strictEqual(denied.requiredCapital, 100);
assert.strictEqual(denied.requiredTeam, 0);
assert.ok(denied.errorEn.includes("100"));
assert.strictEqual(ABSOLUTE_MIN_BALANCE, 100);

const users = {
  root: { referredBy: null, hasDeposited: true, tradingCapital: 100 },
  g1a: {
    referredBy: "root",
    hasDeposited: true,
    tradingCapital: 500,
  },
  g1b: { referredBy: "root", hasDeposited: false, tradingCapital: 0 },
  g2a: {
    referredBy: "g1a",
    hasDeposited: true,
    tradingCapital: 1000,
  },
};

const network = getAffiliateNetwork(users, "root");
assert.strictEqual(network.totalActiveMembers, 2);
assert.strictEqual(network.generations.gen1.activeCount, 1);
assert.strictEqual(network.generations.gen1.memberCount, 2);

const cooldown = getCooldownState(new Date().toISOString());
assert.strictEqual(cooldown.onCooldown, true);

const duration = pickTradeSessionDurationMs();
assert.ok(duration >= TRADE_SESSION_MIN_MS && duration <= TRADE_SESSION_MAX_MS);

const endsAt = new Date(Date.now() + 6 * 60 * 1000).toISOString();
const activeSession = getTradeSessionState({
  lastTradeTime: new Date().toISOString(),
  tradeSessionEndsAt: endsAt,
  lockedCapital: 100,
});
assert.strictEqual(activeSession.active, true);

const expiredSession = getTradeSessionState({
  lastTradeTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  tradeSessionEndsAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  lockedCapital: 100,
});
assert.strictEqual(expiredSession.active, false);

console.log("All trading unit checks passed.");
