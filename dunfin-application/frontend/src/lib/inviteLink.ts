import { getWebAppOrigin } from "../config/appUrls";

/**
 * Builds a registration invite URL on the frontend origin only.
 * Format: https://iron.wales/register?code=SHORT&ref=FULL_REFERRAL_CODE
 */
export function buildInvitationLink(
  referralCode?: string | null,
  inviteCode?: string | null
): string {
  const ref = String(referralCode || "").trim();
  if (!ref) return "";

  const origin = getWebAppOrigin();
  const url = new URL("/register", origin);
  const code = String(inviteCode || "").trim() || ref.slice(0, 5).toUpperCase();
  url.searchParams.set("code", code);
  url.searchParams.set("ref", ref);
  return url.toString();
}
