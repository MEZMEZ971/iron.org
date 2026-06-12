const { sendClientError } = require("../lib/apiErrors.cjs");

/** @deprecated Amount-based deposit intents removed — users deposit freely to their permanent address. */
async function logDepositIntent(_req, res) {
  return sendClientError(
    res,
    "DEPRECATED",
    "Deposit intents are no longer supported. Use your permanent deposit address.",
    410
  );
}

module.exports = { logDepositIntent };
