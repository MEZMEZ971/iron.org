/** Daily ROI by active strategy tier (fraction of locked capital). */
const STRATEGY_DAILY_ROI = {
  0: 0.01,
  1: 0.015,
  2: 0.02,
  3: 0.025,
  4: 0.03,
  5: 0.045,
  6: 0.05,
};

const DEFAULT_DAILY_ROI = 0.024;

function getStrategyDailyRoi(strategyId) {
  const id = Number(strategyId);
  if (!Number.isFinite(id)) return DEFAULT_DAILY_ROI;
  return STRATEGY_DAILY_ROI[id] ?? DEFAULT_DAILY_ROI;
}

function computeDailyProfit(lockedCapital, strategyId) {
  const locked = Number(lockedCapital) || 0;
  if (locked <= 0) return 0;
  return Number((locked * getStrategyDailyRoi(strategyId)).toFixed(6));
}

module.exports = {
  STRATEGY_DAILY_ROI,
  DEFAULT_DAILY_ROI,
  getStrategyDailyRoi,
  computeDailyProfit,
};
