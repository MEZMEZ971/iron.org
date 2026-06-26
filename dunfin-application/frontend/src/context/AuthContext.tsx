import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  authLogin,
  authRegister,
  type AuthUser,
} from "../api/client";
import {
  clearAuthSession,
  loadStoredSession,
  patchStoredAuthUser,
  persistAuthSession,
  type StoredAuthUser,
} from "../lib/authStorage";
type AuthContextValue = {
  token: string | null;
  user: StoredAuthUser | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  setUserFromStorage: (token: string, user: AuthUser) => void;
  patchUser: (patch: Partial<StoredAuthUser>) => void;
};

export type RegisterPayload = {
  username: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  password: string;
  invitationCode?: string;
  referralCode?: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toStoredUser(user: AuthUser): StoredAuthUser {
  return {
    id: user.id,
    userId: user.userId || user.id,
    username: user.username ?? null,
    email: user.email ?? null,
    phone: user.phone ?? null,
    displayName: user.displayName || user.username || "",
    uid: user.uid,
    referralCode: user.referralCode,
    role: user.role ?? "USER",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => loadStoredSession());

  const applySession = useCallback((token: string, user: AuthUser) => {
    const stored = toStoredUser(user);
    persistAuthSession(token, stored);
    setSession({ token, user: stored });
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const result = await authLogin({ identifier, password });
      applySession(result.token, result.user);
    },
    [applySession]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const result = await authRegister(payload);
      applySession(result.token, result.user);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    clearAuthSession();
    setSession(null);
  }, []);

  const setUserFromStorage = useCallback(
    (token: string, user: AuthUser) => {
      applySession(token, user);
    },
    [applySession]
  );

  const patchUser = useCallback((patch: Partial<StoredAuthUser>) => {
    patchStoredAuthUser(patch);
    const next = loadStoredSession();
    if (next) setSession(next);
  }, []);

  const value = useMemo(
    () => ({
      token: session?.token ?? null,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.token && session?.user?.id),
      login,
      register,
      logout,
      setUserFromStorage,
      patchUser,
    }),
    [session, login, register, logout, setUserFromStorage, patchUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
