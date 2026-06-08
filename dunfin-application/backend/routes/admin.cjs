const { prisma } = require("../lib/prisma.cjs");
const { trunc6 } = require("../lib/formatNumbers.cjs");
const { isValidPublicUid } = require("../lib/uidGenerator.cjs");
const {
  getActivityAnalytics,
  dispatchWakeUpNotifications,
} = require("../lib/userActivity.cjs");

const PUBLIC_USER_SELECT = {
  id: true,
  uid: true,
  username: true,
  email: true,
  phone: true,
  displayName: true,
  role: true,
  walletBalance: true,
  lockedCapital: true,
  tradingCapital: true,
  accountActive: true,
  kycStatus: true,
  hasDeposited: true,
  createdAt: true,
};

const PENDING_WITHDRAW_STATUSES = ["PROCESSING", "PENDING_REVIEW"];

function mapWithdrawalRow(row) {
  const u = row.user || {};
  return {
    id: row.id,
    userId: row.userId,
    uid: u.uid ?? null,
    email: u.email ?? null,
    displayName: u.displayName || u.username || row.userId,
    currency: row.currency,
    network: row.network,
    address: row.address,
    amount: trunc6(row.amount),
    fee: trunc6(row.fee),
    netAmount: trunc6(row.netAmount),
    status: row.status,
    rejectionReason: row.rejectionReason ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapKycRow(submission) {
  const u = submission.user || {};
  return {
    id: submission.id,
    userId: submission.userId,
    uid: u.uid ?? null,
    email: u.email ?? null,
    displayName: u.displayName || u.username || submission.userId,
    kycStatus: u.kycStatus,
    frontFileName: submission.frontFileName,
    backFileName: submission.backFileName,
    status: submission.status,
    rejectionReason: submission.rejectionReason ?? null,
    submittedAt: submission.submittedAt.toISOString(),
  };
}

async function getAdminStats() {
  const [walletAgg, depositAgg, withdrawalCompleted, feeAgg] = await Promise.all([
    prisma.user.aggregate({
      _sum: { walletBalance: true, lockedCapital: true },
    }),
    prisma.deposit.aggregate({ _sum: { amount: true } }),
    prisma.withdrawalRecord.aggregate({
      where: { status: "COMPLETED" },
      _sum: { netAmount: true, amount: true },
    }),
    prisma.withdrawalRecord.aggregate({
      _sum: { fee: true },
      where: { status: { in: ["COMPLETED", "PROCESSING", "PENDING_REVIEW"] } },
    }),
  ]);

  const totalLiquidity =
    trunc6(walletAgg._sum.walletBalance) + trunc6(walletAgg._sum.lockedCapital);

  return {
    totalManagedLiquidity: trunc6(totalLiquidity),
    totalCumulativeDeposits: trunc6(depositAgg._sum.amount),
    totalSettledWithdrawals: trunc6(withdrawalCompleted._sum.netAmount),
    totalPlatformRevenue: trunc6(feeAgg._sum.fee),
    pendingWithdrawalCount: await prisma.withdrawalRecord.count({
      where: { status: { in: PENDING_WITHDRAW_STATUSES } },
    }),
    pendingKycCount: await prisma.kycSubmission.count({
      where: { status: "PENDING_REVIEW" },
    }),
  };
}

async function listPendingWithdrawals() {
  const rows = await prisma.withdrawalRecord.findMany({
    where: { status: { in: PENDING_WITHDRAW_STATUSES } },
    include: {
      user: {
        select: {
          uid: true,
          email: true,
          username: true,
          displayName: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapWithdrawalRow);
}

async function actOnWithdrawal(id, { action, reason }) {
  const row = await prisma.withdrawalRecord.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!row) {
    const err = new Error("Withdrawal not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (!PENDING_WITHDRAW_STATUSES.includes(row.status)) {
    const err = new Error("Withdrawal is no longer pending");
    err.code = "INVALID_STATE";
    throw err;
  }

  if (action === "approve") {
    const updated = await prisma.withdrawalRecord.update({
      where: { id },
      data: { status: "COMPLETED", rejectionReason: null },
      include: { user: { select: { uid: true, email: true, username: true, displayName: true } } },
    });
    return { success: true, withdrawal: mapWithdrawalRow(updated), status: "COMPLETED" };
  }

  if (action === "reject") {
    const rejectionReason = String(reason || "Rejected by administrator").trim();
    const refundAmount = trunc6(row.amount);

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: row.userId },
        data: {
          walletBalance: { increment: refundAmount },
        },
      });
      const w = await tx.withdrawalRecord.update({
        where: { id },
        data: { status: "REJECTED", rejectionReason },
        include: {
          user: { select: { uid: true, email: true, username: true, displayName: true } },
        },
      });
      return { w, walletBalance: trunc6(user.walletBalance) };
    });

    return {
      success: true,
      withdrawal: mapWithdrawalRow(updated.w),
      status: "REJECTED",
      refundedAmount: refundAmount,
      walletBalance: updated.walletBalance,
    };
  }

  const err = new Error("Invalid action");
  err.code = "INVALID_ACTION";
  throw err;
}

async function listPendingKyc() {
  const rows = await prisma.kycSubmission.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      user: {
        select: {
          uid: true,
          email: true,
          username: true,
          displayName: true,
          kycStatus: true,
        },
      },
    },
    orderBy: { submittedAt: "asc" },
  });
  return rows.map(mapKycRow);
}

