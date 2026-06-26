const { executeTrade, getTradeStatus } = require("../trading.cjs");
const { TRADING_LEVELS } = require("../lib/tradingLevels.cjs");
const { sendApiError, sendClientError } = require("../lib/apiErrors.cjs");

/**
 * GET /api/trade/status/:userId
 * Optional sync hook supplied by server (chain balance refresh).
 */
async function getTradeStatusHandler(req, res) {
  try {
    const status = await getTradeStatus(req.params.userId);
    res.json(status);
  } catch (error) {
    sendApiError(res, error);
  }
}

/**
 * POST /api/trade/execute
 * Body: { userId } — capital is auto-selected from wallet + team matrix.
 */
async function getTradeLevelsHandler(_req, res) {
  res.set("Cache-Control", "public, max-age=3600");
  res.json({ levels: TRADING_LEVELS });
}

async function postTradeExecuteHandler(req, res) {
  try {
    const userId = req.body?.userId;
    if (!userId) {
      return sendClientError(res, "INVALID_REQUEST", "userId required", 400);
    }

    if (typeof req.syncWalletBalance === "function") {
      await req.syncWalletBalance(userId).catch(() => null);
    }

    const result = await executeTrade(userId);

    if (!result.ok) {
      return sendApiError(
        res,
        {
          code: result.code || "TRADE_EXECUTION_FAILED",
          message: result.error || "Trade execution failed.",
          errorAr: result.errorAr,
        },
        {
          status: result.status || 400,
          extra: {
            requiredCapital: result.requiredCapital,
            requiredTeam: result.requiredTeam,
            cooldown: result.cooldown,
            network: result.network,
          },
        }
      );
    }

    res.json(result);
  } catch (error) {
    sendApiError(res, error);
  }
}

module.exports = {
  getTradeStatusHandler,
  postTradeExecuteHandler,
  getTradeLevelsHandler,
};
