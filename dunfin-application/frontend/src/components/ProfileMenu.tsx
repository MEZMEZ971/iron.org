import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { ProThemeToggle } from "./theme/ProThemeToggle";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isAdminRole } from "../lib/authStorage";
import { useUser } from "../context/UserContext";
import { LanguageSwitcherOverlay } from "../i18n/LanguageSwitcherOverlay";
import { useLocale } from "../i18n/LocaleContext";
import type { TranslationKey } from "../i18n/translations";
import { useUserProfile } from "../hooks/useUserProfile";
import { lockBodyScroll, unlockBodyScroll } from "../lib/scrollLock";
import {
  IconActivity,
  IconCertification,
  IconChevronEdge,
  IconCopy,
  IconHelp,
  IconInvite,
  IconLanguage,
  IconSettings,
  IconSupport,
  IconTeam,
} from "./profile/ProfileMenuIcons";

type MenuItem = {
  key: TranslationKey;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  action: "navigate" | "language" | "support" | "placeholder";
  path?: string;
};

const MENU_ITEMS: MenuItem[] = [
  { key: "profileCertification", Icon: IconCertification, action: "navigate", path: "/certification" },
  { key: "profileActivity", Icon: IconActivity, action: "placeholder" },
  { key: "profileInvite", Icon: IconInvite, action: "navigate", path: "/invite" },
  { key: "profileCustomerService", Icon: IconSupport, action: "support" },
  { key: "profileTeam", Icon: IconTeam, action: "navigate", path: "/team" },
  { key: "profileHelp", Icon: IconHelp, action: "navigate", path: "/help" },
  { key: "profileSetting", Icon: IconSettings, action: "navigate", path: "/settings" },
  { key: "profileSwitchLanguage", Icon: IconLanguage, action: "language" },
];

interface ProfileMenuContentProps {
  /** Back arrow only — must not run when navigating to Team, Settings, etc. */
  onBack?: () => void;
  /** Closes the desktop slide-over drawer after navigation */
  onDrawerClose?: () => void;
  showBack?: boolean;
}

