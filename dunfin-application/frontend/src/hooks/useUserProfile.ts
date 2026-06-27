import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiNetworkError,
  fetchUserProfile,
  registerUser,
  syncBalance,
  type UserProfile,
} from "../api/client";
import { getStoredToken } from "../lib/authStorage";
import {
  loadPortfolioCache,
  savePortfolioCache,
} from "../lib/portfolioCache";
import { resolvePortfolioBalances } from "../lib/portfolioBalances";
import { subscribeWalletRefresh } from "../lib/walletSync";
import { useUser } from "../context/UserContext";
import { useLocale } from "../i18n/LocaleContext";

export function useUserProfile(userId: string) {
  const { uid } = useUser();
  const { t } = useLocale();
  const cached = userId ? loadPortfolioCache(userId)?.profile ?? null : null;
  const [profile, setProfile] = useState<UserProfile | null>(cached);
  const [loading, setLoading] = useState(Boolean(userId) && !cached);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const hasProfileRef = useRef(Boolean(cached));
  hasProfileRef.current = Boolean(profile);

  const refresh = useCallback(async (options?: { skipChainSync?: boolean; background?: boolean }) => {
    const activeUserId = userIdRef.current;
    if (!activeUserId) {
      setLoading(false);
      setSyncing(false);
      return;
    }

    const background = options?.background ?? hasProfileRef.current;
    if (background) setSyncing(true);
    else setLoading(true);

    setError(null);
    try {
      const hasJwt = Boolean(getStoredToken());
      if (!hasJwt) {
        await registerUser(activeUserId).catch(() => undefined);
      }

      const profilePromise = fetchUserProfile(activeUserId);
      if (!options?.skipChainSync) {
        void syncBalance(activeUserId).catch(() => undefined);
      }

      const data = await profilePromise;
      if (userIdRef.current !== activeUserId) return;

      setProfile(data);
      savePortfolioCache(activeUserId, { profile: data });
    } catch (e) {
      if (e instanceof ApiNetworkError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : t("errorLoadProfile"));
      }
    } finally {
      if (userIdRef.current === activeUserId) {
        setLoading(false);
        setSyncing(false);
      }
    }
  }, [t]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setSyncing(false);
      return;
    }

    const snapshot = loadPortfolioCache(userId)?.profile ?? null;
    setProfile(snapshot);
    setLoading(!snapshot);
    void refresh({ background: Boolean(snapshot) });

    const id = setInterval(() => refresh({ background: true, skipChainSync: true }), 30_000);
    return () => clearInterval(id);
  }, [userId, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && userIdRef.current) {
        void refresh({ background: true });
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
          const next = {
            ...prev,
            walletBalance: payload.walletBalance!,
            trialBalance: payload.trialBalance ?? prev.trialBalance,
            isTrialActive: payload.isTrialActive ?? prev.isTrialActive,
            fundAccount,
          };
          savePortfolioCache(userId, { profile: next });
          return next;
        });
      }
      void refresh({ skipChainSync: true, background: true });
    });
  }, [refresh, uid, userId]);

  return { profile, loading, syncing, error, refresh, balances: resolvePortfolioBalances({ profile }) };
}
