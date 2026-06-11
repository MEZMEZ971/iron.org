import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  bumpFomoCount,
  FOMO_BASELINE,
  randomFomoHeartbeatDelayMs,
  randomFomoHeartbeatIncrement,
  readFomoCount,
  subscribeFomoCount,
} from "../lib/fomoUserCount";

type FomoUserCountContextValue = {
  count: number;
};

const FomoUserCountContext = createContext<FomoUserCountContextValue | null>(null);

export function FomoUserCountProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(() => readFomoCount());

  useEffect(() => subscribeFomoCount(setCount), []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const schedule = () => {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        bumpFomoCount(randomFomoHeartbeatIncrement());
        schedule();
      }, randomFomoHeartbeatDelayMs());
    };

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const value = useMemo(
    () => ({
      count: Number.isFinite(count) && count >= FOMO_BASELINE ? count : FOMO_BASELINE,
    }),
    [count],
  );

  return (
    <FomoUserCountContext.Provider value={value}>
      {children}
    </FomoUserCountContext.Provider>
  );
}

/** Safe hook — never throws; falls back to localStorage baseline when provider is absent. */
export function useFomoUserCount(): FomoUserCountContextValue {
  const ctx = useContext(FomoUserCountContext);
  if (ctx) return ctx;
  return { count: readFomoCount() };
}

export function useFomoUserCountStrict(): FomoUserCountContextValue {
  const ctx = useContext(FomoUserCountContext);
  if (!ctx) {
    throw new Error("useFomoUserCountStrict must be used within FomoUserCountProvider");
  }
  return ctx;
}
