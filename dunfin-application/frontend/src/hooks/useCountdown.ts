import { useEffect, useState } from "react";

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Tick down from server `nextTradeAt` — survives refresh without drift. */
export function useCountdownTo(
  nextTradeAt: string | null | undefined,
  active: boolean
) {
  const [displayMs, setDisplayMs] = useState(0);

  useEffect(() => {
    if (!active || !nextTradeAt) {
      setDisplayMs(0);
      return;
    }

    const endMs = new Date(nextTradeAt).getTime();
    const tick = () => setDisplayMs(Math.max(0, endMs - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextTradeAt, active]);

  return formatCountdown(displayMs);
}

/** @deprecated Prefer useCountdownTo for trade lock sync */
export function useCountdown(remainingMs: number, active: boolean) {
  const [displayMs, setDisplayMs] = useState(remainingMs);

  useEffect(() => {
    setDisplayMs(remainingMs);
  }, [remainingMs]);

  useEffect(() => {
    if (!active || displayMs <= 0) return;
    const id = window.setInterval(() => {
      setDisplayMs((p) => Math.max(0, p - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [active, displayMs]);

  return formatCountdown(displayMs);
}
