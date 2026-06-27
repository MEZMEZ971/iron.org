import { useLocation } from "react-router-dom";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchTradeEarnings,
  fetchTradeStatus,
  fetchUserProfile,
  syncBalance,
  type TradeEarnings,
  type TradeStatus,
  type UserProfile,
} from "../api/client";
import {
  loadPortfolioCache,
  savePortfolioCache,
} from "../lib/portfolioCache";
import {
  getStrategyTierName,
  resolveActiveStrategyTier,
} from "../lib/strategyTiers";
import {
  resolvePortfolioBalances,
  type ResolvedPortfolioBalances,
} from "../lib/portfolioBalances";
import { subscribeWalletRefresh } from "../lib/walletSync";
import { useUser } from "./UserContext";
import { useLocale } from "../i18n/LocaleContext";

type RefreshOptions = {
  skipChainSync?: boolean;
  background?: boolean;
};

export type H5EarningsSlice = {
  totalProceeds: number;
  pendingIncome: number;
  todayEarnings: number;
  dailyReferral: number;
  monthlyReferral: number;
  accountBalance: number;
  availableBalance: number;
  lockedBalance: number;
  inTrading: number;
  currency: string;
};

type H5PortfolioValue = {
  profile: UserProfile | null;
  earnings: TradeEarnings | null;
  tradeStatus: TradeStatus | null;
  walletBalance: number;
  availableBalance: number;
  totalBalance: number;
  trialBalance: number;
  isTrialActive: boolean;
  trialExpiresAt: string | null;
  lockedBalance: number;
  pendingFunds: number;
  flexibleFunds: number;
  earningsView: H5EarningsSlice;
  isTrading: boolean;
  activeStrategyLabel: string;
  /** True only when no cached snapshot exists yet */
  loading: boolean;
  /** True while a background refresh is in flight */
  syncing: boolean;
  refresh: (options?: RefreshOptions) => Promise<void>;
  requestRefresh: () => void;
};

const H5PortfolioContext = createContext<H5PortfolioValue | null>(null);

function mapEarnings(
  e: TradeEarnings | null,
  balances: ResolvedPortfolioBalances
): H5EarningsSlice {
  return {
    totalProceeds: e?.totalTransactionProceeds ?? 0,
    pendingIncome: e?.totalIncomeToBeDistributed ?? 0,
    todayEarnings: e?.todayPendingEarnings ?? 0,
    dailyReferral: e?.teamCommissions.dailyReferralEarnings ?? 0,
    monthlyReferral: e?.teamCommissions.monthlyReferralEarnings ?? 0,
    accountBalance: balances.totalBalance,
    availableBalance: balances.availableBalance,
    lockedBalance: balances.lockedBalance,
    inTrading: balances.inTrading,
    currency: e?.currency ?? "USDT",
  };
}

function hydrateFromCache(userId: string) {
  const cached = loadPortfolioCache(userId);
  if (!cached) {
    return {
      profile: null as UserProfile | null,
      earnings: null as TradeEarnings | null,
      tradeStatus: null as TradeStatus | null,
      hasCache: false,
    };
  }
  return {
    profile: cached.profile,
    earnings: cached.earnings,
    tradeStatus: cached.tradeStatus,
    hasCache: Boolean(cached.profile || cached.earnings || cached.tradeStatus),
  };
}

