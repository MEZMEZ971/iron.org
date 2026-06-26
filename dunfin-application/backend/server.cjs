require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const { formatUnits } = require("viem");
const db = require("./db.cjs");
const {
  ACTIVE_FACTORY_ADDRESS,
  USDT_ADDRESS,
  FACTORY_ABI,
  ERC20_ABI,
  getBlockchainClients,
  getDepositClients,
  getStartupSummary,
  validateRpcChainId,
} = require("./config/crypto.cjs");
const { prisma } = require("./lib/prisma.cjs");
const {
  getTradeStatusHandler,
  postTradeExecuteHandler,
  getTradeLevelsHandler,
} = require("./routes/trade.cjs");
const { getTradeStatus } = require("./trading.cjs");
const { getTradeEarnings } = require("./earnings.cjs");
const { processDuePayouts } = require("./cron/payouts.cjs");
const { runSleepAccountWakeUpCron } = require("./cron/sleepAccounts.cjs");
const { runDepositWatcherCycle } = require("./cron/depositWatcher.cjs");
const { runTrialExpiryCron } = require("./cron/trialExpiry.cjs");
const { runBrokerSalaryCron } = require("./cron/brokerSalary.cjs");
const {
  runTronSweepCycle,
  isSweeperConfigured,
} = require("./cron/tronSweeper.cjs");
const cron = require("node-cron");
const {
  getEffectiveTradingBalance,
  getWithdrawableBalance,
  isTrialCurrentlyActive,
} = require("./lib/trialBalance.cjs");
const {
  checkAndUpgradeBrokerRank,
  buildBrokerRows,
  adminPayoutBrokerSalaries,
} = require("./lib/brokerProgram.cjs");
const { STRATEGIES } = require("./strategies.cjs");
const { getDepositAddress, NETWORKS } = require("./deposit.cjs");
const { getKycStatus, submitKyc } = require("./kyc.cjs");
const { getInviteInfo } = require("./inviteService.cjs");
const { getTeamAnalytics } = require("./teamAnalytics.cjs");
const { registerUser: registerAuthUser, loginUser } = require("./authService.cjs");
const {
  findReferrerByInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} = require("./lib/referralCodeGenerator.cjs");
const { requireAuth, adminRequired } = require("./middleware/auth.cjs");
const {
  getAdminStats,
  listPendingWithdrawals,
  actOnWithdrawal,
  listPendingKyc,
  actOnKyc,
  getAdminSession,
  lookupUserByUid,
  mutateUserBalance,
  toggleUserAccountStatus,
  getActivityAnalytics,
  dispatchWakeUpNotifications,
  getUserFinanceSummary,
} = require("./routes/admin.cjs");
const {
  sendEmailVerificationCode,
  updateUserProfile,
} = require("./profileUpdate.cjs");
const { trunc6 } = require("./lib/formatNumbers.cjs");
const { computeDailyProfit } = require("./lib/strategyRoi.cjs");
const { mapUserToLegacy } = require("./lib/userMapper.cjs");
const { buildBrokerProfileSnapshot } = require("./lib/brokerProgram.cjs");
const {
  reconcileAndHealUserWalletBalance,
} = require("./lib/walletBalanceReconciliation.cjs");
const {
  sendApiError,
  sendClientError,
  installProcessHandlers,
  notFoundApiHandler,
  errorMiddleware,
} = require("./lib/apiErrors.cjs");
const {
  getWithdrawPreflight,
  listWithdrawals,
  processWithdraw,
  saveWithdrawalAddress,
} = require("./withdraw.cjs");
const { buildSavedWithdrawalAddresses } = require("./lib/savedWithdrawalAddresses.cjs");
const { spinWheel, getWheelStatus } = require("./routes/rewards.cjs");
const { getAllowedCorsOrigins, trimOrigin } = require("./lib/appUrls.cjs");

const app = express();
installProcessHandlers();

const ALLOWED_CORS_ORIGINS = getAllowedCorsOrigins();

if (
  process.env.NODE_ENV === "production" &&
  ALLOWED_CORS_ORIGINS !== "*" &&
  ALLOWED_CORS_ORIGINS.length === 0
) {
  console.warn(
    "[cors] No origins configured. Set FRONTEND_URL and/or ALLOWED_ORIGINS."
  );
}

