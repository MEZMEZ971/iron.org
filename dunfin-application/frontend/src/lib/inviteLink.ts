/**
 * Rebuilds an invitation link on the origin the user is currently browsing,
 * so copied/QR/shared links always match the live domain (Vercel, preview,
 * or localhost) instead of whatever origin the backend was configured with.
 */
export function buildInvitationLink(
  serverInviteLink: string | null | undefined,
  referralCode?: string | null
): string {
  const origin = window.location.origin;

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
