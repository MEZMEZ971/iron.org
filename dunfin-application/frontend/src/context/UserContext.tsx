import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { DISPLAY_NAME_KEY } from "../lib/authStorage";

type UserContextValue = {
  userId: string;
  displayName: string;
  uid: string;
  setDisplayName: (name: string) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const userId = isAuthenticated && user?.id ? user.id : "";
  const displayName = user?.displayName || "";
  const uid = user?.uid || "";

  const setDisplayName = useCallback((name: string) => {
    if (name) localStorage.setItem(DISPLAY_NAME_KEY, name);
  }, []);

  const value = useMemo(
    () => ({ userId, displayName, uid, setDisplayName }),
    [userId, displayName, uid, setDisplayName]
  );

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
