import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getStoredReferralCode,
  resolveReferralCode,
  setStoredReferralCode,
} from "../lib/referralStorage";

/**
 * Reads invitation code from `?code=` or `?ref=` query parameters.
 * Persists detected codes to sessionStorage so refreshes keep referral context.
 */
export function useInviteCodeFromUrl() {
  const [searchParams] = useSearchParams();

  const codeFromUrl = useMemo(() => {
    const ref = searchParams.get("ref")?.trim();
    if (ref) return ref;
    const code = searchParams.get("code")?.trim();
    if (code) return code;
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
