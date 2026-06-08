import { useEffect, useState } from "react";
import {
  INITIAL_MARKETS,
  tickPrice,
  type MarketTicker,
} from "../data/markets";

/** Simulates stream connect — brief loading before first tick batch */
const STREAM_CONNECT_MS = 520;

export function useMarketStream(intervalMs = 2200) {
  const [markets, setMarkets] = useState<MarketTicker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let intervalId: number | undefined;

    const connectTimer = window.setTimeout(() => {
      setMarkets(INITIAL_MARKETS);
      setLoading(false);

      intervalId = window.setInterval(() => {
        setMarkets((prev) =>
          prev.map((m) => {
            const price = tickPrice(m.price);
            const change = m.change24h + (Math.random() - 0.5) * 0.08;
            return {
              ...m,
              price,
              change24h: Number(change.toFixed(2)),
            };
          })
        );
      }, intervalMs);
    }, STREAM_CONNECT_MS);

    return () => {
      window.clearTimeout(connectTimer);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [intervalMs]);

  return { markets, loading };
}
