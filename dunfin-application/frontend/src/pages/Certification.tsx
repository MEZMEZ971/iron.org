import { useState } from "react";
import { submitKyc } from "../api/client";
import { DocumentUploadZone } from "../components/kyc/DocumentUploadZone";
import { PageHeader } from "../components/PageHeader";
import { useUser } from "../context/UserContext";
import { useKyc } from "../hooks/useKyc";
import { useLocale } from "../i18n/LocaleContext";

export default function Certification() {
  const { t } = useLocale();
  const { userId } = useUser();
  const { data, loading, error, refresh } = useKyc(userId);

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isPending = data?.kycStatus === "PENDING_REVIEW";
  const isApproved = data?.kycStatus === "APPROVED";
  const locked = isPending || isApproved;

  async function handleSubmit() {
    if (!frontFile || !backFile) {
      setSubmitError(t("kycBothRequired"));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSuccess(false);
    try {
      await submitKyc(userId, {
        frontFileName: frontFile.name,
        backFileName: backFile.name,
      });
      setSuccess(true);
      setFrontFile(null);
      setBackFile(null);
      await refresh();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title={t("certificationTitle")} />

      <p className="text-sm text-df-muted leading-relaxed">{t("certificationDesc")}</p>

      {loading && <p className="text-xs text-df-faint">{t("loading")}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {data && (
        <div
          className={`glass-card rounded-xl px-4 py-3 text-sm ${
            isApproved
              ? "border border-[#00d4aa]/30 text-[#00d4aa]"
              : isPending
                ? "border border-[#f0b90b]/30 text-[#f0b90b]"
                : "text-df-muted"
          }`}
        >
          {t("kycStatusLabel")}:{" "}
          <strong>
            {data.kycStatus === "NONE"
              ? t("kycStatusNone")
              : data.kycStatus === "PENDING_REVIEW"
                ? t("kycStatusPending")
                : data.kycStatus === "APPROVED"
                  ? t("kycStatusApproved")
                  : t("kycStatusRejected")}
          </strong>
        </div>
      )}

      <DocumentUploadZone
        label={t("kycFrontLabel")}
        file={frontFile}
        onFile={setFrontFile}
        disabled={locked || submitting}
      />

      <DocumentUploadZone
        label={t("kycBackLabel")}
        file={backFile}
        onFile={setBackFile}
        disabled={locked || submitting}
      />

      <button
        type="button"
        disabled={locked || submitting || !frontFile || !backFile}
        onClick={handleSubmit}
        className="w-full rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] py-3.5 text-sm font-bold text-[#0a0e1a] shadow-lg shadow-[#f0b90b]/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? t("kycSubmitting") : t("kycSubmit")}
      </button>

      {submitError && (
        <p className="text-center text-xs text-red-400" role="alert">
          {submitError}
        </p>
      )}
      {success && (
        <p className="text-center text-xs text-[#00d4aa]" role="status">
          {t("kycSubmitSuccess")}
        </p>
      )}
    </div>
  );
}
