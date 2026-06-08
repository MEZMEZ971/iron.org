import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "../../i18n/LocaleContext";
import type { TranslationKey } from "../../i18n/translations";

export type NoticeToastState = {
  titleKey: TranslationKey;
  messageKey: TranslationKey;
};

interface Props {
  state: NoticeToastState;
  onDismiss: () => void;
}

export function NoticeToast({ state, onDismiss }: Props) {
  const { t } = useLocale();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[125] flex justify-center px-4 md:bottom-8"
      role="status"
      aria-live="polite"
    >
      <div
        className="notice-toast-enter pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-[#f0b90b]/35 bg-[rgba(26,31,46,0.96)] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.45),0_0_24px_rgba(240,185,11,0.12)] backdrop-blur-xl dark:bg-[rgba(26,31,46,0.96)]"
        onClick={onDismiss}
      >
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0b90b]/15 text-[#f0b90b]">
            <i className="fa-solid fa-lock text-sm" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">{t(state.titleKey)}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {t(state.messageKey)}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-slate-500 transition hover:text-white"
            aria-label={t("successModalDismiss")}
          >
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
