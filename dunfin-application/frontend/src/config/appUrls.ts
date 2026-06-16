function trimOrigin(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** Runtime public web origin — prefers build-time env, then current browser origin. */
export function getWebAppOrigin(): string {
  const fromEnv = import.meta.env.VITE_FRONTEND_URL;
  if (fromEnv) return trimOrigin(fromEnv);

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "";
}

/** Build-time web origin when VITE_FRONTEND_URL is set at compile time. */
export const WEB_APP_ORIGIN = import.meta.env.VITE_FRONTEND_URL
  ? trimOrigin(import.meta.env.VITE_FRONTEND_URL)
  : "";
