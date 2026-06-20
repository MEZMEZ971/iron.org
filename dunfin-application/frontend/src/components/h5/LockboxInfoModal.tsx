import { useLocale } from "../../i18n/LocaleContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LockboxInfoModal({ open, onClose }: Props) {
  const { t } = useLocale();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal
      aria-labelledby="lockbox-info-title"
      onClick={onClose}
    >
      <div
        className="max-w-sm rounded-2xl border border-teal-500/30 bg-gradient-to-b from-slate-900 to-[#0a0e1a] p-5 text-white shadow-xl shadow-teal-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="lockbox-info-title"
            className="text-base font-bold text-amber-500"
          >
            {t("h5LockboxInfoTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label={t("h5Close")}
          >
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-teal-400">
              {t("h5LockboxSectionPrimary")}
            </p>
            <p className="text-slate-200">{t("h5LockboxInfoEn")}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-end" dir="rtl">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-500">
              {t("h5LockboxSectionArabic")}
            </p>
            <p className="font-arabic text-slate-200">{t("h5LockboxInfoAr")}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-2.5 text-sm font-bold text-white"
        >
          {t("h5Ok")}
        </button>
      </div>
    </div>
  );
}
