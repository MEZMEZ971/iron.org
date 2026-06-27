import { useCallback, useEffect, useState } from "react";
import { fetchTeamAnalytics, type TeamAnalytics } from "../api/client";
import { useLocale } from "../i18n/LocaleContext";
import { resolveUserFacingError } from "../lib/userFacingError";

export function useTeamAnalytics(userId: string) {
  const { t } = useLocale();
  const [data, setData] = useState<TeamAnalytics | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const result = await fetchTeamAnalytics(userId);
      setData(result);
    } catch (e) {
      setError(
        resolveUserFacingError(e, t, {
          fallbackKey: "errorLoadTeam",
          context: "team-analytics",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();
  }, [userId, refresh]);

  return { data, loading, error, refresh };
}
