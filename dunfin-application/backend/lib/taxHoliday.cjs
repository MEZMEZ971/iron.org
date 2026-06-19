const { trunc6 } = require("./formatNumbers.cjs");

/** User receives 100% of gross profit — platform tax/split removed. */
function splitDailyProfit(_user, grossProfit) {
  const gross = Number(grossProfit) || 0;
  if (gross <= 0) {
    return { grossProfit: 0, userShare: 0, platformShare: 0 };
  }
  return {
    grossProfit: trunc6(gross),
    userShare: trunc6(gross),
    platformShare: 0,
  };
}

module.exports = {
  splitDailyProfit,
};
