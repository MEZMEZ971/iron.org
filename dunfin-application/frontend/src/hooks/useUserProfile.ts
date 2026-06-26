import { useCallback, useEffect, useState } from "react";
import {
  ApiNetworkError,
  fetchUserProfile,
  registerUser,
  syncBalance,
  type UserProfile,
} from "../api/client";
import { getStoredToken } from "../lib/authStorage";
import { subscribeWalletRefresh } from "../lib/walletSync";
import { useUser } from "../context/UserContext";
import { useLocale } from "../i18n/LocaleContext";

export function useUserProfile(userId: string) {
  const { uid } = useUser();
  const { t } = useLocale();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options?: { skipChainSync?: boolean }) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const hasJwt = Boolean(getStoredToken());
      if (!hasJwt) {
        await registerUser(userId).catch(() => undefined);
      }
      if (!options?.skipChainSync) {
        await syncBalance(userId).catch(() => undefined);
      }
      const data = await fetchUserProfile(userId);
      setProfile(data);
    } catch (e) {
      if (e instanceof ApiNetworkError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : t("errorLoadProfile"));
      }
    } finally {
      setLoading(false);
    }
  },
    [userId, t]
  );

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();
    const id = setInterval(() => refresh(), 20_000);
    return () => clearInterval(id);
  }, [userId, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  useEffect(() => {
    return subscribeWalletRefresh((payload) => {
      if (!userId) return;
      if (payload?.userId && payload.userId !== userId && payload.uid !== uid) return;
      if (payload?.walletBalance != null) {
        setProfile((prev) => {
          if (!prev) return prev;
          const trial =
            payload.fundAccount != null
              ? Math.max(0, payload.fundAccount - payload.walletBalance!)
              : prev.isTrialActive && prev.trialBalance
                ? prev.trialBalance
                : 0;
          const fundAccount =
            payload.fundAccount ??
            payload.walletBalance! + (prev.isTrialActive ? trial : 0);
          return {
            ...prev,
            walletBalance: payload.walletBalance!,
            trialBalance: payload.trialBalance ?? prev.trialBalance,
            isTrialActive: payload.isTrialActive ?? prev.isTrialActive,
            fundAccount,
          };
        });
      }
      void refresh({ skipChainSync: true });
    });
  }, [refresh, uid, userId]);

  return { profile, loading, error, refresh };
}
