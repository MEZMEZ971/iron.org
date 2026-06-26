const {
  verifyToken,
  ACCOUNT_DEACTIVATED_MESSAGE,
} = require("../authService.cjs");
const { prisma } = require("../lib/prisma.cjs");
const { touchUserActivity } = require("../lib/userActivity.cjs");
const { sendApiError, sendClientError } = require("../lib/apiErrors.cjs");

const ADMIN_ROLES = new Set(["ADMIN", "PARTNER"]);

function extractBearer(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

function optionalAuth(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    req.auth = null;
    return next();
  }
  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    req.auth = null;
    next();
  }
}

async function requireAuth(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    return sendClientError(res, "AUTH_REQUIRED", "Authentication required", 401);
  }
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, accountActive: true },
    });
    if (!user) {
      return sendClientError(res, "INVALID_TOKEN", "Invalid or expired token", 401);
    }
    if (user.accountActive === false) {
      return sendApiError(res, {
        code: "ACCOUNT_DEACTIVATED",
        message: ACCOUNT_DEACTIVATED_MESSAGE,
      });
    }
    req.auth = payload;
    touchUserActivity(payload.userId);
    next();
  } catch {
    return sendClientError(res, "INVALID_TOKEN", "Invalid or expired token", 401);
  }
}

/**
 * After requireAuth — ensure the requested user id matches the JWT subject.
 * @param {(req: import("express").Request) => string | undefined} resolveTarget
 */
function requireMatchingUserId(resolveTarget) {
  return (req, res, next) => {
    const target = resolveTarget(req);
    if (!target) {
      return sendClientError(res, "INVALID_REQUEST", "userId required", 400);
    }
    if (target !== req.auth?.userId) {
      return sendClientError(
        res,
        "FORBIDDEN",
        "You can only access your own account",
        403
      );
    }
    next();
  };
}

async function adminRequired(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    return sendClientError(res, "AUTH_REQUIRED", "Authentication required", 401);
  }
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        role: true,
        username: true,
        email: true,
        accountActive: true,
      },
    });
    if (!user) {
      return sendClientError(res, "INVALID_TOKEN", "Invalid or expired token", 401);
    }
    if (!ADMIN_ROLES.has(user.role)) {
      return sendClientError(res, "FORBIDDEN", "Admin access denied", 403);
    }
    if (user.accountActive === false) {
      return sendApiError(res, {
        code: "ACCOUNT_DEACTIVATED",
        message: ACCOUNT_DEACTIVATED_MESSAGE,
      });
    }
    req.auth = { ...payload, role: user.role };
    req.adminUser = user;
    next();
  } catch {
    return sendClientError(res, "INVALID_TOKEN", "Invalid or expired token", 401);
  }
}

module.exports = {
  optionalAuth,
  requireAuth,
  requireMatchingUserId,
  adminRequired,
  extractBearer,
  ADMIN_ROLES,
};
