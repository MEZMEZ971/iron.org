import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ProfileMenuContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const ProfileMenuContext = createContext<ProfileMenuContextValue | null>(null);

export function ProfileMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle]
  );

  return (
    <ProfileMenuContext.Provider value={value}>
      {children}
    </ProfileMenuContext.Provider>
  );
}

export function useProfileMenu() {
  const ctx = useContext(ProfileMenuContext);
  if (!ctx) {
    throw new Error("useProfileMenu must be used within ProfileMenuProvider");
  }
  return ctx;
}
