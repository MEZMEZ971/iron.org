import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getStoredReferralCode,
  normalizeReferralCode,
  resolveReferralCode,
  setStoredReferralCode,
} from "../lib/referralStorage";

/**
 * Reads the 6-character invite code from `?ref=` (legacy `?code=` still accepted).
 * Persists detected codes to sessionStorage so refreshes keep referral context.
 */
export function useInviteCodeFromUrl() {
  const [searchParams] = useSearchParams();

  const codeFromUrl = useMemo(() => {
    const ref = searchParams.get("ref")?.trim();
    if (ref) return normalizeReferralCode(ref);
    const legacyCode = searchParams.get("code")?.trim();
    if (legacyCode) return normalizeReferralCode(legacyCode);
    return "";
  }, [searchParams]);

  useEffect(() => {
    if (codeFromUrl) {
      setStoredReferralCode(codeFromUrl);
    }
  }, [codeFromUrl]);

  const resolvedCode = useMemo(
    () => resolveReferralCode(codeFromUrl),
    [codeFromUrl]
  );

  const hasUrlCode = codeFromUrl.length > 0;
  const hasStoredCode = getStoredReferralCode().length > 0;

  return {
    codeFromUrl,
    resolvedCode,
    hasUrlCode,
    hasReferralContext: resolvedCode.length > 0,
    hasStoredCode,
  };
}
