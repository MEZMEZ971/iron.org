import { useEffect } from "react";
import { CORE_LOCALES, type Locale } from "./locales";
import { useLocale } from "./LocaleContext";

interface LanguageSwitcherOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function LanguageSwitcherOverlay({
  open,
  onClose,
}: LanguageSwitcherOverlayProps) {
  const { locale, setLocale, t } = useLocale();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function select(next: Locale) {
    setLocale(next);
    onClose();
  }

  const shellState = open
    ? "pointer-events-auto visible"
    : "pointer-events-none invisible";

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6 ${shellState}`}
      role="dialog"
      aria-modal={open}
      aria-hidden={!open}
      aria-labelledby="language-switcher-title"
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity transform ${
          open
            ? "opacity-100 duration-300 ease-out"
            : "opacity-0 duration-200 ease-in"
        }`}
        onClick={onClose}
        aria-label={t("close")}
        tabIndex={open ? 0 : -1}
      />

      <div
        className={`relative flex max-h-[min(92vh,640px)] w-full origin-bottom flex-col overflow-hidden rounded-t-2xl border border-white/[0.06] bg-[#0a0e1a]/95 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all ease-out will-change-transform sm:max-h-[min(85vh,600px)] sm:max-w-md sm:origin-center sm:rounded-2xl ${
          open
            ? "pointer-events-auto visible translate-y-0 scale-100 opacity-100 duration-300 ease-out"
            : "pointer-events-none invisible translate-y-6 scale-95 opacity-0 duration-200 ease-in sm:translate-y-2"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative shrink-0 border-b border-white/[0.06] px-4 py-4">
          <h2
            id="language-switcher-title"
            className="text-center text-base font-semibold tracking-wide text-white"
          >
            {t("profileSwitchLanguage")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute end-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-colors duration-200 hover:bg-white/10"
            aria-label={t("close")}
            tabIndex={open ? 0 : -1}
          >
            <i className="fa-solid fa-xmark text-sm" aria-hidden />
          </button>
        </header>

        <div
          className={`min-h-0 flex-1 overflow-hidden transition-all duration-300 ease-out ${
            open ? "max-h-[min(72vh,520px)] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <ul className="max-h-[min(72vh,520px)] overflow-y-auto overscroll-contain">
            {CORE_LOCALES.map(({ code, label }) => {
              const active = locale === code;
              return (
                <li key={code}>
                  <button
                    type="button"
                    onClick={() => select(code)}
                    tabIndex={open ? 0 : -1}
                    className={`flex w-full items-center gap-3 border-b border-white/[0.06] px-5 py-4 text-start transition-colors duration-200 hover:bg-white/[0.04] active:bg-white/[0.06] ${
                      active ? "bg-white/[0.03]" : ""
                    }`}
                  >
                    <span
                      className={`flex-1 text-[15px] font-medium ${
                        active ? "text-white" : "text-white/85"
                      }`}
                    >
                      {label}
                    </span>
                    {active && (
                      <span
                        className="shrink-0 text-lg font-bold leading-none drop-shadow-[0_0_8px_rgba(240,185,11,0.65)]"
                        style={{ color: "#f0b90b" }}
                        aria-hidden
                      >
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
