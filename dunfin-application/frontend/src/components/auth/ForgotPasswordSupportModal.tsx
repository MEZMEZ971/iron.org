import { useEffect } from "react";
import { TELEGRAM_SUPPORT_HANDLE, TELEGRAM_SUPPORT_URL } from "../../config/support";
import { useLocale } from "../../i18n/LocaleContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function ForgotPasswordSupportModal({ open, onClose }: Props) {
  const { t } = useLocale();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0a0e1a]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="forgot-password-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#f0b90b]/25 bg-gradient-to-b from-[#1a1f2e] to-[#0a0e1a] p-5 text-white shadow-xl shadow-[#f0b90b]/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="forgot-password-title" className="text-base font-bold text-[#f0b90b]">
            {t("authForgotPasswordTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label={t("close")}
          >
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {t("authForgotPasswordBody")}
        </p>

        <a
          href={TELEGRAM_SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#26A5E4] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#26A5E4]/30 transition hover:bg-[#1e8ec5] active:scale-[0.98]"
        >
          <TelegramIcon className="h-5 w-5 shrink-0" />
          {t("authTelegramSupportButton", { handle: TELEGRAM_SUPPORT_HANDLE })}
        </a>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
        >
          {t("close")}
        </button>
      </div>
    </div>
  );
}
