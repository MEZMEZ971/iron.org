const {
  verifyToken,
  ACCOUNT_DEACTIVATED_MESSAGE,
} = require("../authService.cjs");
const { prisma } = require("../lib/prisma.cjs");
const { touchUserActivity } = require("../lib/userActivity.cjs");

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
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, accountActive: true },
    });
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    if (user.accountActive === false) {
      return res.status(403).json({
        error: ACCOUNT_DEACTIVATED_MESSAGE,
        code: "ACCOUNT_DEACTIVATED",
      });
    }
    req.auth = payload;
    touchUserActivity(payload.userId);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function adminRequired(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
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
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    if (!ADMIN_ROLES.has(user.role)) {
      return res.status(403).json({ error: "Admin access denied", code: "FORBIDDEN" });
    }
    if (user.accountActive === false) {
      return res.status(403).json({
        error: ACCOUNT_DEACTIVATED_MESSAGE,
        code: "ACCOUNT_DEACTIVATED",
      });
    }
    req.auth = { ...payload, role: user.role };
    req.adminUser = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = {
  optionalAuth,
  requireAuth,
  adminRequired,
  extractBearer,
  ADMIN_ROLES,
};
