function trimOrigin(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "");
}

function splitOrigins(value) {
  return String(value || "")
    .split(",")
    .map((entry) => trimOrigin(entry))
    .filter(Boolean);
}

/** Canonical public frontend origin for invite links, emails, etc. */
function getFrontendUrl() {
  const configured = trimOrigin(process.env.FRONTEND_URL);
  if (configured) return configured;

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:5173";
  }

  return "";
}

/**
 * CORS allow-list from FRONTEND_URL, ALLOWED_ORIGINS, and legacy CORS_ORIGIN.
 * Dev localhost origins are appended automatically outside production.
 */
function getAllowedCorsOrigins() {
  if (process.env.CORS_ORIGIN === "*") return "*";

  const origins = new Set([
    ...splitOrigins(process.env.FRONTEND_URL),
    ...splitOrigins(process.env.ALLOWED_ORIGINS),
    ...splitOrigins(process.env.CORS_ORIGIN),
  ]);

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
  }

  return [...origins];
}

module.exports = {
  trimOrigin,
  splitOrigins,
  getFrontendUrl,
  getAllowedCorsOrigins,
};
