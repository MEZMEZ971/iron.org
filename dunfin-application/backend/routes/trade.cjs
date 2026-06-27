const { executeTrade, getTradeStatus } = require("../trading.cjs");
const { TRADING_LEVELS } = require("../lib/tradingLevels.cjs");
const { sendApiError, sendClientError } = require("../lib/apiErrors.cjs");

/**
 * GET /api/trade/status/:userId
 * Optional sync hook supplied by server (chain balance refresh).
 */
async function getTradeStatusHandler(req, res) {
  try {
    const status = await getTradeStatus(req.auth.userId);
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
    const userId = req.auth.userId;
    const bodyUserId = req.body?.userId;
    if (bodyUserId && bodyUserId !== userId) {
      return sendClientError(
        res,
        "FORBIDDEN",
        "You can only execute trades for your own account",
        403
      );
    }

    // Ledger-aware execution — skip chain sync to avoid clobbering reward balances
    // and racing profile hydration writes (P2034) during trade lock.
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
    if (error?.code === "P2034" || error?.code === "P2028") {
      console.error("[trade/execute] transaction conflict after retries:", error);
      return sendClientError(
        res,
        "TRADE_LOCK_CONFLICT",
        "Trade could not be locked. Refresh and try again.",
        409
      );
    }
    sendApiError(res, error);
  }
}

module.exports = {
  getTradeStatusHandler,
  postTradeExecuteHandler,
  getTradeLevelsHandler,
};