export function H5PortfolioProvider({ children }: { children: ReactNode }) {
  const { userId, uid } = useUser();
  const { locale } = useLocale();
  const initial = userId ? hydrateFromCache(userId) : null;
  const [profile, setProfile] = useState<UserProfile | null>(initial?.profile ?? null);
  const [earnings, setEarnings] = useState<TradeEarnings | null>(initial?.earnings ?? null);
  const [tradeStatus, setTradeStatus] = useState<TradeStatus | null>(
    initial?.tradeStatus ?? null
  );
  const [loading, setLoading] = useState(Boolean(userId) && !initial?.hasCache);
  const [syncing, setSyncing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const hasSnapshotRef = useRef(Boolean(initial?.hasCache));
  hasSnapshotRef.current = Boolean(profile || earnings || tradeStatus);

  const refresh = useCallback(async (options?: RefreshOptions) => {
    const activeUserId = userIdRef.current;
    if (!activeUserId) {
      setLoading(false);
      setSyncing(false);
      return;
    }

    const background = options?.background ?? hasSnapshotRef.current;
    if (background) {
      setSyncing(true);
    } else {
      setLoading(true);
    }

    try {
      const profilePromise = fetchUserProfile(activeUserId);
      const earningsPromise = fetchTradeEarnings(activeUserId);
      const tradePromise = fetchTradeStatus(activeUserId);

      if (!options?.skipChainSync) {
        void syncBalance(activeUserId).catch(() => undefined);
      }

      const [prof, earn, trade] = await Promise.all([
        profilePromise,
        earningsPromise,
        tradePromise,
      ]);

      if (userIdRef.current !== activeUserId) return;

      setProfile(prof);
      setEarnings(earn);
      setTradeStatus(trade);
      savePortfolioCache(activeUserId, {
        profile: prof,
        earnings: earn,
        tradeStatus: trade,
      });
    } catch {
      /* keep hydrated snapshot */
    } finally {
      if (userIdRef.current === activeUserId) {
        setLoading(false);
        setSyncing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setEarnings(null);
      setTradeStatus(null);
      setLoading(false);
      setSyncing(false);
      return;
    }

    const cached = hydrateFromCache(userId);
    setProfile(cached.profile);
    setEarnings(cached.earnings);
    setTradeStatus(cached.tradeStatus);
    setLoading(!cached.hasCache);
    void refresh({ background: cached.hasCache, skipChainSync: cached.hasCache });

    const id = setInterval(
      () => refresh({ background: true, skipChainSync: true }),
      30_000
    );
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
    if (refreshToken > 0) {
      void refresh({ background: true });
    }
  }, [refreshToken, refresh]);

  useEffect(() => {
    return subscribeWalletRefresh((payload) => {
      if (!userId) return;
      const matchesUser =
        !payload?.userId || payload.userId === userId || payload.uid === uid;
      if (!matchesUser) return;

      if (payload?.walletBalance != null) {
        setProfile((prev) => {
          if (!prev) return prev;
          const trial =
            payload.trialBalance ??
            (prev.isTrialActive && prev.trialBalance ? prev.trialBalance : 0);
          const nextWallet = payload.walletBalance!;
          const fundAccount =
            payload.fundAccount ??
            nextWallet + (payload.isTrialActive ?? prev.isTrialActive ? trial : 0);
          const next = {
            ...prev,
            walletBalance: nextWallet,
            trialBalance: trial,
            isTrialActive: payload.isTrialActive ?? prev.isTrialActive,
            fundAccount,
          };
          savePortfolioCache(userId, { profile: next });
          return next;
        });
        setEarnings((prev) => {
          if (!prev) return prev;
          const trial =
            payload.trialBalance ??
            (prev.trialBalance && (payload.isTrialActive ?? true) ? prev.trialBalance : 0);
          const locked = prev.lockedCapital ?? 0;
          const wallet = payload.walletBalance!;
          const accountBalance =
            payload.fundAccount != null
              ? payload.fundAccount + locked
              : wallet + trial + locked;
          const next = {
            ...prev,
            walletBalance: wallet,
            trialBalance: trial,
            accountBalance,
          };
          savePortfolioCache(userId, { earnings: next });
          return next;
        });
        setTradeStatus((prev) =>
          prev ? { ...prev, walletBalance: payload.walletBalance! } : prev
        );
      }

      void refresh({ skipChainSync: true, background: true });
    });
  }, [refresh, uid, userId]);

  const balances = useMemo(
    () => resolvePortfolioBalances({ profile, earnings, tradeStatus }),
    [profile, earnings, tradeStatus]
  );

  const walletBalance =
    profile?.walletBalance ?? earnings?.walletBalance ?? balances.availableBalance ?? 0;
  const trialBalance = balances.trialBalance;
  const isTrialActive = balances.isTrialActive;
  const trialExpiresAt = profile?.trialExpiresAt ?? null;
  const lockedBalance = balances.lockedBalance;
  const availableBalance = balances.availableBalance;
  const totalBalance = balances.totalBalance;
  const pendingFunds = lockedBalance;
  const flexibleFunds = availableBalance;

  const value = useMemo<H5PortfolioValue>(
    () => ({
      profile,
      earnings,
      tradeStatus,
      walletBalance,
      availableBalance,
      totalBalance,
      trialBalance,
      isTrialActive,
      trialExpiresAt,
      lockedBalance,
      pendingFunds,
      flexibleFunds,
      earningsView: mapEarnings(earnings, balances),
      isTrading: balances.tradeSessionActive,
      activeStrategyLabel: getStrategyTierName(
        resolveActiveStrategyTier({
          activeStrategy:
            tradeStatus?.activeStrategy ?? profile?.activeStrategy,
          lockedCapital: profile?.lockedCapital ?? earnings?.lockedCapital,
          teamSize: profile?.affiliate?.totalActiveMembers,
        }),
        locale
      ),
      loading,
      syncing,
      refresh,
      requestRefresh: () => setRefreshToken((n) => n + 1),
    }),
    [
      profile,
      earnings,
      tradeStatus,
      walletBalance,
      availableBalance,
      totalBalance,
      trialBalance,
      isTrialActive,
      trialExpiresAt,
      lockedBalance,
      pendingFunds,
      flexibleFunds,
      loading,
      syncing,
      refresh,
      locale,
      balances,
    ]
  );

  return (
    <H5PortfolioContext.Provider value={value}>
      {children}
    </H5PortfolioContext.Provider>
  );
}

export function useH5Portfolio() {
  const ctx = useContext(H5PortfolioContext);
  if (!ctx) {
    throw new Error("useH5Portfolio must be used within H5PortfolioProvider");
  }
  return ctx;
}

/** Mount inside BrowserRouter — refreshes wallet on tab navigation. */
export function PortfolioBalanceRefresh() {
  const location = useLocation();
  const { requestRefresh, refresh } = useH5Portfolio();

  useEffect(() => {
    const liveLedgerPaths = new Set(["/assets", "/personal", "/deposit"]);
    if (liveLedgerPaths.has(location.pathname)) {
      void refresh({ background: true, skipChainSync: false });
      return;
    }
    const walletPaths = new Set(["/", "/my", "/trade"]);
    if (walletPaths.has(location.pathname)) {
      requestRefresh();
    }
  }, [location.pathname, requestRefresh, refresh]);

  return null;
}
