import { useCallback, useEffect, useState } from "react";
import { fetchTradeEarnings, type TradeEarnings } from "../api/client";

export function useTradeEarnings(userId: string) {
  const [earnings, setEarnings] = useState<TradeEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      const data = await fetchTradeEarnings(userId);
      setEarnings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 12_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { earnings, loading, error, refresh };
}
