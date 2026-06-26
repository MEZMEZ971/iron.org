import { clearPortfolioCache } from "../lib/portfolioCache";

export const TOKEN_KEY = "dunfin_token";
export const USER_ID_KEY = "dunfin_user_id";
export const DISPLAY_NAME_KEY = "dunfin_display_name";
export const UID_KEY = "dunfin_uid";
export const ROLE_KEY = "dunfin_user_role";

export type UserRole = "USER" | "ADMIN" | "PARTNER";

export interface StoredAuthUser {
  id: string;
  userId: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  displayName: string;
  uid: string;
  referralCode?: string;
  role?: UserRole;
}

export function isAdminRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "PARTNER";
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

const EMAIL_KEY = "dunfin_user_email";

export function persistAuthSession(token: string, user: StoredAuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, user.id);
  localStorage.setItem(DISPLAY_NAME_KEY, user.displayName || user.username || "");
  if (user.uid) localStorage.setItem(UID_KEY, user.uid);
  if (user.email) localStorage.setItem(EMAIL_KEY, user.email);
  else localStorage.removeItem(EMAIL_KEY);
  if (user.role) localStorage.setItem(ROLE_KEY, user.role);
  else localStorage.removeItem(ROLE_KEY);
}

export function patchStoredAuthUser(patch: Partial<StoredAuthUser>) {
  const session = loadStoredSession();
  if (!session) return;
  const next = { ...session.user, ...patch };
  persistAuthSession(session.token, next);
}

export function clearAuthSession() {
  const userId = localStorage.getItem(USER_ID_KEY);
  if (userId) clearPortfolioCache(userId);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(DISPLAY_NAME_KEY);
  localStorage.removeItem(UID_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function loadStoredSession(): {
  token: string;
  user: StoredAuthUser;
} | null {
  const token = getStoredToken();
  const userId = localStorage.getItem(USER_ID_KEY);
  if (!token || !userId) return null;

  return {
    token,
    user: {
      id: userId,
      userId,
      displayName: localStorage.getItem(DISPLAY_NAME_KEY) || "",
      uid: localStorage.getItem(UID_KEY) || "",
      email: localStorage.getItem(EMAIL_KEY) || null,
      role: (localStorage.getItem(ROLE_KEY) as UserRole) || "USER",
    },
  };
}

export function getAuthenticatedUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}
