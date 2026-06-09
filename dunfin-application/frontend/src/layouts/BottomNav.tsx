import { NavLink } from "react-router-dom";
import { AppDownloadLinks } from "../components/layout/ApkDownloadLink";
import { MOBILE_BOTTOM_NAV } from "../config/navigation";
import { useLocale } from "../i18n/LocaleContext";

export function BottomNav() {
  const { t } = useLocale();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-df bg-df-nav backdrop-blur-xl transition-all duration-300 ease-in-out md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="border-b border-df/60 px-3 py-2">
        <AppDownloadLinks variant="mobile-strip" />
      </div>
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pt-1">
        {MOBILE_BOTTOM_NAV.map(({ to, labelKey, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-all duration-300 ease-in-out ${
                isActive ? "text-[#f0b90b]" : "text-df-muted hover:text-df"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <i
                  className={`fa-solid ${icon} text-xl ${
                    isActive ? "text-[#f0b90b] drop-shadow-[0_0_8px_rgba(240,185,11,0.45)]" : ""
                  }`}
                  aria-hidden
                />
                <span>{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
