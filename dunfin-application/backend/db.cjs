const { prisma } = require("./lib/prisma.cjs");
const {
  mapUserToLegacy,
  decimalToNumber,
  generateReferralCode,
} = require("./lib/userMapper.cjs");
const { allocateUniqueUid } = require("./lib/uidGenerator.cjs");
const { allocateUniqueReferralCode } = require("./lib/referralCodeGenerator.cjs");
const { evictTrialBalance, registrationTrialFields, recordTrialWelcomeBonus } = require("./lib/trialBalance.cjs");
const {
  propagateAffiliateCacheRefresh,
} = require("./lib/affiliateStats.cjs");
const {
  propagateBrokerRankCheckFromReferral,
} = require("./lib/brokerProgram.cjs");
const { trunc6 } = require("./lib/formatNumbers.cjs");
const {
  reconcileAndHealUserWalletBalance,
} = require("./lib/walletBalanceReconciliation.cjs");

const userInclude = {
  deposits: { orderBy: { createdAt: "desc" } },
  trades: { orderBy: { executedAt: "desc" } },
  networkAddresses: true,
};

async function findUserRecord(userId) {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });
  return mapUserToLegacy(row);
}

async function getOrCreateUser(userId, extras = {}) {
  let row = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });

  if (!row) {
    const uid = extras.uid || (await allocateUniqueUid());
    const referralCode =
      extras.referralCode || (await allocateUniqueReferralCode());
    const referredById = extras.referredBy || extras.referredById || null;
    row = await prisma.user.create({
      data: {
        id: userId,
        uid,
        displayName: extras.displayName || null,
        referralCode,
        referredById,
        ...registrationTrialFields(),
        ...(referredById ? { isInvited: true } : {}),
      },
      include: userInclude,
    });
    await recordTrialWelcomeBonus(row.id).catch((err) => {
      console.warn("[trial] welcome ledger for legacy user create:", err.message);
    });
  } else if (Object.keys(extras).length > 0) {
    row = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: extras.displayName,
        referredById: extras.referredBy ?? extras.referredById,
      },
      include: userInclude,
    });
  }

  return mapUserToLegacy(row);
}

async function updateUser(userId, patch) {
  const data = {};

  if (patch.walletBalance !== undefined) data.walletBalance = patch.walletBalance;
  if (patch.trialBalance !== undefined) data.trialBalance = patch.trialBalance;
  if (patch.isTrialActive !== undefined) data.isTrialActive = patch.isTrialActive;
  if (patch.onChainBalance !== undefined) data.onChainBalance = patch.onChainBalance;
  if (patch.tradingCapital !== undefined) data.tradingCapital = patch.tradingCapital;
  if (patch.lockedCapital !== undefined) data.lockedCapital = patch.lockedCapital;
  if (patch.lockedTrialCapital !== undefined) {
    data.lockedTrialCapital = patch.lockedTrialCapital;
  }
  if (patch.activeStrategy !== undefined) data.activeStrategy = patch.activeStrategy;
  if (patch.hasDeposited !== undefined) data.hasDeposited = patch.hasDeposited;
  if (patch.depositAddress !== undefined) data.depositAddress = patch.depositAddress;
  if (patch.displayName !== undefined) data.displayName = patch.displayName;

  if (patch.last_trade_time !== undefined) {
    data.lastTradeTime = patch.last_trade_time
      ? new Date(patch.last_trade_time)
      : null;
  }

  if (patch.tradeSessionEndsAt !== undefined) {
    data.tradeSessionEndsAt = patch.tradeSessionEndsAt
      ? new Date(patch.tradeSessionEndsAt)
      : null;
  }

  const row = await prisma.user.update({
    where: { id: userId },
    data,
    include: userInclude,
  });

  if (patch.lastTrade) {
    await appendTradeHistory(userId, patch.lastTrade);
    return findUserRecord(userId);
  }

  return mapUserToLegacy(row);
}

async function saveUser(userId, depositAddress) {
  await getOrCreateUser(userId);
  if (depositAddress) {
    await saveNetworkDepositAddress(userId, "ERC20", depositAddress);
    const row = await prisma.user.update({
      where: { id: userId },
      data: { depositAddress },
      include: userInclude,
    });
    return mapUserToLegacy(row);
  }
  return findUserRecord(userId);
}

async function saveNetworkDepositAddress(userId, network, address, meta = {}) {
  await getOrCreateUser(userId);

  await prisma.networkDepositAddress.upsert({
    where: {
      userId_network: { userId, network },
    },
    create: {
      userId,
      network,
      address,
      txHash: meta.txHash || null,
      tron: Boolean(meta.tron),
    },
    update: {
      address,
      txHash: meta.txHash || null,
      tron: meta.tron !== undefined ? Boolean(meta.tron) : undefined,
    },
  });

  if (network === "ERC20") {
    await prisma.user.update({
      where: { id: userId },
      data: { depositAddress: address },
    });
  }

  return findUserRecord(userId);
}

async function getNetworkDepositAddress(userId, network) {
  const row = await prisma.networkDepositAddress.findUnique({
    where: { userId_network: { userId, network } },
  });
  return row?.address ?? null;
}

