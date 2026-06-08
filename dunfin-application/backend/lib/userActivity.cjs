const { prisma } = require("./prisma.cjs");
const { trunc6 } = require("./formatNumbers.cjs");

const MS_DAY = 24 * 60 * 60 * 1000;
const ACTIVE_DAYS = 3;
const INACTIVE_MAX_DAYS = 14;

const WAKE_TITLE_EN = "We Miss You at IRON! 🚀";
const WAKE_TITLE_AR = "اشتقنا لك في آيرون! 🚀";
const WAKE_BODY_EN =
  "Your trading bots and daily lucky wheel are waiting for you. Log back in today to keep your streak and maximize your weekly brokerage salary rewards!";
const WAKE_BODY_AR =
  "روبوتات التداول وعجلة الحظ اليومية بانتظارك. عد لتسجيل الدخول اليوم للحفاظ على تقدمك وتعظيم رواتب ومكافآت البروكر الأسبوعية الخاصة بك!";

function classifyActivityStatus(lastActivityAt, now = Date.now()) {
  const ts = lastActivityAt instanceof Date ? lastActivityAt.getTime() : Number(lastActivityAt);
  if (!Number.isFinite(ts)) return "SLEEP";

  const ageMs = now - ts;
  if (ageMs <= ACTIVE_DAYS * MS_DAY) return "ACTIVE";
  if (ageMs <= INACTIVE_MAX_DAYS * MS_DAY) return "INACTIVE";
  return "SLEEP";
}

function touchUserActivity(userId) {
  if (!userId) return;
  prisma.user
    .update({
      where: { id: userId },
      data: { lastActivityAt: new Date() },
    })
    .catch(() => null);
}

async function getActivityAnalytics() {
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      uid: true,
      username: true,
      walletBalance: true,
      lastActivityAt: true,
    },
    orderBy: { lastActivityAt: "asc" },
  });

  const counts = { ACTIVE: 0, INACTIVE: 0, SLEEP: 0 };
  const rows = users.map((u) => {
    const status = classifyActivityStatus(u.lastActivityAt);
    counts[status] += 1;
    return {
      uid: u.uid,
      username: u.username,
      walletBalance: trunc6(u.walletBalance),
      lastActivityAt: u.lastActivityAt.toISOString(),
      status,
    };
  });

  return {
    counts: {
      active: counts.ACTIVE,
      inactive: counts.INACTIVE,
      sleep: counts.SLEEP,
      total: users.length,
    },
    users: rows,
  };
}

async function dispatchWakeUpNotifications({ skipRecentHours = 24 } = {}) {
  const cutoff = new Date(Date.now() - INACTIVE_MAX_DAYS * MS_DAY);
  const recentNotifyCutoff = new Date(
    Date.now() - (skipRecentHours || 0) * 60 * 60 * 1000
  );

  const sleepers = await prisma.user.findMany({
    where: {
      role: "USER",
      accountActive: true,
      lastActivityAt: { lt: cutoff },
    },
    select: { id: true, uid: true },
  });

  if (sleepers.length === 0) {
    return { sent: 0, sleepers: 0 };
  }

  const sleeperIds = sleepers.map((s) => s.id);
  const recent = await prisma.notification.findMany({
    where: {
      userId: { in: sleeperIds },
      kind: "WAKE_UP_SLEEPER",
      createdAt: { gte: recentNotifyCutoff },
    },
    select: { userId: true },
  });
  const recentlyNotified = new Set(recent.map((r) => r.userId));

  const toNotify = sleepers.filter((s) => !recentlyNotified.has(s.id));
  if (toNotify.length === 0) {
    return { sent: 0, sleepers: sleepers.length, skipped: sleepers.length };
  }

  await prisma.notification.createMany({
    data: toNotify.map((s) => ({
      userId: s.id,
      titleEn: WAKE_TITLE_EN,
      titleAr: WAKE_TITLE_AR,
      bodyEn: WAKE_BODY_EN,
      bodyAr: WAKE_BODY_AR,
      kind: "WAKE_UP_SLEEPER",
    })),
  });

  return {
    sent: toNotify.length,
    sleepers: sleepers.length,
    skipped: sleepers.length - toNotify.length,
  };
}

module.exports = {
  classifyActivityStatus,
  touchUserActivity,
  getActivityAnalytics,
  dispatchWakeUpNotifications,
  WAKE_TITLE_EN,
  WAKE_TITLE_AR,
  WAKE_BODY_EN,
  WAKE_BODY_AR,
};
