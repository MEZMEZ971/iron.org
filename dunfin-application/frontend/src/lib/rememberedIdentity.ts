export const REMEMBERED_IDENTITY_KEY = "iron_remembered_identity";

export type RememberedIdentity = {
  identifier: string;
  rememberMe: boolean;
};

export function loadRememberedIdentity(): RememberedIdentity | null {
  try {
    const raw = localStorage.getItem(REMEMBERED_IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedIdentity>;
    const identifier =
      typeof parsed.identifier === "string" ? parsed.identifier.trim() : "";
    if (!identifier || parsed.rememberMe !== true) return null;
    return { identifier, rememberMe: true };
  } catch {
    return null;
  }
}

export function persistRememberedIdentity(identifier: string): void {
  const trimmed = identifier.trim();
  if (!trimmed) {
    clearRememberedIdentity();
    return;
  }
  localStorage.setItem(
    REMEMBERED_IDENTITY_KEY,
    JSON.stringify({ identifier: trimmed, rememberMe: true } satisfies RememberedIdentity)
  );
}

export function clearRememberedIdentity(): void {
  localStorage.removeItem(REMEMBERED_IDENTITY_KEY);
}