async function registerUser(userId, { referredBy } = {}) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) {
    return { user: mapUserToLegacy(await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude,
    })), created: false };
  }

  if (referredBy) {
    const referrer = await prisma.user.findUnique({ where: { id: referredBy } });
    if (!referrer) {
      const err = new Error("Referrer not found");
      err.code = "REFERRER_NOT_FOUND";
      throw err;
    }
  }

  if (referredBy === userId) {
    const err = new Error("Cannot refer yourself");
    err.code = "SELF_REFERRAL";
    throw err;
  }

  const uid = await allocateUniqueUid();
  const referralCode = await allocateUniqueReferralCode();
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        id: userId,
        uid,
        referralCode,
        referredById: referredBy || null,
        ...registrationTrialFields(),
        ...(referredBy ? { isInvited: true } : {}),
      },
    });
    await recordTrialWelcomeBonus(created.id, tx);
    return tx.user.findUnique({
      where: { id: created.id },
      include: userInclude,
    });
  });

  if (referredBy) {
    await propagateBrokerRankCheckFromReferral(referredBy).catch((err) => {
      console.warn("[broker] rank check after legacy register:", err.message);
    });
  }

  return { user: mapUserToLegacy(row), created: true };
}

async function recordDeposit(userId, { amount, txHash, network } = {}) {
  await getOrCreateUser(userId);
  const depositAmount = trunc6(Number(amount) || 0);
  if (depositAmount <= 0) {
    return findUserRecord(userId);
  }

  const normalizedTxHash = txHash ? String(txHash).trim() : null;

  if (normalizedTxHash) {
    const existing = await prisma.deposit.findUnique({
      where: { txHash: normalizedTxHash },
    });
    if (existing) {
      await reconcileAndHealUserWalletBalance(userId, { heal: true });
      return findUserRecord(userId);
    }
  }

  const row = await prisma.$transaction(async (tx) => {
    if (normalizedTxHash) {
      const dupe = await tx.deposit.findUnique({
        where: { txHash: normalizedTxHash },
      });
      if (dupe) {
        return tx.user.findUnique({
          where: { id: userId },
          include: userInclude,
        });
      }
    }

    try {
      await tx.deposit.create({
        data: {
          userId,
          amount: depositAmount,
          txHash: normalizedTxHash,
        },
      });
    } catch (err) {
      if (err?.code === "P2002" && normalizedTxHash) {
        return tx.user.findUnique({
          where: { id: userId },
          include: userInclude,
        });
      }
      throw err;
    }

    return tx.user.update({
      where: { id: userId },
      data: {
        hasDeposited: true,
        walletBalance: { increment: depositAmount },
      },
      include: userInclude,
    });
  });

  await evictTrialBalance(userId);

  const referrer = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredById: true },
  });
  if (referrer?.referredById) {
    await propagateBrokerRankCheckFromReferral(referrer.referredById).catch((err) => {
      console.warn("[broker] rank check after deposit:", err.message);
    });
  }

  propagateAffiliateCacheRefresh(userId).catch((err) => {
    console.warn("[affiliate-stats] propagate after deposit:", err.message);
  });

  return mapUserToLegacy(row);
}

async function setWalletBalanceFromChain(userId, onChainBalance) {
  const user = await getOrCreateUser(userId);
  const locked = Number(user.lockedCapital) || 0;
  const onChain = Number(onChainBalance) || 0;
  const prevOnChain = Number(user.onChainBalance) || 0;
  const incomingDelta = trunc6(Math.max(0, onChain - prevOnChain));

  if (incomingDelta > 0) {
    await recordDeposit(userId, {
      amount: incomingDelta,
      network: "EVM",
    });
  }

  const refreshed = await getOrCreateUser(userId);
  const chainAvailable = Math.max(0, onChain - locked);
  const currentWallet = Number(refreshed.walletBalance) || 0;
  const walletBalance = Math.max(currentWallet, chainAvailable);

  const row = await prisma.user.update({
    where: { id: userId },
    data: {
      onChainBalance: onChain,
      walletBalance,
      hasDeposited: onChain > 0 || refreshed.hasDeposited,
    },
    include: userInclude,
  });

  return mapUserToLegacy(row);
}

async function appendTradeHistory(userId, entry) {
  const row = await prisma.trade.create({
    data: {
      userId,
      capitalAmount: entry.capitalAmount,
      strategyId: entry.strategyId,
      teamActiveAtExecution: entry.teamActiveAtExecution || 0,
      walletBalanceAfter: entry.walletBalanceAfter ?? null,
      executedAt: entry.executedAt ? new Date(entry.executedAt) : new Date(),
    },
  });
  return row;
}

async function getAllUsers() {
  const rows = await prisma.user.findMany({ include: userInclude });
  const map = {};
  for (const row of rows) {
    const legacy = mapUserToLegacy(row);
    map[legacy.id] = legacy;
  }
  return map;
}

async function getUser(userId) {
  return findUserRecord(userId);
}

module.exports = {
  saveUser,
  saveNetworkDepositAddress,
  getNetworkDepositAddress,
  getOrCreateUser,
  updateUser,
  registerUser,
  recordDeposit,
  setWalletBalanceFromChain,
  appendTradeHistory,
  getAllUsers,
  getUser,
  prisma,
};
