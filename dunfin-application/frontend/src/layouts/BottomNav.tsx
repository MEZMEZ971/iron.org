import { NavLink } from "react-router-dom";
import { MOBILE_BOTTOM_NAV } from "../config/navigation";
import { useLocale } from "../i18n/LocaleContext";

export function BottomNav() {
  const { t } = useLocale();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-df bg-df-nav/95 backdrop-blur-xl transition-all duration-300 ease-in-out md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t("navHome")}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1.5 pb-1">
        {MOBILE_BOTTOM_NAV.map(({ to, labelKey, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-all duration-300 ease-in-out active:scale-[0.97] ${
                isActive ? "text-[#f0b90b]" : "text-df-muted hover:text-df"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <i
                  className={`fa-solid ${icon} text-[1.35rem] ${
                    isActive ? "text-[#f0b90b] drop-shadow-[0_0_8px_rgba(240,185,11,0.45)]" : ""
                  }`}
                  aria-hidden
                />
                <span className="max-w-full truncate px-0.5">{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
