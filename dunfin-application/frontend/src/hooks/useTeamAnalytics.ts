import { useCallback, useEffect, useState } from "react";
import {
  ApiNetworkError,
  fetchTeamAnalytics,
  type TeamAnalytics,
} from "../api/client";

export function useTeamAnalytics(userId: string) {
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
      if (e instanceof ApiNetworkError) {
        setError(e.message);
      } else {
        setError(
          e instanceof Error ? e.message : "Failed to load team analytics"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
