import { useRef, type ChangeEvent, type DragEvent } from "react";
import { useLocale } from "../../i18n/LocaleContext";

interface Props {
  label: string;
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}

function CloudUploadIcon() {
  return (
    <i
      className="fa-solid fa-cloud-arrow-up mx-auto block text-4xl text-[#f0b90b]/75"
      aria-hidden
    />
  );
}

export function DocumentUploadZone({ label, file, onFile, disabled }: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    onFile(f);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-df-muted">{label}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`glass-card w-full rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          file
            ? "border-[#00d4aa]/40 bg-[#00d4aa]/5"
            : "border-df-strong hover:border-[#f0b90b]/40"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <CloudUploadIcon />
        <p className="mt-3 text-sm text-df-muted">
          {file ? file.name : t("kycDropHint")}
        </p>
        {file && (
          <p className="mt-1 text-[10px] text-[#00d4aa]">{t("kycFileReady")}</p>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={pick}
        disabled={disabled}
      />
    </div>
  );
}