const corsOptions = {
  origin(origin, callback) {
    if (ALLOWED_CORS_ORIGINS === "*") {
      return callback(null, true);
    }
    // Allow non-browser clients (curl, health checks) with no Origin header.
    if (!origin) {
      return callback(null, true);
    }
    const normalized = trimOrigin(origin);
    const allowed = ALLOWED_CORS_ORIGINS.some(
      (entry) => trimOrigin(entry) === normalized
    );
    if (allowed) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

// CORS must be first — before body parsers and route handlers.
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "iron-api" });
});

const { publicClient, walletClient } = getBlockchainClients();

const depositClients = () => getDepositClients();

async function syncWalletBalanceFromChain(userId, forwarderAddressOverride) {
  const user = await db.getUser(userId);
  const forwarder = forwarderAddressOverride || user?.depositAddress;
  if (!forwarder) return user;

  const balance = await publicClient.readContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [forwarder],
  });

  return await db.setWalletBalanceFromChain(userId, Number(formatUnits(balance, 6)));
}

app.get("/api/deposit/address", async (req, res) => {
  try {
    const userId = req.query.userId;
    const network = (req.query.network || "ERC20").toUpperCase();
    if (!userId) return sendClientError(res, "INVALID_REQUEST", "userId required", 400);
    if (!NETWORKS[network]) {
      return sendClientError(
        res,
        "INVALID_NETWORK",
        "Invalid network. Use ERC20, BEP20, or TRC20.",
        400
      );
    }

    const result = await getDepositAddress(userId, network, depositClients());
    if (network === "ERC20") {
      await syncWalletBalanceFromChain(userId).catch(() => null);
    }
    res.json(result);
  } catch (error) {
    sendApiError(res, error);
  }
});

