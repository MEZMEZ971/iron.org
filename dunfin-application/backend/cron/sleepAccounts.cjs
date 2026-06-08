const { dispatchWakeUpNotifications } = require("../lib/userActivity.cjs");

/**
 * Daily cron: notify sleep accounts that have not received a wake-up in 24h.
 */
async function runSleepAccountWakeUpCron() {
  const result = await dispatchWakeUpNotifications({ skipRecentHours: 24 });
  if (result.sent > 0) {
    console.log(
      `[sleep-cron] Wake-up notifications sent: ${result.sent} (sleepers: ${result.sleepers})`
    );
  }
  return result;
}

module.exports = { runSleepAccountWakeUpCron };
