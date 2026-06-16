import { getWebAppOrigin } from "../config/appUrls";

/**
 * Rebuilds an invitation link on the origin the user is currently browsing,
 * so copied/QR/shared links always match the live domain (custom domain,
 * Vercel preview, or localhost) instead of a stale backend-configured origin.
 */
export function buildInvitationLink(
  serverInviteLink: string | null | undefined,
  referralCode?: string | null
): string {
  const origin = getWebAppOrigin();

  if (serverInviteLink) {
    try {
      const parsed = new URL(serverInviteLink);
      return new URL(
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
        origin
      ).toString();
    } catch {
      // fall through to referral-code construction
    }
  }

  if (referralCode) {
    const url = new URL("/register", origin);
    url.searchParams.set("ref", referralCode);
    return url.toString();
  }

  return "";
}
