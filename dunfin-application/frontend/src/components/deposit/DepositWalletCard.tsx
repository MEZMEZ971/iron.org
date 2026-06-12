import { useState } from "react";
import { useSuccessFeedback } from "../../context/SuccessFeedbackContext";
import { useLocale } from "../../i18n/LocaleContext";
import { DepositQrCode } from "./DepositQrCode";

interface Props {
  address: string;
  loading?: boolean;
  error?: string | null;
  networkLabel?: string;
  variant?: "default" | "h5";
}

export function DepositWalletCard({
  address,
  loading,
  error,
  networkLabel = "TRC20",
  variant = "default",
}: Props) {
  const { t } = useLocale();
  const { showCopyAddressSuccess } = useSuccessFeedback();
  const [copied, setCopied] = useState(false);

  const isH5 = variant === "h5";

  async function handleCopy() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    showCopyAddressSuccess();
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={
        isH5
          ? "space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5"
          : "glass-card space-y-5 rounded-2xl p-5"
      }
    >
      <h2
        className={
          isH5
            ? "text-center text-sm font-bold leading-snug text-white"
            : "text-center text-sm font-bold leading-snug text-df"
        }
      >
        {t("depositTrc20AddressTitle")}
      </h2>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div
          className={
            isH5
              ? "min-w-0 flex-1 rounded-xl border border-emerald-500/30 bg-black/30 px-3 py-3 font-mono text-[11px] leading-relaxed break-all text-emerald-100"
              : "min-w-0 flex-1 rounded-xl border border-df-strong bg-df-inset px-3 py-3 font-mono text-[11px] leading-relaxed break-all text-df"
          }
        >
          {loading ? "…" : address || "—"}
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={!address || loading}
          className={
            isH5
              ? "btn-golden-glow shrink-0 rounded-xl border border-[#f0b90b]/40 bg-[#f0b90b]/15 px-4 py-3 text-xs font-bold text-[#f0b90b] transition-all duration-300 hover:bg-[#f0b90b]/25 disabled:opacity-40 sm:min-w-[7.5rem]"
              : "btn-golden-glow shrink-0 rounded-xl border border-[#f0b90b]/40 bg-[#f0b90b]/15 px-4 py-3 text-xs font-bold text-[#f0b90b] transition-all duration-300 hover:bg-[#f0b90b]/25 disabled:opacity-40 sm:min-w-[7.5rem]"
          }
        >
          {copied ? t("copied") : t("copyAddress")}
        </button>
      </div>

      <div className="flex justify-center pt-1">
        <DepositQrCode value={address} loading={loading} />
      </div>

      {error && (
        <p className="text-center text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      <p
        className={
          isH5
            ? "text-center text-[10px] leading-relaxed text-slate-400"
            : "text-center text-[10px] leading-relaxed text-df-faint"
        }
      >
        {t("depositWarning")} ({networkLabel})
      </p>
    </div>
  );
}
