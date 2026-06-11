const REFERRAL_STORAGE_KEY = "iron_referral_code";

export function normalizeReferralCode(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

export function getStoredReferralCode(): string {
  try {
    return normalizeReferralCode(sessionStorage.getItem(REFERRAL_STORAGE_KEY));
  } catch {
    return "";
  }
}

export function setStoredReferralCode(code: string): void {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return;
  try {
    sessionStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearStoredReferralCode(): void {
  try {
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Prefer URL param, then session cache. */
export function resolveReferralCode(urlCode?: string | null): string {
  const fromUrl = normalizeReferralCode(urlCode);
  if (fromUrl) return fromUrl;
  return getStoredReferralCode();
}
