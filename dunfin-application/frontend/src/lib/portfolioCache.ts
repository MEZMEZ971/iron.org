import type { TradeEarnings, TradeStatus, UserProfile } from "../api/client";

const CACHE_KEY = "dunfin_portfolio_cache_v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type PortfolioCacheSnapshot = {
  userId: string;
  profile: UserProfile | null;
  earnings: TradeEarnings | null;
  tradeStatus: TradeStatus | null;
  savedAt: number;
};

type CacheStore = Record<string, PortfolioCacheSnapshot>;

function readStore(): CacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: CacheStore) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export function loadPortfolioCache(userId: string): PortfolioCacheSnapshot | null {
  if (!userId) return null;
  const row = readStore()[userId];
  if (!row) return null;
  if (Date.now() - row.savedAt > MAX_AGE_MS) return null;
  return row;
}

export function savePortfolioCache(
  userId: string,
  patch: {
    profile?: UserProfile | null;
    earnings?: TradeEarnings | null;
    tradeStatus?: TradeStatus | null;
  }
) {
  if (!userId) return;
  const store = readStore();
  const prev = store[userId];
  store[userId] = {
    userId,
    profile: patch.profile !== undefined ? patch.profile : prev?.profile ?? null,
    earnings: patch.earnings !== undefined ? patch.earnings : prev?.earnings ?? null,
    tradeStatus:
      patch.tradeStatus !== undefined ? patch.tradeStatus : prev?.tradeStatus ?? null,
    savedAt: Date.now(),
  };
  writeStore(store);
}

export function clearPortfolioCache(userId?: string) {
  if (!userId) {
    localStorage.removeItem(CACHE_KEY);
    return;
  }
  const store = readStore();
  delete store[userId];
  writeStore(store);
}
