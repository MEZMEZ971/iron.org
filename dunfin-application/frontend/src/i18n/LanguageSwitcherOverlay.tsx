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

  if (!open) return null;

  function select(next: Locale) {
    setLocale(next);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-switcher-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label={t("close")}
      />

      <div
        className="relative flex max-h-[min(92vh,640px)] w-full flex-col overflow-hidden rounded-t-2xl border border-white/[0.06] bg-[#0a0e1a]/95 shadow-2xl shadow-black/50 backdrop-blur-xl sm:max-h-[min(85vh,600px)] sm:max-w-md sm:rounded-2xl"
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
            className="absolute end-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/10"
            aria-label={t("close")}
          >
            <i className="fa-solid fa-xmark text-sm" aria-hidden />
          </button>
        </header>

        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {CORE_LOCALES.map(({ code, label }) => {
            const active = locale === code;
            return (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => select(code)}
                  className={`flex w-full items-center gap-3 border-b border-white/[0.06] px-5 py-4 text-start transition hover:bg-white/[0.04] active:bg-white/[0.06] ${
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
  );
}
