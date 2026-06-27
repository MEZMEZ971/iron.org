import type { TradeEarnings, TradeStatus, UserProfile } from "../api/client";

export type PortfolioBalanceSources = {
  profile?: UserProfile | null;
  earnings?: TradeEarnings | null;
  tradeStatus?: TradeStatus | null;
};

export type ResolvedPortfolioBalances = {
  /** Liquid USDT in wallet (excludes locked escrow). */
  availableBalance: number;
  /** Capital locked in an active AI trade session. */
  lockedBalance: number;
  /** Same as lockedBalance when trade session is active. */
  inTrading: number;
  /** wallet + locked + active trial. */
  totalBalance: number;
  trialBalance: number;
  isTrialActive: boolean;
  tradeSessionActive: boolean;
};

function safeAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** First finite number in list, else 0. */
function coalesceAmount(...values: unknown[]): number {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/**
 * Single source of truth for dashboard balances — stable `?? 0` fallbacks.
 */
export function resolvePortfolioBalances(
  sources: PortfolioBalanceSources
): ResolvedPortfolioBalances {
  const { profile, earnings, tradeStatus } = sources;

  const ledger = profile?.ledger;
  const trialBalance =
    profile?.isTrialActive && safeAmount(profile?.trialBalance) > 0
      ? safeAmount(profile?.trialBalance)
      : safeAmount(earnings?.trialBalance);
  const isTrialActive = Boolean(
    (profile?.isTrialActive && trialBalance > 0) ||
      (safeAmount(earnings?.trialBalance) > 0 && profile?.isTrialActive !== false)
  );

  const lockedBalance = coalesceAmount(
    ledger?.lockedCapital,
    ledger?.inTrading,
    profile?.lockedCapital,
    profile?.tradingAccount,
    tradeStatus?.lockedCapital,
    earnings?.lockedCapital
  );

  const walletBalance = coalesceAmount(
    profile?.walletBalance,
    tradeStatus?.walletBalance,
    earnings?.walletBalance
  );

  const availableBalance = coalesceAmount(
    ledger?.availableBalance,
    tradeStatus?.availableBalance,
    Math.max(0, walletBalance)
  );

  const tradeSessionActive = Boolean(
    ledger?.tradeSessionActive ??
      tradeStatus?.tradeSession?.active ??
      (lockedBalance > 0 && safeAmount(tradeStatus?.tradeSession?.remainingMs) > 0)
  );

  const inTrading = coalesceAmount(
    ledger?.inTrading,
    tradeSessionActive && lockedBalance > 0 ? lockedBalance : 0
  );

  const totalBalance = coalesceAmount(
    ledger?.totalBalance,
    earnings?.accountBalance,
    availableBalance + lockedBalance + (isTrialActive ? trialBalance : 0)
  );

  return {
    availableBalance,
    lockedBalance,
    inTrading,
    totalBalance,
    trialBalance: isTrialActive ? trialBalance : 0,
    isTrialActive,
    tradeSessionActive,
  };
}

export function formatPortfolioAmount(value: unknown, digits = 2): string {
  return safeAmount(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
