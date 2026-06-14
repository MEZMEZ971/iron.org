const { expireDueTrials } = require("../lib/trialBalance.cjs");

async function runTrialExpiryCron() {
  return expireDueTrials();
}

module.exports = {
  runTrialExpiryCron,
};
