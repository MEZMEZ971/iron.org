export type WalletRefreshPayload = {
  userId?: string;
  uid?: string;
  walletBalance?: number;
  availableBalance?: number;
  lockedCapital?: number;
  totalBalance?: number;
  trialBalance?: number;
  isTrialActive?: boolean;
  fundAccount?: number;
};

type WalletRefreshListener = (payload?: WalletRefreshPayload) => void;

const listeners = new Set<WalletRefreshListener>();

export function subscribeWalletRefresh(listener: WalletRefreshListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Notify portfolio/trade shells to reload balances after an admin adjustment. */
export function emitWalletRefresh(payload?: WalletRefreshPayload) {
  for (const listener of listeners) {
    listener(payload);
  }
}

export function parsePositiveAmount(raw: string): number | null {
  const cleaned = String(raw).trim().replace(/,/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
