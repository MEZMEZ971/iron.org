const { prisma } = require("./lib/prisma.cjs");
const db = require("./db.cjs");

async function getKycStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      kycSubmissions: { orderBy: { submittedAt: "desc" }, take: 1 },
    },
  });

  if (!user) return null;

  const latest = user.kycSubmissions[0];
  return {
    userId,
    kycStatus: user.kycStatus,
    latestSubmission: latest
      ? {
          id: latest.id,
          frontFileName: latest.frontFileName,
          backFileName: latest.backFileName,
          status: latest.status,
          submittedAt: latest.submittedAt.toISOString(),
        }
      : null,
  };
}

async function submitKyc(userId, { frontFileName, backFileName }) {
  if (!frontFileName || !backFileName) {
    const err = new Error("Both front and back ID documents are required.");
    err.code = "KYC_FILES_REQUIRED";
    throw err;
  }

  await db.getOrCreateUser(userId);

  const submission = await prisma.kycSubmission.create({
    data: {
      userId,
      frontFileName,
      backFileName,
      status: "PENDING_REVIEW",
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { kycStatus: "PENDING_REVIEW" },
  });

  return {
    success: true,
    kycStatus: "PENDING_REVIEW",
    submission: {
      id: submission.id,
      frontFileName: submission.frontFileName,
      backFileName: submission.backFileName,
      status: submission.status,
      submittedAt: submission.submittedAt.toISOString(),
    },
  };
}

module.exports = { getKycStatus, submitKyc };