export function ProfileMenuContent({
  onBack,
  onDrawerClose,
  showBack,
}: ProfileMenuContentProps) {
  const { t, dir } = useLocale();
  const { logout, user } = useAuth();
  const showAdminPortal = isAdminRole(user?.role);
  const { displayName, uid: storedUid, userId } = useUser();
  const { profile } = useUserProfile(userId);
  const uid = profile?.uid ?? storedUid;
  const navigate = useNavigate();
  const rtl = dir === "rtl";

  const [uidCopied, setUidCopied] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [placeholderNotice, setPlaceholderNotice] = useState<string | null>(null);

  const vipLevel = profile?.activeStrategy
    ? `LV${profile.activeStrategy}`
    : "LV1";

  async function copyUid() {
    await navigator.clipboard.writeText(uid);
    setUidCopied(true);
    setTimeout(() => setUidCopied(false), 2000);
  }

  function handleLogout() {
    logout();
    onDrawerClose?.();
    navigate("/login", { replace: true });
  }

  function handleMenuItem(item: MenuItem) {
    if (item.action === "language") {
      setLanguageOpen(true);
      return;
    }
    if (item.action === "support") {
      setSupportOpen(true);
      return;
    }
    if (item.action === "navigate" && item.path) {
      navigate(item.path);
      onDrawerClose?.();
      return;
    }
    if (item.action === "placeholder") {
      setPlaceholderNotice(t("featureComingSoon"));
      window.setTimeout(() => setPlaceholderNotice(null), 2500);
    }
  }

  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-full flex-col bg-df-page transition-all duration-300 ease-in-out">
      {showBack && (
        <div className="flex items-center gap-3 border-b border-df px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-df-strong text-df-muted"
            aria-label={t("back")}
          >
            {rtl ? "→" : "←"}
          </button>
          <span className="text-sm font-semibold text-df">{t("profileMenu")}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-df p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f0b90b]/30 to-[#00d4aa]/20 text-lg font-bold text-[#f0b90b] ring-2 ring-[#f0b90b]/25">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-base font-bold text-df">{displayName}</p>
                <span className="shrink-0 rounded-md bg-gradient-to-r from-[#e91e8c] to-[#ff6b9d] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  {vipLevel}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-xs text-df-faint">
                  UID: <span className="font-mono text-df-muted">{uid}</span>
                </span>
                <button
                  type="button"
                  onClick={copyUid}
                  className="rounded p-0.5 text-[#f0b90b] hover:bg-[#f0b90b]/10"
                  aria-label={t("copy")}
                >
                  <IconCopy className="h-3.5 w-3.5" />
                </button>
                {uidCopied && (
                  <span className="text-[10px] text-[#00d4aa]">{t("copied")}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <ProThemeToggle />
          </div>
        </div>

        {placeholderNotice && (
          <p className="mx-4 mb-2 rounded-lg bg-[#f0b90b]/10 px-3 py-2 text-center text-xs text-[#f0b90b]">
            {placeholderNotice}
          </p>
        )}

        <nav className="px-2 py-2">
          <ul className="space-y-0.5">
            {showAdminPortal && (
              <li key="admin-portal">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/admin-portal");
                    onDrawerClose?.();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-start transition-all duration-300 ease-in-out hover:bg-df-inset active:bg-[#f0b90b]/10"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0b90b]/10">
                    <i
                      className="fa-solid fa-shield-halved text-lg text-[#f0b90b]"
                      aria-hidden
                    />
                  </span>
                  <span className="flex-1 text-sm font-medium text-df">
                    {t("adminPortalTitle")}
                  </span>
                  <IconChevronEdge rtl={rtl} />
                </button>
              </li>
            )}
            {MENU_ITEMS.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => handleMenuItem(item)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-start transition-all duration-300 ease-in-out hover:bg-df-inset active:bg-[#f0b90b]/10"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0b90b]/10 text-[#f0b90b]">
                    <item.Icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-df">
                    {t(item.key)}
                  </span>
                  <IconChevronEdge rtl={rtl} />
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="shrink-0 border-t border-df p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="btn-golden-glow w-full rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] py-3.5 text-sm font-bold text-[#0a0e1a] shadow-lg shadow-[#f0b90b]/20 transition-all duration-300"
        >
          {t("profileLogout")}
        </button>
      </div>

      <LanguageSwitcherOverlay
        open={languageOpen}
        onClose={() => setLanguageOpen(false)}
      />

      {supportOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-card w-full max-w-sm rounded-2xl p-5">
            <h3 className="text-base font-bold text-df">
              {t("profileCustomerService")}
            </h3>
            <p className="mt-2 text-sm text-df-muted">{t("supportModalBody")}</p>
            <button
              type="button"
              onClick={() => setSupportOpen(false)}
              className="mt-4 w-full rounded-xl bg-[#f0b90b]/20 py-2.5 text-sm font-semibold text-[#f0b90b]"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProfileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileMenuDrawer({ open, onClose }: ProfileMenuDrawerProps) {
  const { dir } = useLocale();
  const rtl = dir === "rtl";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    lockBodyScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const slideClosed = rtl ? "-translate-x-full" : "translate-x-full";

  return (
    <div
      className={`fixed inset-0 z-[90] hidden transition-opacity duration-300 md:block ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close menu"
      />

      <aside
        className={`fixed top-0 bottom-0 flex w-full max-w-sm flex-col bg-df-sidebar shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out ${
          rtl ? "left-0" : "right-0"
        } ${open ? "translate-x-0" : slideClosed}`}
      >
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-df-strong text-df-muted hover:text-df ${
            rtl ? "left-3" : "right-3"
          }`}
          aria-label="Close"
        >
          ×
        </button>
        <ProfileMenuContent onDrawerClose={onClose} />
      </aside>
    </div>
  );
}
