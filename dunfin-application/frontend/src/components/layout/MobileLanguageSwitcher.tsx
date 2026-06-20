import { useState } from "react";
import { LanguageSwitcherOverlay } from "../../i18n/LanguageSwitcherOverlay";
import { useLocale } from "../../i18n/LocaleContext";
import { getLocaleMeta } from "../../i18n/locales";

/** Fixed mobile utility — visible on every route below the md breakpoint. */
export function MobileLanguageSwitcher() {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const activeLabel = getLocaleMeta(locale).label;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-[max(1rem,env(safe-area-inset-top))] end-[max(1rem,env(safe-area-inset-right))] z-50 flex md:hidden h-9 max-w-[min(42vw,11rem)] items-center gap-1.5 rounded-full border border-gray-700 bg-[#1a202c]/80 px-3 py-1.5 text-[#f0b90b] shadow-lg shadow-black/20 backdrop-blur-md transition hover:border-[#f0b90b]/35 hover:bg-[#1a202c]/95 active:scale-[0.98]"
        aria-label={t("profileSwitchLanguage")}
        title={activeLabel}
      >
        <i className="fa-solid fa-globe shrink-0 text-sm" aria-hidden />
        <span className="truncate text-[11px] font-semibold text-white/90">
          {activeLabel}
        </span>
      </button>

      <LanguageSwitcherOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}
