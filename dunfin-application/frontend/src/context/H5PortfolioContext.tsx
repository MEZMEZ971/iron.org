import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  getStrategyTierName,
  resolveActiveStrategyTier,
} from "../lib/strategyTiers";
import { subscribeWalletRefresh } from "../lib/walletSync";
import { useUser } from "./UserContext";
import { useLocale } from "../i18n/LocaleContext";

type RefreshOptions = {
  skipChainSync?: boolean;
};

export type H5EarningsSlice = {
  totalProceeds: number;
  pendingIncome: number;
  todayEarnings: number;
  dailyReferral: number;
  monthlyReferral: number;
  accountBalance: number;
  currency: string;
};

type H5PortfolioValue = {
  profile: UserProfile | null;
  earnings: TradeEarnings | null;
  tradeStatus: TradeStatus | null;
  walletBalance: number;
  /** Liquid USDT — same as walletBalance / flexibleFunds */
  availableBalance: number;
  /** Strategy principal locked in escrow — same as lockedCapital / pendingFunds */
  lockedBalance: number;
  pendingFunds: number;
  flexibleFunds: number;
  earningsView: H5EarningsSlice;
  isTrading: boolean;
  activeStrategyLabel: string;
  loading: boolean;
  refresh: (options?: RefreshOptions) => Promise<void>;
};

const H5PortfolioContext = createContext<H5PortfolioValue | null>(null);

function mapEarnings(e: TradeEarnings | null): H5EarningsSlice {
  return {
    totalProceeds: e?.totalTransactionProceeds ?? 0,
    pendingIncome: e?.totalIncomeToBeDistributed ?? 0,
    todayEarnings: e?.todayPendingEarnings ?? 0,
    dailyReferral: e?.teamCommissions.dailyReferralEarnings ?? 0,
    monthlyReferral: e?.teamCommissions.monthlyReferralEarnings ?? 0,
    accountBalance: e?.accountBalance ?? 0,
    currency: e?.currency ?? "USDT",
  };
}

export function H5PortfolioProvider({ children }: { children: ReactNode }) {
  const { userId, uid } = useUser();
  const { locale } = useLocale();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [earnings, setEarnings] = useState<TradeEarnings | null>(null);
  const [tradeStatus, setTradeStatus] = useState<TradeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    async (options?: RefreshOptions) => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        if (!options?.skipChainSync) {
          await syncBalance(userId).catch(() => undefined);
        }
        const [prof, earn, trade] = await Promise.all([
          fetchUserProfile(userId),
          fetchTradeEarnings(userId),
          fetchTradeStatus(userId),
        ]);
        setProfile(prof);
        setEarnings(earn);
        setTradeStatus(trade);
      } catch {
        /* keep last good snapshot */
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    setLoading(true);
    refresh();
    const id = setInterval(() => refresh(), 12_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    return subscribeWalletRefresh((payload) => {
      if (!userId) return;
      const matchesUser =
        !payload?.userId || payload.userId === userId || payload.uid === uid;
      if (!matchesUser) return;

      if (payload?.walletBalance != null) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                walletBalance: payload.walletBalance!,
                fundAccount: payload.walletBalance!,
              }
            : prev
        );
        setEarnings((prev) =>
          prev
            ? { ...prev, accountBalance: payload.walletBalance!, walletBalance: payload.walletBalance! }
            : prev
        );
        setTradeStatus((prev) =>
          prev ? { ...prev, walletBalance: payload.walletBalance! } : prev
        );
      }

      void refresh({ skipChainSync: true });
    });
  }, [refresh, uid, userId]);

  const walletBalance = profile?.walletBalance ?? earnings?.walletBalance ?? 0;
  const lockedBalance =
    tradeStatus?.lockedCapital ??
    profile?.lockedCapital ??
    earnings?.lockedCapital ??
    0;
  const availableBalance = walletBalance;
  const pendingFunds = lockedBalance;
  const flexibleFunds = availableBalance;

  const value = useMemo<H5PortfolioValue>(
    () => ({
      profile,
      earnings,
      tradeStatus,
      walletBalance,
      availableBalance,
      lockedBalance,
      pendingFunds,
      flexibleFunds,
      earningsView: mapEarnings(earnings),
      isTrading: tradeStatus?.tradeSession?.active ?? false,
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
      refresh,
    }),
    [
      profile,
      earnings,
      tradeStatus,
      walletBalance,
      availableBalance,
      lockedBalance,
      pendingFunds,
      flexibleFunds,
      loading,
      refresh,
      locale,
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
