import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Reads invitation code from `?code=` or `?ref=` query parameters.
 */
export function useInviteCodeFromUrl() {
  const [searchParams] = useSearchParams();

  const codeFromUrl = useMemo(() => {
    const code = searchParams.get("code")?.trim();
    if (code) return code;
    const ref = searchParams.get("ref")?.trim();
    if (ref) return ref;
    return "";
  }, [searchParams]);

  const hasUrlCode = codeFromUrl.length > 0;

  return { codeFromUrl, hasUrlCode };
}
