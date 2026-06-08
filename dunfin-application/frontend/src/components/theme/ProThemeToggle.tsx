import { useLocale } from "../../i18n/LocaleContext";
import { useTheme } from "../../context/ThemeContext";

interface ProThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ProThemeToggle({ className = "", compact }: ProThemeToggleProps) {
  const { t } = useLocale();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border border-df bg-df-glass px-3 py-2.5 backdrop-blur-md transition-all duration-300 ease-in-out ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ease-in-out ${
            isDark
              ? "bg-[#f0b90b]/15 text-[#fcd535] shadow-[0_0_16px_rgba(252,213,53,0.35)]"
              : "bg-[#1e3a5f]/15 text-[#1e40af]"
          }`}
        >
          <i
            className={`fa-solid ${isDark ? "fa-sun" : "fa-moon"} text-base transition-all duration-300 ease-in-out`}
            aria-hidden
          />
        </span>
        {!compact && (
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-df-muted">
              {t("themeMode")}
            </p>
            <p className="text-xs font-semibold text-df">
              {isDark ? t("themeProDark") : t("themeProLight")}
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={!isDark}
        aria-label={isDark ? t("themeProDark") : t("themeProLight")}
        onClick={toggleTheme}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-all duration-300 ease-in-out ${
          isDark
            ? "border-[#f0b90b]/30 bg-[#0a0e1a]/80"
            : "border-[#1e3a5f]/20 bg-[#e2e8f0]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full shadow-sm transition-all duration-300 ease-in-out ${
            isDark
              ? "left-0.5 rtl:left-auto rtl:right-0.5 bg-gradient-to-br from-[#fcd535] to-[#f0b90b]"
              : "right-0.5 rtl:right-auto rtl:left-0.5 bg-gradient-to-br from-[#1e40af] to-[#0f172a]"
          }`}
        />
      </button>
    </div>
  );
}
