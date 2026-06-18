const { prisma } = require("./lib/prisma.cjs");
const {
  mapUserToLegacy,
  decimalToNumber,
  generateReferralCode,
} = require("./lib/userMapper.cjs");
const { allocateUniqueUid } = require("./lib/uidGenerator.cjs");
const { allocateUniqueReferralCode } = require("./lib/referralCodeGenerator.cjs");
const { inviteRegistrationTaxFields } = require("./lib/taxHoliday.cjs");
const { evictTrialBalance, registrationTrialFields, recordTrialWelcomeBonus } = require("./lib/trialBalance.cjs");
const {
  propagateBrokerRankCheckFromReferral,
} = require("./lib/brokerProgram.cjs");
const { trunc6 } = require("./lib/formatNumbers.cjs");

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
        ...(referredById ? inviteRegistrationTaxFields() : {}),
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
        ...(referredBy ? inviteRegistrationTaxFields() : {}),
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

  if (txHash) {
    const existing = await prisma.deposit.findFirst({
      where: { txHash: String(txHash) },
    });
    if (existing) {
      return findUserRecord(userId);
    }
  }

  await prisma.deposit.create({
    data: {
      userId,
      amount: depositAmount,
      txHash: txHash ? String(txHash) : null,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const newBalance = trunc6(decimalToNumber(user.walletBalance) + depositAmount);

  const row = await prisma.user.update({
    where: { id: userId },
    data: {
      hasDeposited: true,
      walletBalance: newBalance,
    },
    include: userInclude,
  });

  await evictTrialBalance(userId);

  return mapUserToLegacy(row);
}

async function setWalletBalanceFromChain(userId, onChainBalance) {
  const user = await getOrCreateUser(userId);
  const locked = Number(user.lockedCapital) || 0;
  const onChain = Number(onChainBalance) || 0;
  const chainAvailable = Math.max(0, onChain - locked);
  const currentWallet = Number(user.walletBalance) || 0;
  const prevOnChain = Number(user.onChainBalance) || 0;
  // Never clobber platform ledger credits (admin adjustments) with a lower on-chain read
  const walletBalance = Math.max(currentWallet, chainAvailable);
  const incomingDeposit = onChain > prevOnChain && onChain > 0;

  const row = await prisma.user.update({
    where: { id: userId },
    data: {
      onChainBalance: onChain,
      walletBalance,
      hasDeposited: onChain > 0 || user.hasDeposited,
    },
    include: userInclude,
  });

  if (incomingDeposit) {
    await evictTrialBalance(userId);
  }

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
