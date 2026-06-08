import { useState } from "react";
import { useLocale } from "../../i18n/LocaleContext";

interface Props {
  label: string;
  value: string;
}

export function CopyField({ label, value }: Props) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <p className="mb-1.5 text-[10px] uppercase tracking-wide text-df-faint">
        {label}
      </p>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1 rounded-xl border border-df bg-df-inset px-3 py-2.5 font-mono text-xs text-df break-all">
          {value || "—"}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!value}
          className="shrink-0 rounded-xl border border-[#f0b90b]/40 bg-[#f0b90b]/15 px-3 text-xs font-bold text-[#f0b90b] disabled:opacity-40"
        >
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
    </div>
  );
}
