import { useCallback, useEffect, useState } from "react";
import {
  fetchTradeStatus,
  syncBalance,
  type TradeStatus,
} from "../api/client";
import { getAuthenticatedUserId } from "../lib/authStorage";
import { subscribeWalletRefresh } from "../lib/walletSync";
import { useLocale } from "../i18n/LocaleContext";

export function getUserId(): string {
  return getAuthenticatedUserId() || "";
}

export function useTradeStatus(userId: string) {
  const { t } = useLocale();
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
        setError(e instanceof Error ? e.message : t("errorLoadStatus"));
      } finally {
        setLoading(false);
      }
    },
    [userId, t]
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