async function actOnKyc(submissionId, { action, reason }) {
  const submission = await prisma.kycSubmission.findUnique({
    where: { id: submissionId },
    include: { user: true },
  });
  if (!submission) {
    const err = new Error("KYC submission not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (submission.status !== "PENDING_REVIEW") {
    const err = new Error("Submission is no longer pending");
    err.code = "INVALID_STATE";
    throw err;
  }

  if (action === "approve") {
    const [updatedSub] = await prisma.$transaction([
      prisma.kycSubmission.update({
        where: { id: submissionId },
        data: { status: "APPROVED", rejectionReason: null },
      }),
      prisma.user.update({
        where: { id: submission.userId },
        data: { kycStatus: "APPROVED" },
      }),
    ]);
    const full = await prisma.kycSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            uid: true,
            email: true,
            username: true,
            displayName: true,
            kycStatus: true,
          },
        },
      },
    });
    return { success: true, submission: mapKycRow(full), kycStatus: "APPROVED" };
  }

  if (action === "reject") {
    const rejectionReason = String(reason || "Verification rejected").trim();
    await prisma.$transaction([
      prisma.kycSubmission.update({
        where: { id: submissionId },
        data: { status: "REJECTED", rejectionReason },
      }),
      prisma.user.update({
        where: { id: submission.userId },
        data: { kycStatus: "REJECTED" },
      }),
    ]);
    const full = await prisma.kycSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            uid: true,
            email: true,
            username: true,
            displayName: true,
            kycStatus: true,
          },
        },
      },
    });
    return {
      success: true,
      submission: mapKycRow(full),
      kycStatus: "REJECTED",
      message: rejectionReason,
    };
  }

  const err = new Error("Invalid action");
  err.code = "INVALID_ACTION";
  throw err;
}

async function getAdminSession(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, username: true, displayName: true, uid: true },
  });
  if (!user) return null;
  return user;
}

function normalizeLookupUid(raw) {
  return String(raw || "").trim();
}

function mapAdminUserControl(row) {
  if (!row) return null;
  return {
    userId: row.id,
    uid: row.uid,
    email: row.email ?? null,
    username: row.username ?? null,
    displayName: row.displayName || row.username || row.uid,
    role: row.role,
    walletBalance: trunc6(row.walletBalance),
    lockedCapital: trunc6(row.lockedCapital),
    tradingCapital: trunc6(row.tradingCapital),
    accountActive: row.accountActive !== false,
    accountStatus: row.accountActive !== false ? "ACTIVE" : "SUSPENDED",
    kycStatus: row.kycStatus,
    hasDeposited: row.hasDeposited,
    registrationDate: row.createdAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function assertOperatorMayMutate(target, operator) {
  const privileged = new Set(["ADMIN", "PARTNER"]);
  if (privileged.has(target.role) && operator.role !== "ADMIN") {
    const err = new Error("Only platform admins may modify staff accounts");
    err.code = "FORBIDDEN_TARGET";
    throw err;
  }
}

async function lookupUserByUid(uidParam) {
  const uid = normalizeLookupUid(uidParam);
  if (!isValidPublicUid(uid)) {
    const err = new Error("UID must be an 8-digit public member ID");
    err.code = "INVALID_UID";
    throw err;
  }

  const row = await prisma.user.findUnique({
    where: { uid },
    select: PUBLIC_USER_SELECT,
  });

  if (!row) {
    const err = new Error("No user found for this UID");
    err.code = "NOT_FOUND";
    throw err;
  }

  return { success: true, user: mapAdminUserControl(row) };
}

async function mutateUserBalance(uidParam, { action, amount }, operator) {
  const uid = normalizeLookupUid(uidParam);
  if (!isValidPublicUid(uid)) {
    const err = new Error("UID must be an 8-digit public member ID");
    err.code = "INVALID_UID";
    throw err;
  }

  const normalizedAction = String(action || "").toUpperCase();
  if (!["CREDIT", "DEBIT"].includes(normalizedAction)) {
    const err = new Error('action must be "CREDIT" or "DEBIT"');
    err.code = "INVALID_ACTION";
    throw err;
  }

  const delta = trunc6(amount);
  if (!Number.isFinite(delta) || delta <= 0) {
    const err = new Error("amount must be a positive number");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  const target = await prisma.user.findUnique({
    where: { uid },
    select: PUBLIC_USER_SELECT,
  });
  if (!target) {
    const err = new Error("No user found for this UID");
    err.code = "NOT_FOUND";
    throw err;
  }

  assertOperatorMayMutate(target, operator);

  const current = trunc6(target.walletBalance);
  if (normalizedAction === "DEBIT" && current < delta) {
    const err = new Error("Insufficient wallet balance for debit");
    err.code = "INSUFFICIENT_BALANCE";
    throw err;
  }

  const isCredit = normalizedAction === "CREDIT";
  const ledgerKind = isCredit ? "ADMIN_CREDIT" : "ADMIN_DEBIT";
  const recordType = isCredit ? "ADMIN_REWARD" : "ADMIN_DEDUCTION";
  const description = `Admin balance adjustment executed by admin ID: ${operator.id}`;

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: target.id },
      data: isCredit
        ? { walletBalance: { increment: delta } }
        : { walletBalance: { decrement: delta } },
      select: PUBLIC_USER_SELECT,
    });

    const balanceAfter = trunc6(user.walletBalance);

    await tx.balanceLedgerEntry.create({
      data: {
        userId: target.id,
        kind: ledgerKind,
        amount: delta,
        balanceAfter,
        note: description,
        performedById: operator.id,
      },
    });

    await tx.transactionRecord.create({
      data: {
        userId: target.id,
        type: recordType,
        amount: delta,
        status: "SUCCESS",
        description,
        performedById: operator.id,
      },
    });

    return user;
  });

  const nextBalance = trunc6(updated.walletBalance);

  return {
    success: true,
    action: normalizedAction,
    amount: delta,
    walletBalance: nextBalance,
    user: mapAdminUserControl(updated),
  };
}

