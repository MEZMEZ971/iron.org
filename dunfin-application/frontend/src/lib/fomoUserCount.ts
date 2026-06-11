export const FOMO_STORAGE_KEY = "iron_fomo_user_count";
export const FOMO_BASELINE = 6903;
export const FOMO_REGISTRATION_BUMP = 3;

type FomoListener = (count: number) => void;

const listeners = new Set<FomoListener>();

export function readFomoCount(): number {
  try {
    const raw = localStorage.getItem(FOMO_STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (Number.isFinite(parsed) && parsed >= FOMO_BASELINE) {
      return parsed;
    }
  } catch {
    /* ignore storage errors */
  }
  return FOMO_BASELINE;
}

export function writeFomoCount(count: number): void {
  const safe = Math.max(FOMO_BASELINE, Math.floor(count));
  try {
    localStorage.setItem(FOMO_STORAGE_KEY, String(safe));
  } catch {
    /* ignore storage errors */
  }
  listeners.forEach((listener) => listener(safe));
}

export function bumpFomoCount(delta: number): number {
  const next = readFomoCount() + delta;
  writeFomoCount(next);
  return next;
}

export function bumpFomoOnRegistration(): number {
  return bumpFomoCount(FOMO_REGISTRATION_BUMP);
}

export function subscribeFomoCount(listener: FomoListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Random organic heartbeat increment: 3 or 6 (multiple of 3, capped at 6). */
export function randomFomoHeartbeatIncrement(): number {
  return Math.random() < 0.5 ? 3 : 6;
}

export function randomFomoHeartbeatDelayMs(): number {
  return 7000 + Math.floor(Math.random() * 8001);
}
