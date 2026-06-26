import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  INITIAL_MARKETS,
  tickPrice,
  type MarketTicker,
} from "../data/markets";

const MARKET_PATHS = new Set(["/", "/market", "/trade"]);

function isMarketRoute(pathname: string) {
  return MARKET_PATHS.has(pathname);
}

/**
 * Simulated market ticker — instant seed, 1.5s throttle, pauses off-route / hidden tab.
 */
export function useMarketStream(intervalMs = 1500) {
  const location = useLocation();
  const [markets, setMarkets] = useState<MarketTicker[]>(INITIAL_MARKETS);
  const [syncing, setSyncing] = useState(false);
  const routeActive = isMarketRoute(location.pathname);
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible"
  );

  useEffect(() => {
    const onVisibility = () => {
      setVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const active = routeActive && visible;
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!active) {
      setSyncing(false);
      return;
    }

    setSyncing(true);
    const syncTimer = window.setTimeout(() => setSyncing(false), 280);

    const intervalId = window.setInterval(() => {
      if (!activeRef.current) return;
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

    return () => {
      window.clearTimeout(syncTimer);
      window.clearInterval(intervalId);
    };
  }, [active, intervalMs]);

  return { markets, loading: false, syncing };
}