async function toggleUserAccountStatus(uidParam, { status, active }, operator) {
  const uid = normalizeLookupUid(uidParam);
  if (!isValidPublicUid(uid)) {
    const err = new Error("UID must be an 8-digit public member ID");
    err.code = "INVALID_UID";
    throw err;
  }

  let accountActive;
  if (typeof active === "boolean") {
    accountActive = active;
  } else if (typeof status === "string") {
    const s = status.toUpperCase();
    if (s === "ACTIVE" || s === "true" || s === "1") accountActive = true;
    else if (s === "SUSPENDED" || s === "INACTIVE" || s === "false" || s === "0") {
      accountActive = false;
    } else {
      const err = new Error('status must be "ACTIVE" or "SUSPENDED"');
      err.code = "INVALID_STATUS";
      throw err;
    }
  } else {
    const err = new Error("status or active flag required");
    err.code = "INVALID_STATUS";
    throw err;
  }

  const target = await prisma.user.findUnique({
    where: { uid },
    select: PUBLIC_USER_SELECT,
  });
  if (!target) {
    const err = new Error("No user found for this UID");
    err.code = "NOT_FOUND";
    throw err;
  }

  assertOperatorMayMutate(target, operator);

  if (target.id === operator.id && !accountActive) {
    const err = new Error("You cannot suspend your own account");
    err.code = "SELF_SUSPEND";
    throw err;
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { accountActive },
    select: PUBLIC_USER_SELECT,
  });

  return {
    success: true,
    accountActive,
    user: mapAdminUserControl(updated),
  };
}

function buildFinanceUserWhere(search) {
  const where = { role: "USER" };
  const q = String(search || "").trim();
  if (!q) return where;

  const or = [
    { uid: { contains: q } },
    { username: { contains: q, mode: "insensitive" } },
  ];
  if (/^\d{8}$/.test(q)) {
    or.unshift({ uid: q });
  }
  return { ...where, OR: or };
}

async function getUserFinanceSummary({ search, page = 1, limit = 50 } = {}) {
  const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const pageNum = Math.max(Number(page) || 1, 1);
  const skip = (pageNum - 1) * take;
  const where = buildFinanceUserWhere(search);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        uid: true,
        username: true,
        walletBalance: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  if (users.length === 0) {
    return { users: [], total, page: pageNum, limit: take };
  }

  const userIds = users.map((u) => u.id);
  const [depositSums, withdrawalSums] = await Promise.all([
    prisma.deposit.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _sum: { amount: true },
    }),
    prisma.withdrawalRecord.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  const depositByUser = new Map(
    depositSums.map((row) => [row.userId, trunc6(row._sum.amount)]),
  );
  const withdrawalByUser = new Map(
    withdrawalSums.map((row) => [row.userId, trunc6(row._sum.amount)]),
  );

  const profiles = users.map((u) => {
    const totalDeposited = depositByUser.get(u.id) ?? 0;
    const totalWithdrawn = withdrawalByUser.get(u.id) ?? 0;
    return {
      uid: u.uid,
      username: u.username,
      walletBalance: trunc6(u.walletBalance),
      totalDeposited,
      totalWithdrawn,
      netCapitalFlow: trunc6(totalDeposited - totalWithdrawn),
    };
  });

  return {
    users: profiles,
    total,
    page: pageNum,
    limit: take,
  };
}

module.exports = {
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
};
