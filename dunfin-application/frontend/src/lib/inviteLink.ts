import { getWebAppOrigin } from "../config/appUrls";
import {
  INVITE_CODE_LENGTH,
  normalizeReferralCode,
} from "./referralStorage";

/**
 * Builds a registration invite URL on the frontend origin only.
 * Format: https://iron.wales/register?ref=X7F29A
 */
export function buildInvitationLink(inviteCode?: string | null): string {
  const ref = normalizeReferralCode(inviteCode);
  if (ref.length !== INVITE_CODE_LENGTH) return "";

  const origin = getWebAppOrigin();
  const url = new URL("/register", origin);
  url.searchParams.set("ref", ref);
  return url.toString();
}