/** Authenticated permanent deposit address (default TRC20). */
app.get("/api/user/deposit-address", requireAuth, async (req, res) => {
  try {
    const network = (req.query.network || "TRC20").toUpperCase();
    const currency = String(req.query.currency || "USDT").toUpperCase();
    if (!NETWORKS[network]) {
      return sendClientError(
        res,
        "INVALID_NETWORK",
        "Invalid network. Use ERC20, BEP20, or TRC20.",
        400
      );
    }

    const userId = req.auth.userId;
    const result = await getDepositAddress(
      userId,
      network,
      depositClients(),
      currency
    );
    if (network === "ERC20" || network === "BEP20") {
      await syncWalletBalanceFromChain(userId, result.depositAddress).catch(
        () => null
      );
    }

    res.json({
      success: true,
      depositAddress: result.depositAddress,
      userId: result.userId,
      currency: result.currency,
      network: result.network,
      networkLabel: result.networkLabel,
      addressType: result.addressType,
    });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/deposit-address", async (req, res) => {
  try {
    const { userId, network = "ERC20" } = req.body;
    if (!userId) return sendClientError(res, "INVALID_REQUEST", "userId required", 400);

    const result = await getDepositAddress(
      userId,
      String(network).toUpperCase(),
      depositClients()
    );
    if (result.network === "ERC20") {
      await syncWalletBalanceFromChain(userId).catch(() => null);
    }
    res.json({
      success: true,
      depositAddress: result.depositAddress,
      userId: result.userId,
      network: result.network,
      new: result.new,
      txHash: result.txHash,
    });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/balance/:address", async (req, res) => {
  try {
    const balance = await publicClient.readContract({
      address: USDT_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [req.params.address],
    });

    res.json({
      address: req.params.address,
      balance: formatUnits(balance, 6),
      raw: balance.toString(),
    });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/flush", async (req, res) => {
  try {
    const { addresses } = req.body;
    const hash = await walletClient.writeContract({
      address: ACTIVE_FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "batchFlushTokens",
      args: [addresses, USDT_ADDRESS],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    res.json({ success: true, txHash: hash });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      username,
      email,
      phone,
      phoneCountryCode,
      password,
      invitationCode: bodyInvitationCode,
      referralCode: bodyReferralCode,
      ref: bodyRef,
    } = req.body;

    const invitationCode =
      [bodyInvitationCode, bodyReferralCode, bodyRef]
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .find(Boolean) || undefined;

    const result = await registerAuthUser({
      username,
      email,
      phone,
      phoneCountryCode,
      password,
      invitationCode,
    });

    try {
      await getDepositAddress(result.user.id, "ERC20", depositClients());
      await getDepositAddress(result.user.id, "BEP20", depositClients());
      await getDepositAddress(result.user.id, "TRC20", depositClients());
    } catch (forwarderErr) {
      if (forwarderErr.code === "TRON_MASTER_SECRET_MISSING") {
        throw forwarderErr;
      }
      console.warn("[auth] register forwarder setup:", forwarderErr.message);
    }

    res.status(201).json({
      success: true,
      token: result.token,
      user: result.user,
      trial: {
        amount: result.user.trialBalance ?? 100,
        isTrialActive: result.user.isTrialActive ?? true,
        trialExpiresAt: result.user.trialExpiresAt ?? null,
      },
    });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return sendClientError(
        res,
        "INVALID_REQUEST",
        "identifier and password required",
        400
      );
    }

    const result = await loginUser({ identifier, password }, depositClients());
    res.json(result);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/auth/referral/:code", async (req, res) => {
  try {
    const code = normalizeInviteCode(req.params.code);
    if (!isValidInviteCode(code)) {
      return sendClientError(res, "REFERRER_NOT_FOUND", "Invalid invitation code.", 404);
    }
    const referrerId = await findReferrerByInviteCode(code);
    if (!referrerId) {
      return sendClientError(res, "REFERRER_NOT_FOUND", "Invitation code not found.", 404);
    }
    const referrer = await prisma.user.findUnique({
      where: { id: referrerId },
      select: { uid: true, username: true, displayName: true, referralCode: true },
    });
    res.json({
      valid: true,
      code: referrer.referralCode,
      referrer: {
        uid: referrer.uid,
        username: referrer.username,
        displayName: referrer.displayName,
      },
    });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/users", async (req, res) => {
  try {
    res.json(await db.getAllUsers());
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/users/register", async (req, res) => {
  try {
    const { userId, referredBy } = req.body;
    if (!userId) return sendClientError(res, "INVALID_REQUEST", "userId required", 400);
    const result = await db.registerUser(userId, { referredBy });
    res.json({ success: true, ...result });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/users/:userId/sync-balance", async (req, res) => {
  try {
    const user = await syncWalletBalanceFromChain(req.params.userId);
    if (!user?.depositAddress) {
      return sendClientError(res, "NOT_FOUND", "User has no deposit address", 404);
    }
    res.json({
      success: true,
      walletBalance: user.walletBalance,
      onChainBalance: user.onChainBalance,
      lockedCapital: user.lockedCapital,
    });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/users/:userId/deposit", async (req, res) => {
  try {
    const { amount, txHash } = req.body;
    const user = await db.recordDeposit(req.params.userId, { amount, txHash });
    res.json({ success: true, user });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/admin/me", adminRequired, async (req, res) => {
  try {
    const user = await getAdminSession(req.auth.userId);
    res.json({ success: true, user });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/admin/stats", adminRequired, async (req, res) => {
  try {
    res.json(await getAdminStats());
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/admin/withdrawals", adminRequired, async (req, res) => {
  try {
    const withdrawals = await listPendingWithdrawals();
    res.json({ withdrawals });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/admin/withdrawals/:id/action", adminRequired, async (req, res) => {
  try {
    const result = await actOnWithdrawal(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    sendApiError(res, error, {
      status: ["NOT_FOUND", "INVALID_STATE", "INVALID_ACTION"].includes(error.code)
        ? 400
        : 500,
    });
  }
});

app.get("/api/admin/kyc", adminRequired, async (req, res) => {
  try {
    const submissions = await listPendingKyc();
    res.json({ submissions });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/admin/kyc/:id/action", adminRequired, async (req, res) => {
  try {
    const result = await actOnKyc(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    sendApiError(res, error, {
      status: ["NOT_FOUND", "INVALID_STATE", "INVALID_ACTION"].includes(error.code)
        ? 400
        : 500,
    });
  }
});

function adminClientErrorStatus(code) {
  if (code === "NOT_FOUND") return 404;
  if (code === "FORBIDDEN_TARGET" || code === "SELF_SUSPEND") return 403;
  if (
    code === "INVALID_UID" ||
    code === "INVALID_ACTION" ||
    code === "INVALID_AMOUNT" ||
    code === "INVALID_STATUS" ||
    code === "INSUFFICIENT_BALANCE"
  ) {
    return 400;
  }
  return 500;
}

app.get("/api/admin/users/lookup/:uid", adminRequired, async (req, res) => {
  try {
    const result = await lookupUserByUid(req.params.uid);
    res.json(result);
  } catch (error) {
    sendApiError(res, error, { status: adminClientErrorStatus(error.code) });
  }
});

app.post("/api/admin/users/:uid/mutate-balance", adminRequired, async (req, res) => {
  try {
    const { action, amount } = req.body ?? {};
    const result = await mutateUserBalance(
      req.params.uid,
      { action, amount },
      req.adminUser
    );
    res.status(200).json(result);
  } catch (error) {
    sendApiError(res, error, { status: adminClientErrorStatus(error.code) });
  }
});

app.post("/api/admin/users/:uid/toggle-status", adminRequired, async (req, res) => {
  try {
    const result = await toggleUserAccountStatus(
      req.params.uid,
      req.body,
      req.adminUser
    );
    res.json(result);
  } catch (error) {
    sendApiError(res, error, { status: adminClientErrorStatus(error.code) });
  }
});

app.get("/api/admin/analytics/activity", adminRequired, async (_req, res) => {
  try {
    const data = await getActivityAnalytics();
    res.json({ success: true, ...data });
  } catch (error) {
    sendApiError(res, error, { status: 500, success: false });
  }
});

app.get("/api/admin/finance/user-summary", adminRequired, async (req, res) => {
  try {
    const { search, page, limit } = req.query ?? {};
    const data = await getUserFinanceSummary({ search, page, limit });
    res.json({ success: true, ...data });
  } catch (error) {
    sendApiError(res, error, { status: 500, success: false });
  }
});

app.get("/api/admin/brokers", adminRequired, async (_req, res) => {
  try {
    const brokers = await buildBrokerRows();
    const eligible = brokers.filter((b) => b.salaryEligible);
    const estimatedPayoutUsdt = trunc6(
      eligible.reduce((sum, b) => sum + b.calculatedSalary, 0)
    );
    res.json({
      success: true,
      brokers,
      summary: {
        totalBrokers: brokers.length,
        eligibleForPayout: eligible.length,
        estimatedPayoutUsdt,
      },
    });
  } catch (error) {
    sendApiError(res, error, { status: 500, success: false });
  }
});

app.post("/api/admin/brokers/payout-salaries", adminRequired, async (req, res) => {
  try {
    const force = req.body?.force === true;
    const result = await adminPayoutBrokerSalaries({ force });
    res.json(result);
  } catch (error) {
    sendApiError(res, error, { status: 500, success: false });
  }
});

app.post(
  "/api/admin/notifications/wake-up-sleepers",
  adminRequired,
  async (_req, res) => {
    try {
      const result = await dispatchWakeUpNotifications({ skipRecentHours: 24 });
      res.json({ success: true, ...result });
    } catch (error) {
      sendApiError(res, error, { status: 500, success: false });
    }
  }
);

app.get("/api/wallet/withdraw/preflight", requireAuth, async (req, res) => {
  try {
    const data = await getWithdrawPreflight(req.auth.userId);
    res.json(data);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/wallet/withdrawals", requireAuth, async (req, res) => {
  try {
    const withdrawals = await listWithdrawals(req.auth.userId);
    res.json({ withdrawals });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/wallet/withdraw", requireAuth, async (req, res) => {
  try {
    const result = await processWithdraw(req.auth.userId, req.body);
    res.json(result);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.put("/api/wallet/withdrawal-address", requireAuth, async (req, res) => {
  try {
    const result = await saveWithdrawalAddress(req.auth.userId, req.body);
    res.json(result);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/users/profile/send-email-otp", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { email } = req.body;
    if (!email) return sendClientError(res, "INVALID_REQUEST", "email required", 400);
    const result = await sendEmailVerificationCode(userId, email);
    res.json(result);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/rewards/wheel-status", requireAuth, getWheelStatus);
app.post("/api/rewards/spin-wheel", requireAuth, spinWheel);

app.post("/api/users/profile/update", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await updateUserProfile(userId, req.body);
    res.json({ success: true, user });
  } catch (error) {
    sendApiError(res, error);
  }
});

async function loadProfileUserSnapshot(userId) {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      uid: true,
      email: true,
      username: true,
      displayName: true,
      walletBalance: true,
      trialBalance: true,
      isTrialActive: true,
      trialExpiresAt: true,
      lockedCapital: true,
      onChainBalance: true,
      tradingCapital: true,
      activeStrategy: true,
      lastTradeTime: true,
      hasDeposited: true,
      savedWithdrawalAddressErc20: true,
      savedWithdrawalAddressBep20: true,
      savedWithdrawalAddressTrc20: true,
      brokerRank: true,
      lastSalaryPayoutAt: true,
      cachedFundedDownlineCount: true,
    },
  });
  if (!row) return null;

  const [deposits, trades] = await Promise.all([
    prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.trade.findMany({
      where: { userId },
      orderBy: { executedAt: "desc" },
      take: 40,
    }),
  ]);

  return mapUserToLegacy({
    ...row,
    referredById: null,
    referralCode: "",
    hasDeposited: row.hasDeposited,
    deposits,
    trades,
    networkAddresses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function scheduleProfileBackgroundSync(userId) {
  setImmediate(() => {
    reconcileAndHealUserWalletBalance(userId, { heal: true }).catch(() => {});
    syncWalletBalanceFromChain(userId).catch(() => {});
    checkAndUpgradeBrokerRank(userId).catch(() => {});
  });
}

async function buildUserProfileResponse(userId) {
  scheduleProfileBackgroundSync(userId);

  let user = await loadProfileUserSnapshot(userId);
  if (!user) {
    await db.getOrCreateUser(userId);
    user = await loadProfileUserSnapshot(userId);
  }
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const [trade, pendingWithdrawals, brokerRow] = await Promise.all([
    getTradeStatus(userId),
    sumPendingWithdrawals(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        brokerRank: true,
        lastSalaryPayoutAt: true,
        cachedFundedDownlineCount: true,
      },
    }),
  ]);

  const locked = Number(user.lockedCapital) || 0;
  const walletOnly = Number(user.walletBalance) || 0;
  const trialBalance = isTrialCurrentlyActive(user)
    ? Number(user.trialBalance) || 0
    : 0;
  const available = getEffectiveTradingBalance(user);
  const withdrawable = getWithdrawableBalance(user);
  const onChain = Number(user.onChainBalance) || walletOnly + locked;

  const transactions = await buildTransactionFeed(user.id, user);
  const todayPnl = estimateTodayPnl(user, locked);
  const totalPnl = estimateTotalPnl(user);
  const broker = buildBrokerProfileSnapshot(
    brokerRow?.cachedFundedDownlineCount ?? 0,
    brokerRow?.brokerRank ?? "NONE",
    brokerRow?.lastSalaryPayoutAt ?? null
  );

  return {
    userId,
    uid: user.uid,
    email: user.email ?? null,
    username: user.username ?? null,
    displayName: user.displayName || userId,
    walletBalance: trunc6(walletOnly),
    trialBalance: trunc6(trialBalance),
    isTrialActive: Boolean(user.isTrialActive),
    trialExpiresAt: user.trialExpiresAt ?? null,
    withdrawableBalance: trunc6(withdrawable),
    lockedCapital: trunc6(locked),
    onChainBalance: trunc6(onChain),
    tradingCapital: trunc6(user.tradingCapital),
    activeStrategy: user.activeStrategy ?? null,
    fundAccount: trunc6(available),
    tradingAccount: trunc6(locked),
    todayPnl: trunc6(todayPnl),
    totalPnl: trunc6(totalPnl),
    affiliate: trade.affiliate,
    tradeHistory: user.tradeHistory || [],
    deposits: user.deposits || [],
    transactions,
    assets: buildAssetLedger(available, locked, pendingWithdrawals),
    pendingWithdrawals: trunc6(pendingWithdrawals),
    savedWithdrawalAddresses: buildSavedWithdrawalAddresses(user),
    broker,
  };
}

/** JWT profile — must be registered before `/api/users/:userId/profile` */
app.get("/api/users/profile", requireAuth, async (req, res) => {
  try {
    res.json(await buildUserProfileResponse(req.auth.userId));
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/users/profile/sync-balance", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    await reconcileAndHealUserWalletBalance(userId, { heal: true });
    await syncWalletBalanceFromChain(userId).catch(() => null);
    const user = await db.getOrCreateUser(userId);
    const trialBalance = isTrialCurrentlyActive(user)
    ? Number(user.trialBalance) || 0
    : 0;
    const fundAccount = getEffectiveTradingBalance(user);
    res.json({
      success: true,
      walletBalance: trunc6(Number(user.walletBalance) || 0),
      trialBalance: trunc6(trialBalance),
      isTrialActive: Boolean(user.isTrialActive),
      fundAccount: trunc6(fundAccount),
      onChainBalance: user.onChainBalance,
      lockedCapital: user.lockedCapital,
    });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/users/:userId/profile", async (req, res) => {
  try {
    if (req.params.userId === "profile") {
      return sendClientError(
        res,
        "NOT_FOUND",
        "Use GET /api/users/profile with Authorization Bearer token",
        404
      );
    }
    res.json(await buildUserProfileResponse(req.params.userId));
  } catch (error) {
    sendApiError(res, error);
  }
});

const PENDING_WITHDRAWAL_STATUSES = ["PROCESSING", "PENDING_REVIEW"];

async function sumPendingWithdrawals(userId) {
  const agg = await prisma.withdrawalRecord.aggregate({
    where: {
      userId,
      status: { in: PENDING_WITHDRAWAL_STATUSES },
    },
    _sum: { amount: true },
  });
  return trunc6(agg._sum.amount);
}

function mapWithdrawalFeedStatus(status) {
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "REJECTED") return "REJECTED";
  return "PENDING";
}

function buildAssetLedger(available, locked, pendingWithdrawals) {
  const pendingFreeze = Number(pendingWithdrawals) || 0;
  const usdtTotal = trunc6(available + locked + pendingFreeze);
  return [
    {
      symbol: "USDT",
      total: usdtTotal,
      available: trunc6(available),
      freeze: pendingFreeze,
    },
    {
      symbol: "BTC",
      total: 0,
      available: 0,
      freeze: 0,
    },
    {
      symbol: "USDC",
      total: 0,
      available: 0,
      freeze: 0,
    },
  ];
}

async function buildTransactionFeed(userId, user) {
  const rows = [];
  const [txnRecords, withdrawalRecords] = await Promise.all([
    prisma.transactionRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.withdrawalRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  for (const e of txnRecords) {
    const isLucky = e.type === "LUCKY_WHEEL_REWARD";
    const isTrialWelcome = e.type === "TRIAL_WELCOME_BONUS";
    const isBrokerBonus = e.type === "BROKER_RANK_UPGRADE_BONUS";
    const isBrokerSalary = e.type === "BROKER_SALARY";
    const isReward =
      e.type === "ADMIN_REWARD" ||
      isLucky ||
      isTrialWelcome ||
      isBrokerBonus ||
      isBrokerSalary;
    rows.push({
      id: e.id,
      type: isLucky
        ? "Lucky Wheel"
        : isTrialWelcome
          ? "Welcome Trial"
          : isBrokerBonus
          ? "Broker Rank Bonus"
          : isBrokerSalary
            ? "Broker Salary"
            : isReward
              ? "Admin Reward"
              : "Admin Deduction",
      amount: trunc6(e.amount),
      currency:
        isLucky && String(e.description || "").includes("DADB")
          ? "DADB"
          : "USDT",
      status: e.status === "SUCCESS" ? "COMPLETED" : e.status,
      timestamp: e.createdAt.toISOString(),
      commission: null,
    });
  }
  for (const w of withdrawalRecords) {
    rows.push({
      id: `wd-${w.id}`,
      type: "Withdrawal",
      amount: -trunc6(w.amount),
      currency: w.currency,
      status: mapWithdrawalFeedStatus(w.status),
      timestamp: w.createdAt.toISOString(),
      commission: null,
    });
  }
  for (const d of user.deposits || []) {
    rows.push({
      id: `dep-${d.at}`,
      type: "Deposit",
      amount: d.amount,
      currency: "USDT",
      status: "COMPLETED",
      timestamp: d.at,
      commission: null,
    });
  }
  for (const t of user.tradeHistory || []) {
    rows.push({
      id: `trade-${t.executedAt}`,
      type: "AI Trade",
      amount: t.capitalAmount,
      currency: "USDT",
      status: "LOCKED",
      timestamp: t.executedAt,
      commission: null,
      strategyId: t.strategyId,
    });
  }
  rows.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return rows.slice(0, 40);
}

function estimateTodayPnl(user, locked) {
  if (!user.last_trade_time || locked <= 0) return 0;
  const last = new Date(user.last_trade_time).getTime();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  if (last < dayStart.getTime()) return 0;
  return computeDailyProfit(locked, user.activeStrategy);
}

function estimateTotalPnl(user) {
  const history = user.tradeHistory || [];
  if (!history.length) return 0;
  return Number(
    history
      .reduce(
        (sum, t) =>
          sum + computeDailyProfit(t.capitalAmount || 0, t.strategyId),
        0
      )
      .toFixed(2)
  );
}

app.get("/api/users/:userId/kyc", async (req, res) => {
  try {
    const status = await getKycStatus(req.params.userId);
    if (!status) return sendClientError(res, "NOT_FOUND", "User not found", 404);
    res.json(status);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/users/:userId/kyc/submit", async (req, res) => {
  try {
    const { frontFileName, backFileName } = req.body;
    const result = await submitKyc(req.params.userId, {
      frontFileName,
      backFileName,
    });
    res.json(result);
  } catch (error) {
    sendApiError(res, error, {
      status: error.code === "KYC_FILES_REQUIRED" ? 400 : 500,
    });
  }
});

app.get("/api/users/:userId/invite", async (req, res) => {
  try {
    const info = await getInviteInfo(req.params.userId);
    res.json(info);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/team/analytics/:userId", async (req, res) => {
  try {
    await db.getOrCreateUser(req.params.userId);
    const analytics = await getTeamAnalytics(req.params.userId);
    res.json(analytics);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/trade/strategies", (_req, res) => {
  res.set("Cache-Control", "public, max-age=3600");
  res.json({ strategies: STRATEGIES });
});

app.get("/api/trade/levels", getTradeLevelsHandler);

app.get("/api/trade/earnings/:userId", async (req, res) => {
  try {
    await db.getOrCreateUser(req.params.userId);
    const earnings = await getTradeEarnings(req.params.userId);
    if (!earnings.ok) {
      return res.status(earnings.status || 404).json({ error: earnings.error });
    }
    res.json(earnings);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/cron/payouts/run", async (_req, res) => {
  try {
    const result = await processDuePayouts();
    res.json({ ok: true, ...result });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.use((req, _res, next) => {
  req.syncWalletBalance = syncWalletBalanceFromChain;
  next();
});

app.get("/api/trade/status/:userId", getTradeStatusHandler);
app.post("/api/trade/execute", postTradeExecuteHandler);

// API-only gateway — frontend is hosted separately on Vercel.
app.use(notFoundApiHandler);

app.use((req, res) => {
  sendClientError(res, "NOT_FOUND", "Not found.", 404);
});

app.use(errorMiddleware);

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

const PAYOUT_CRON_MS = Number(process.env.PAYOUT_CRON_MS) || 60_000;
setInterval(() => {
  processDuePayouts().catch((err) => {
    console.warn("[payouts] cron tick failed:", err.message);
  });
}, PAYOUT_CRON_MS);

const SLEEP_CRON_MS = Number(process.env.SLEEP_CRON_MS) || 24 * 60 * 60 * 1000;
setInterval(() => {
  runSleepAccountWakeUpCron().catch((err) => {
    console.warn("[sleep-cron] tick failed:", err.message);
  });
}, SLEEP_CRON_MS);

const DEPOSIT_WATCHER_MS = Math.max(
  Number(process.env.DEPOSIT_WATCHER_MS) || 30_000,
  20_000
);
setInterval(() => {
  runDepositWatcherCycle().catch((err) => {
    console.warn("[deposit-watcher] tick failed:", err.message);
  });
}, DEPOSIT_WATCHER_MS);

const TRIAL_EXPIRY_CRON_MS = Number(process.env.TRIAL_EXPIRY_CRON_MS) || 60_000;
setInterval(() => {
  runTrialExpiryCron().catch((err) => {
    console.warn("[trial-expiry] tick failed:", err.message);
  });
}, TRIAL_EXPIRY_CRON_MS);

const BROKER_SALARY_CRON_MS =
  Number(process.env.BROKER_SALARY_CRON_MS) || 60 * 60 * 1000;
setInterval(() => {
  runBrokerSalaryCron().catch((err) => {
    console.warn("[broker-salary] tick failed:", err.message);
  });
}, BROKER_SALARY_CRON_MS);

function startHttpServer() {
  app.listen(PORT, HOST, () => {
    const cryptoSummary = getStartupSummary();
    console.log(`IRON API listening on ${HOST}:${PORT}`);
    console.log(
      `CORS origins: ${
        ALLOWED_CORS_ORIGINS === "*"
          ? "* (reflective)"
          : ALLOWED_CORS_ORIGINS.join(", ") || "(none configured)"
      }`
    );
    console.log(
      `Network: ${cryptoSummary.network} (chainId ${cryptoSummary.chainId})`
    );
    console.log(`Active factory: ${cryptoSummary.activeFactory}`);
    if (cryptoSummary.legacyFactory) {
      console.log(`Legacy factory: ${cryptoSummary.legacyFactory}`);
    }
    console.log(
      `Main partner wallet: ${cryptoSummary.mainPartnerWallet ?? "(not set)"}`
    );
    console.log(`USDT: ${cryptoSummary.usdt}`);
    if (cryptoSummary.usdc) {
      console.log(`USDC: ${cryptoSummary.usdc}`);
    }
    if (cryptoSummary.deployerKeyPlaceholder) {
      console.warn(
        "⚠️ Deployer wallet: dummy placeholder key active — set a valid 64-char DEPLOYER_PRIVATE_KEY in backend/.env for on-chain writes."
      );
    }
    console.log(`Payout cron every ${PAYOUT_CRON_MS}ms`);
    console.log(`Sleep-account wake-up cron every ${SLEEP_CRON_MS}ms`);
    console.log(`Deposit watcher every ${DEPOSIT_WATCHER_MS}ms`);
    console.log(`Trial expiry cron every ${TRIAL_EXPIRY_CRON_MS}ms`);
    console.log(`Broker salary cron every ${BROKER_SALARY_CRON_MS}ms`);
    if (isSweeperConfigured()) {
      const tronSweepCron = process.env.TRON_SWEEPER_CRON || "0 * * * *";
      cron.schedule(tronSweepCron, () => {
        runTronSweepCycle().catch((err) => {
          console.warn("[tron-sweeper] tick failed:", err.message);
        });
      });
      console.log(`Tron TRC20 sweeper cron: ${tronSweepCron}`);
      void runTronSweepCycle().catch((err) => {
        console.warn("[tron-sweeper] initial cycle failed:", err.message);
      });
    } else {
      console.log(
        "Tron TRC20 sweeper disabled (set TRON_DEPOSIT_MASTER_SECRET, TRON_GAS_FUNDER_PRIVATE_KEY, treasury address)"
      );
    }
    void runDepositWatcherCycle().catch((err) => {
      console.warn("[deposit-watcher] initial cycle failed:", err.message);
    });
  });
}

validateRpcChainId()
  .then((info) => {
    console.log(
      `EVM chain verified: ${info.network} (chainId ${info.chainId})`
    );
  })
  .catch((err) => {
    console.error(
      "[chain-guard] RPC validation failed — starting API anyway; on-chain features may be unavailable:",
      err?.message || err
    );
  })
  .finally(() => {
    startHttpServer();
  });
