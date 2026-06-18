/** Canonical public site — used when the browser is on the API/Railway host. */
export const CANONICAL_FRONTEND_ORIGIN = "https://iron.wales";

function trimOrigin(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function getApiOrigin(): string {
  const api = import.meta.env.VITE_API_URL;
  if (!api) return "";
  try {
    return trimOrigin(new URL(api).origin);
  } catch {
    return trimOrigin(api);
  }
}

/** True when the origin is the API host or a Railway deploy URL (not the marketing site). */
function isApiLikeOrigin(origin: string): boolean {
  const normalized = trimOrigin(origin);
  if (!normalized) return true;

  const apiOrigin = getApiOrigin();
  if (apiOrigin && normalized === apiOrigin) return true;

  try {
    const host = new URL(normalized).hostname.toLowerCase();
    if (host.endsWith(".railway.app")) return true;
  } catch {
    return true;
  }

  return false;
}

/**
 * Public web origin for invite links, QR codes, and share URLs.
 * Never returns the backend API origin.
 */
export function getWebAppOrigin(): string {
  const fromEnv = import.meta.env.VITE_FRONTEND_URL;
  if (fromEnv) return trimOrigin(fromEnv);

  if (typeof window !== "undefined" && window.location?.origin) {
    const browser = trimOrigin(window.location.origin);
    if (!isApiLikeOrigin(browser)) return browser;
  }

  if (import.meta.env.PROD) {
    return CANONICAL_FRONTEND_ORIGIN;
  }

  return "http://localhost:5173";
}

/** Build-time web origin when VITE_FRONTEND_URL is set at compile time. */
export const WEB_APP_ORIGIN = import.meta.env.VITE_FRONTEND_URL
  ? trimOrigin(import.meta.env.VITE_FRONTEND_URL)
  : import.meta.env.PROD
    ? CANONICAL_FRONTEND_ORIGIN
    : "";
