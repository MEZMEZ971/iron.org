import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { IronLogo } from "../components/layout/IronLogo";
import { LanguageSwitcherOverlay } from "../i18n/LanguageSwitcherOverlay";
import { useLocale } from "../i18n/LocaleContext";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { t } = useLocale();
  const [languageOpen, setLanguageOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-df-page transition-all duration-300 ease-in-out">
      <div className="flex items-center justify-between px-4 py-4 md:px-8">
        <Link to="/login" className="flex items-center gap-2">
          <IronLogo size={36} />
          <span className="text-sm font-bold text-df">{t("brand")}</span>
        </Link>
        <button
          type="button"
          onClick={() => setLanguageOpen(true)}
          className="flex h-9 items-center gap-2 rounded-lg border border-df-strong bg-df-inset px-3 text-xs font-bold text-[#f0b90b] transition hover:border-[#f0b90b]/30 hover:bg-[#f0b90b]/10"
        >
          <i className="fa-solid fa-globe" aria-hidden />
          <span className="hidden sm:inline">{t("profileSwitchLanguage")}</span>
        </button>
      </div>

      <LanguageSwitcherOverlay
        open={languageOpen}
        onClose={() => setLanguageOpen(false)}
      />

      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md">
          <div className="glass-card mb-6 rounded-2xl p-6 shadow-lg transition-all duration-300 ease-in-out">
            <h1 className="text-center text-xl font-bold text-df">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-center text-sm text-df-muted">{subtitle}</p>
            )}
          </div>
          <div className="glass-card rounded-2xl p-6 transition-all duration-300 ease-in-out">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
