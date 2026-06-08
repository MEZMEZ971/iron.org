import { useState } from "react";
import { useSuccessFeedback } from "../../context/SuccessFeedbackContext";
import { useLocale } from "../../i18n/LocaleContext";

interface Props {
  address: string;
  loading?: boolean;
}

export function CopyAddressBox({ address, loading }: Props) {
  const { t } = useLocale();
  const { showCopyAddressSuccess } = useSuccessFeedback();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    showCopyAddressSuccess();
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wide text-df-faint">
        {t("depositAddressLabel")}
      </p>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1 rounded-xl border border-df bg-df-inset px-3 py-2.5 font-mono text-[11px] leading-relaxed text-df break-all">
          {loading ? "…" : address || "—"}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!address || loading}
          className="btn-golden-glow shrink-0 rounded-xl border border-[#f0b90b]/40 bg-[#f0b90b]/15 px-4 text-xs font-bold text-[#f0b90b] transition-all duration-300 hover:bg-[#f0b90b]/25 disabled:opacity-40"
        >
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
    </div>
  );
}
