const IS_PRODUCTION = process.env.NODE_ENV === "production";

const CLIENT_ERROR_CODES = new Set([
  "INVALID_USERNAME",
  "INVALID_EMAIL",
  "INVALID_PHONE",
  "INVALID_PASSWORD",
  "INVALID_NICKNAME",
  "INVALID_PAYMENT_PIN",
  "INVALID_OTP",
  "OTP_REQUIRED",
  "EMAIL_TAKEN",
  "WRONG_PASSWORD",
  "EMPTY_UPDATE",
  "NO_PASSWORD",
  "USER_EXISTS",
  "USER_NOT_FOUND",
  "INVALID_CREDENTIALS",
  "ACCOUNT_DEACTIVATED",
  "FORBIDDEN",
  "FORBIDDEN_FIELD",
  "REFERRER_NOT_FOUND",
  "SELF_REFERRAL",
  "INVALID_CURRENCY",
  "INVALID_NETWORK",
  "INVALID_ADDRESS",
  "MIN_AMOUNT",
  "MAX_AMOUNT",
  "INSUFFICIENT_BALANCE",
  "PAYMENT_PASSWORD_REQUIRED",
  "PAYMENT_PASSWORD_NOT_SET",
  "INVALID_PAYMENT_PASSWORD",
  "PAYMENT_PIN_REQUIRED",
  "WRONG_PAYMENT_PIN",
  "WRONG_PAYMENT_PASSWORD",
  "NOT_FOUND",
  "INVALID_STATE",
  "INVALID_ACTION",
  "INVALID_UID",
  "INVALID_AMOUNT",
  "INVALID_STATUS",
  "FORBIDDEN_TARGET",
  "SELF_SUSPEND",
  "QUALIFICATION_DENIED",
  "KYC_FILES_REQUIRED",
]);

const GENERIC_INTERNAL_MESSAGE =
  "An internal error occurred. Please try again later.";

function mapPrismaError(error) {
  if (!error || !error.code) return null;
  switch (error.code) {
    case "P2002":
      return {
        code: "DUPLICATE_RECORD",
        message: "A record with this value already exists.",
        status: 409,
      };
    case "P2025":
      return {
        code: "NOT_FOUND",
        message: "The requested record was not found.",
        status: 404,
      };
    case "P2003":
      return {
        code: "INVALID_REFERENCE",
        message: "Referenced record is invalid or missing.",
        status: 400,
      };
    case "P2028":
      return {
        code: "TRANSACTION_TIMEOUT",
        message: "The request timed out. Please try again.",
        status: 503,
      };
    case "P2034":
      return {
        code: "TRADE_LOCK_CONFLICT",
        message: "Trade could not be locked. Refresh and try again.",
        status: 409,
      };
    default:
      return null;
  }
}

function resolveError(error, overrides = {}) {
  const prismaMapped = mapPrismaError(error);
  const code =
    overrides.code ||
    error?.code ||
    prismaMapped?.code ||
    "INTERNAL_ERROR";

  let message =
    overrides.message ||
    error?.message ||
    prismaMapped?.message ||
    GENERIC_INTERNAL_MESSAGE;

  let status =
    overrides.status ||
    error?.httpStatus ||
    prismaMapped?.status ||
    (CLIENT_ERROR_CODES.has(code) ? 400 : 500);

  if (code === "INVALID_CREDENTIALS") status = 401;
  if (code === "ACCOUNT_DEACTIVATED" || code === "FORBIDDEN") status = 403;
  if (code === "NOT_FOUND" || code === "USER_NOT_FOUND") status = 404;
  if (code === "USER_EXISTS" || code === "DUPLICATE_RECORD") status = 409;
  if (
    code === "UID_EXHAUSTED" ||
    code === "REFERRAL_CODE_EXHAUSTED"
  ) {
    status = 503;
  }
  if (code === "WRONG_PAYMENT_PASSWORD" || code === "WRONG_PAYMENT_PIN") {
    status = 403;
  }

  if (status >= 500 && IS_PRODUCTION) {
    message = GENERIC_INTERNAL_MESSAGE;
  }

  return {
    code,
    message,
    status,
    errorAr: error?.errorAr,
  };
}

/**
 * Structured API error contract:
 * { error: "ERROR_CODE", message: "Human-readable text", code: "ERROR_CODE" }
 */
function sendApiError(res, error, overrides = {}) {
  const { extra, success, ...opts } = overrides;
  const resolved = resolveError(error, opts);

  if (resolved.status >= 500) {
    console.error(`[api] ${resolved.code}:`, error);
  }

  const body = {
    error: resolved.code,
    message: resolved.message,
    code: resolved.code,
    ...(success === false ? { success: false } : {}),
    ...(resolved.errorAr ? { errorAr: resolved.errorAr } : {}),
    ...(extra && typeof extra === "object" ? extra : {}),
  };

  return res.status(resolved.status).json(body);
}

function sendClientError(res, code, message, status = 400) {
  return sendApiError(res, { code, message }, { code, message, status });
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((error) => {
      sendApiError(res, error);
    });
  };
}

function installProcessHandlers() {
  process.on("unhandledRejection", (reason) => {
    console.error("[process] unhandledRejection:", reason);
  });

  process.on("uncaughtException", (error) => {
    console.error("[process] uncaughtException:", error);
  });
}

function notFoundApiHandler(req, res, next) {
  if (!req.path.startsWith("/api")) {
    return next();
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return sendClientError(res, "NOT_FOUND", "API route not found.", 404);
}

function errorMiddleware(err, _req, res, _next) {
  return sendApiError(res, err);
}

module.exports = {
  CLIENT_ERROR_CODES,
  GENERIC_INTERNAL_MESSAGE,
  mapPrismaError,
  resolveError,
  sendApiError,
  sendClientError,
  asyncHandler,
  installProcessHandlers,
  notFoundApiHandler,
  errorMiddleware,
};
