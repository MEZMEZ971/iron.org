import { useCallback, useEffect, useState } from "react";
import { fetchInviteInfo, type InviteInfo } from "../api/client";

export function useInviteInfo(userId: string) {
  const [data, setData] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchInviteInfo(userId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invite info");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
