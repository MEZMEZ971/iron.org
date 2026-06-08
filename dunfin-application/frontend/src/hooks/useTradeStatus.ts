import { useCallback, useEffect, useState } from "react";
import {
  fetchTradeStatus,
  syncBalance,
  type TradeStatus,
} from "../api/client";
import { getAuthenticatedUserId } from "../lib/authStorage";
import { subscribeWalletRefresh } from "../lib/walletSync";

export function getUserId(): string {
  return getAuthenticatedUserId() || "";
}

export function useTradeStatus(userId: string) {
  const [status, setStatus] = useState<TradeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (skipChainSync = false) => {
      setError(null);
      try {
        if (!userId) return;
        if (!skipChainSync) {
          await syncBalance(userId).catch(() => undefined);
        }
        const data = await fetchTradeStatus(userId);
        setStatus(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load status");
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    return subscribeWalletRefresh((payload) => {
      if (!userId) return;
      if (payload?.userId && payload.userId !== userId) return;
      if (payload?.walletBalance != null) {
        setStatus((prev) =>
          prev ? { ...prev, walletBalance: payload.walletBalance! } : prev
        );
      }
      void refresh(true);
    });
  }, [refresh, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { status, loading, error, refresh, setStatus };
}
