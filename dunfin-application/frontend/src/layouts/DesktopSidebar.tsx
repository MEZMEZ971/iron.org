import { NavLink, useNavigate } from "react-router-dom";
import { AppDownloadLinks } from "../components/layout/ApkDownloadLink";
import { IronLogo } from "../components/layout/IronLogo";
import { ProThemeToggle } from "../components/theme/ProThemeToggle";
import { DESKTOP_SIDEBAR_NAV } from "../config/navigation";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { isAdminRole } from "../lib/authStorage";
import { useUserProfile } from "../hooks/useUserProfile";
import { useState } from "react";
import { LanguageSwitcherOverlay } from "../i18n/LanguageSwitcherOverlay";
import { useLocale } from "../i18n/LocaleContext";
import { getLocaleMeta } from "../i18n/locales";

function navLinkClass(isActive: boolean) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-in-out ${
    isActive
      ? "bg-amber-500/10 text-[#f0b90b] shadow-[inset_0_0_0_1px_rgba(240,185,11,0.15)]"
      : "text-slate-600 dark:text-slate-400 hover:bg-amber-500/5 hover:text-[#f0b90b] dark:hover:bg-amber-500/10"
  }`;
}

export function DesktopSidebar() {
  const { t, locale, dir } = useLocale();
  const { user } = useAuth();
  const { displayName, userId } = useUser();
  const showAdminPortal = isAdminRole(user?.role);
  const { profile } = useUserProfile(userId);
  const navigate = useNavigate();
  const [languageOpen, setLanguageOpen] = useState(false);
  const activeLanguageLabel = getLocaleMeta(locale).label;

  const vipLevel = profile?.activeStrategy
    ? `LV${profile.activeStrategy}`
    : "LV1";
  const initials = displayName.slice(0, 2).toUpperCase();
  const borderSide =
    dir === "rtl"
      ? "border-s border-slate-200 dark:border-slate-800/50"
      : "border-e border-slate-200 dark:border-slate-800/50";

  return (
    <aside
      className={`hidden md:flex md:w-72 md:shrink-0 md:flex-col bg-slate-50 dark:bg-[#0d1222] backdrop-blur-xl ${borderSide} transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col gap-1 p-5">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-3 rounded-xl text-start transition-all duration-300 ease-in-out hover:opacity-90"
        >
          <IronLogo size={44} />
          <div className="min-w-0">
            <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{t("brand")}</p>
            <p className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">{t("tagline")}</p>
          </div>
        </button>
      </div>

      <button
        type="button"
        onClick={() => navigate("/my")}
        className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-start transition-all duration-300 ease-in-out hover:border-[#f0b90b]/25 hover:bg-[#f0b90b]/5 dark:border-slate-800/50 dark:bg-white/5"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f0b90b]/35 to-[#00d4aa]/20 text-sm font-bold text-[#f0b90b] ring-2 ring-[#f0b90b]/20">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{displayName}</p>
          <span className="mt-0.5 inline-block rounded-md bg-gradient-to-r from-[#e91e8c] to-[#ff6b9d] px-2 py-0.5 text-[10px] font-bold text-white">
            {vipLevel}
          </span>
        </div>
      </button>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {DESKTOP_SIDEBAR_NAV.map(({ to, labelKey, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <i className={`fa-solid ${icon} w-5 text-center text-base`} aria-hidden />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
        {showAdminPortal && (
          <NavLink
            to="/admin-portal"
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <i
              className="fa-solid fa-shield-halved w-5 text-center text-base text-[#f0b90b]"
              aria-hidden
            />
            <span>{t("adminPortalTitle")}</span>
          </NavLink>
        )}
        <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800/50">
          <AppDownloadLinks variant="sidebar" />
        </div>
      </nav>

      <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800/50">
        <ProThemeToggle compact />
        <button
          type="button"
          onClick={() => setLanguageOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-df-strong bg-df-inset px-3 py-2.5 text-start transition-all duration-300 ease-in-out hover:border-[#f0b90b]/25 hover:bg-[#f0b90b]/5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f0b90b]/10 text-[#f0b90b]">
            <i className="fa-solid fa-globe text-sm" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-df-faint">
              {t("profileSwitchLanguage")}
            </span>
            <span className="block truncate text-sm font-semibold text-df">
              {activeLanguageLabel}
            </span>
          </span>
          <i
            className={`fa-solid fa-chevron-right text-xs text-df-faint ${
              dir === "rtl" ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
      </div>

      <LanguageSwitcherOverlay
        open={languageOpen}
        onClose={() => setLanguageOpen(false)}
      />
    </aside>
  );
}
