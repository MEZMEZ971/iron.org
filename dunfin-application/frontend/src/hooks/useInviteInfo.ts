import { useCallback, useEffect, useState } from "react";
import { fetchInviteInfo, type InviteInfo } from "../api/client";
import { useLocale } from "../i18n/LocaleContext";
import { resolveUserFacingError } from "../lib/userFacingError";

export function useInviteInfo(userId: string) {
  const { t } = useLocale();
  const [data, setData] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchInviteInfo(userId);
      setData(result);
    } catch (e) {
      setError(
        resolveUserFacingError(e, t, {
          fallbackKey: "errorLoadInvite",
          context: "invite",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
