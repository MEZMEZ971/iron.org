/**
 * Definitive 6-tier strategy matrix — single source of truth for yields, capital, and team gates.
 */
const TRADING_LEVELS = Object.freeze([
  {
    id: 0,
    name: "Level 0 Baseline",
    dailyYield: 0.01,
    minCapital: 100,
    maxCapital: 299,
    minTeam: 0,
  },
  {
    id: 1,
    name: "Level 1",
    dailyYield: 0.015,
    minCapital: 300,
    maxCapital: 499,
    minTeam: 5,
  },
  {
    id: 2,
    name: "Strategy 2",
    dailyYield: 0.02,
    minCapital: 500,
    maxCapital: 1000,
    minTeam: 10,
  },
  {
    id: 3,
    name: "Strategy 3",
    dailyYield: 0.025,
    minCapital: 1000,
    maxCapital: 2000,
    minTeam: 30,
  },
  {
    id: 4,
    name: "Strategy 4",
    dailyYield: 0.03,
    minCapital: 2000,
    maxCapital: 3500,
    minTeam: 100,
  },
  {
    id: 5,
    name: "Strategy 5",
    dailyYield: 0.045,
    minCapital: 5000,
    maxCapital: 10000,
    minTeam: 200,
  },
  {
    id: 6,
    name: "Strategy 6",
    dailyYield: 0.05,
    minCapital: 10000,
    maxCapital: 999999,
    minTeam: 400,
  },
]);

function getTradingLevel(strategyId) {
  const id = Number(strategyId);
  if (!Number.isFinite(id)) return TRADING_LEVELS[0];
  return TRADING_LEVELS.find((level) => level.id === id) ?? TRADING_LEVELS[0];
}

function getDailyYield(strategyId) {
  return getTradingLevel(strategyId).dailyYield;
}

function getDailyYieldPercent(strategyId) {
  return Number((getDailyYield(strategyId) * 100).toFixed(2));
}

function formatYieldDisplay(strategyId) {
  const pct = getDailyYield(strategyId) * 100;
  return `${pct.toFixed(1)}%`;
}

function computeEstimatedProceeds(tradableFunds, strategyId) {
  const funds = Number(tradableFunds) || 0;
  if (funds <= 0) return 0;
  return Number((funds * getDailyYield(strategyId)).toFixed(2));
}

function enrichStrategyWithYields(strategy) {
  const level = getTradingLevel(strategy.id);
  return {
    ...strategy,
    dailyYield: level.dailyYield,
    dailyYieldPercent: getDailyYieldPercent(strategy.id),
    dailyYieldLabel: formatYieldDisplay(strategy.id),
  };
}

module.exports = {
  TRADING_LEVELS,
  getTradingLevel,
  getDailyYield,
  getDailyYieldPercent,
  formatYieldDisplay,
  computeEstimatedProceeds,
  enrichStrategyWithYields,
};
