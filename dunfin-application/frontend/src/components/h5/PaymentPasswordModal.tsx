import { useEffect, useState } from "react";
import { useLocale } from "../../i18n/LocaleContext";

type Props = {
  open: boolean;
  busy: boolean;
  requiresPaymentPin: boolean;
  onClose: () => void;
  onVerify: (paymentPassword: string) => void;
  onOpenSettings: () => void;
};

export function PaymentPasswordModal({
  open,
  busy,
  requiresPaymentPin,
  onClose,
  onVerify,
  onOpenSettings,
}: Props) {
  const { t, dir } = useLocale();
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setVisible(false);
    }
  }, [open]);

  if (!open) return null;

  const canSubmit = requiresPaymentPin && password.length === 6 && !busy;

  function handleClose() {
    if (busy) return;
    setPassword("");
    setVisible(false);
    onClose();
  }

  function handleVerify() {
    if (!canSubmit) return;
    onVerify(password);
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-verify-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={handleClose}
        aria-label={t("h5PaymentCancel")}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl border border-amber-500/25 bg-[#0a0e1a]/95 p-5 shadow-2xl shadow-amber-500/10"
        dir={dir}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
            <i
              className="fa-solid fa-shield-halved text-xl text-amber-500"
              aria-hidden
            />
          </div>
          <h3
            id="payment-verify-title"
            className="text-base font-bold text-[#fcd535]"
          >
            {t("h5PaymentVerifyTitle")}
          </h3>
          <p className="mt-0.5 font-arabic text-sm font-bold text-teal-400" dir="rtl">
            {t("h5PaymentVerifyTitleAr")}
          </p>
        </div>

        {!requiresPaymentPin ? (
          <div className="mt-4 space-y-3 text-center">
            <p className="text-xs text-slate-300">{t("h5PaymentPinNotSetup")}</p>
            <p className="font-arabic text-xs text-amber-400/90" dir="rtl">
              {t("h5PaymentPinNotSetupAr")}
            </p>
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-full rounded-xl border border-teal-500/40 bg-teal-500/15 py-2.5 text-sm font-bold text-teal-400"
            >
              {t("h5PaymentGoSettings")}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-slate-400"
            >
              {t("h5PaymentCancel")}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
              {t("h5PaymentVerifySubtitle")}
            </p>
            <p
              className="mt-1 text-center font-arabic text-[11px] leading-relaxed text-slate-500"
              dir="rtl"
            >
              {t("h5PaymentVerifySubtitleAr")}
            </p>

            <div className="relative mt-4">
              <input
                type={visible ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder={t("h5PaymentPasswordPlaceholder")}
                className={`w-full rounded-xl border border-amber-500/30 bg-black/50 py-3 font-mono text-center text-lg tracking-[0.45em] text-white transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                  dir === "rtl" ? "pl-10" : "pr-10"
                }`}
                dir={dir}
                autoComplete="off"
                aria-label={t("h5PaymentVerifySubtitle")}
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className={`absolute top-1/2 -translate-y-1/2 text-amber-500/80 hover:text-amber-400 ${
                  dir === "rtl" ? "left-3" : "right-3"
                }`}
                aria-label={visible ? "Hide password" : "Show password"}
              >
                <i
                  className={`fa-solid ${visible ? "fa-eye-slash" : "fa-eye"}`}
                  aria-hidden
                />
              </button>
            </div>

            <div
              className={`mt-5 flex gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}
            >
              <button
                type="button"
                disabled={busy}
                onClick={handleClose}
                className="flex-1 rounded-xl border border-white/15 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                {t("h5PaymentCancel")}
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleVerify}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#c99400] py-3 text-sm font-bold text-[#0a0e1a] shadow-lg shadow-amber-500/25 disabled:opacity-50"
              >
                {busy && (
                  <i
                    className="fa-solid fa-circle-notch animate-spin"
                    aria-hidden
                  />
                )}
                <span>{t("h5PaymentVerifyPayout")}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
