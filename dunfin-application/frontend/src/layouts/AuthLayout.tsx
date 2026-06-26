import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { IronBrandLockup, IronLogo } from "../components/layout/IronLogo";
import { useLocale } from "../i18n/LocaleContext";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen flex-col bg-df-page transition-all duration-300 ease-in-out">
      <div className="flex items-center px-4 py-4 md:px-8">
        <Link to="/login" className="flex items-center gap-2">
          <IronLogo size={36} />
          <span className="text-sm font-bold text-df">{t("brand")}</span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        <div className="relative z-10 w-full max-w-md">
          <IronBrandLockup layout="stack" className="mb-6" />

          <div className="glass-card mb-4 rounded-2xl p-4 shadow-lg transition-all duration-300 ease-in-out sm:mb-6 sm:p-6">
            <h1 className="text-center text-lg font-bold text-df sm:text-xl">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-center text-sm text-df-muted">{subtitle}</p>
            )}
          </div>

          <div className="glass-card rounded-2xl p-4 transition-all duration-300 ease-in-out sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
