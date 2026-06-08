import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "../../i18n/LocaleContext";
import type { SuccessFeedbackState } from "../../context/SuccessFeedbackContext";

interface Props {
  state: SuccessFeedbackState;
  onDismiss: () => void;
}

export function SuccessTransactionModal({ state, onDismiss }: Props) {
  const { t } = useLocale();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const title = t(state.titleKey);
  const message = t(state.messageKey);

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[#0a0e1a]/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
      onClick={onDismiss}
    >
      <div
        className="success-modal-panel relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[rgba(26,31,46,0.92)] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.55),0_0_40px_rgba(0,212,170,0.08)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute -top-16 start-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-[#00d4aa]/15 blur-2xl"
          aria-hidden
        />

        <div className="relative flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00d4aa]/10 ring-1 ring-[#00d4aa]/30">
            <i
              className="fa-solid fa-circle-check success-check-icon text-4xl text-[#00d4aa]"
              aria-hidden
            />
          </div>

          <h2
            id="success-modal-title"
            className="text-lg font-bold tracking-tight text-white"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{message}</p>

          {state.detail && (
            <p className="mt-3 w-full rounded-xl border border-white/8 bg-[#0a0e1a]/50 px-3 py-2.5 font-mono text-xs text-[#00d4aa] break-all">
              {state.detail}
            </p>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className="btn-golden-glow mt-6 w-full rounded-xl bg-gradient-to-r from-[#f0b90b]/90 via-[#fcd535] to-[#f0b90b]/90 py-2.5 text-sm font-bold text-[#0a0e1a] shadow-md shadow-[#f0b90b]/20 transition-all duration-300"
          >
            {t("successModalDismiss")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
