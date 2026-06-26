const { getDailyYield } = require("./tradingLevels.cjs");

/** Settlement uses the configured static daily yield for the active level. */
function getStrategyDailyRoi(strategyId) {
  return getDailyYield(strategyId);
}

function computeDailyProfit(lockedCapital, strategyId) {
  const locked = Number(lockedCapital) || 0;
  if (locked <= 0) return 0;
  return Number((locked * getStrategyDailyRoi(strategyId)).toFixed(6));
}

module.exports = {
  getStrategyDailyRoi,
  computeDailyProfit,
};
