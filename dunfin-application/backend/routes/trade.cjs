const { executeTrade, getTradeStatus } = require("../trading.cjs");

/**
 * GET /api/trade/status/:userId
 * Optional sync hook supplied by server (chain balance refresh).
 */
async function getTradeStatusHandler(req, res) {
  try {
    if (typeof req.syncWalletBalance === "function") {
      await req.syncWalletBalance(req.params.userId).catch(() => null);
    }
    const status = await getTradeStatus(req.params.userId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/trade/execute
 * Body: { userId } — capital is auto-selected from wallet + team matrix.
 */
async function postTradeExecuteHandler(req, res) {
  try {
    const userId = req.body?.userId;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    if (typeof req.syncWalletBalance === "function") {
      await req.syncWalletBalance(userId).catch(() => null);
    }

    const result = await executeTrade(userId);

    if (!result.ok) {
      return res.status(result.status || 400).json({
        error: result.error,
        errorAr: result.errorAr,
        code: result.code,
        requiredCapital: result.requiredCapital,
        requiredTeam: result.requiredTeam,
        cooldown: result.cooldown,
        network: result.network,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("[trade] execute failed:", error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getTradeStatusHandler,
  postTradeExecuteHandler,
};
