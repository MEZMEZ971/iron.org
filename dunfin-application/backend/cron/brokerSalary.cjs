const { processBrokerSalaryPayouts } = require("../lib/brokerProgram.cjs");

async function runBrokerSalaryCron() {
  return processBrokerSalaryPayouts();
}

module.exports = {
  runBrokerSalaryCron,
};
