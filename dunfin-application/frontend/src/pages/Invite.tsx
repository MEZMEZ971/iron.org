import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CopyField } from "../components/invite/CopyField";
import { StrategyRewardTable } from "../components/invite/StrategyRewardTable";
import { PageHeader } from "../components/PageHeader";
import { useUser } from "../context/UserContext";
import { useInviteInfo } from "../hooks/useInviteInfo";
import { useLocale } from "../i18n/LocaleContext";
import { buildInvitationLink } from "../lib/inviteLink";

export default function Invite() {
  const { t } = useLocale();
  const { userId } = useUser();
  const { data, loading, error } = useInviteInfo(userId);
  const [linkCopied, setLinkCopied] = useState(false);

  // Always anchored to the live origin the user is browsing.
  const invitationLink = useMemo(
    () => buildInvitationLink(data?.referralCode),
    [data?.referralCode]
  );

  async function copyInviteLink() {
    if (!invitationLink) return;
    await navigator.clipboard.writeText(invitationLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div className="space-y-4 pb-6 sm:space-y-5 sm:pb-8">
      <PageHeader title={t("h5InviteFriends")} />

      {loading && <p className="text-xs text-df-faint">{t("loading")}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {data && (
        <>
          <div className="glass-card space-y-4 rounded-2xl p-4 sm:p-5">
            <CopyField label={t("h5MemberId")} value={data.memberId} />

            <div className="flex justify-center">
              <div className="rounded-2xl border border-[#f0b90b]/25 bg-white p-3 shadow-lg shadow-[#f0b90b]/10">
                <QRCodeSVG
                  value={invitationLink}
                  size={160}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0a0e1a"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={copyInviteLink}
              className="w-full rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] py-3.5 text-sm font-bold text-[#0a0e1a] shadow-lg shadow-[#f0b90b]/25 transition hover:brightness-110"
            >
              {linkCopied ? t("copied") : t("h5CopyInviteLinkBtn")}
            </button>

            <CopyField label={t("h5MyInvitationCode")} value={data.inviteCode} />
            <CopyField label={t("h5MyInvitationLink")} value={invitationLink} />

            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="rounded-lg bg-df-inset py-2">
                <p className="text-df-faint">{t("gen1")}</p>
                <p className="font-bold text-[#00d4aa]">{data.affiliate.gen1Count}</p>
              </div>
              <div className="rounded-lg bg-df-inset py-2">
                <p className="text-df-faint">{t("gen2")}</p>
                <p className="font-bold text-[#00d4aa]">{data.affiliate.gen2Count}</p>
              </div>
              <div className="rounded-lg bg-df-inset py-2">
                <p className="text-df-faint">{t("gen3")}</p>
                <p className="font-bold text-[#00d4aa]">{data.affiliate.gen3Count}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <h2 className="mb-2 text-sm font-bold text-df">{t("inviteRulesTitle")}</h2>
            <p className="text-xs leading-relaxed text-df-muted">{t("inviteRulesBody")}</p>
            <p className="mt-3 text-xs leading-relaxed text-[#ef4444]/80">
              {t("inviteRulesWarning")}
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-bold text-df">
              {t("inviteMatrixTitle")}
            </h2>
            <StrategyRewardTable rows={data.rewardMatrix} />
          </div>
        </>
      )}
    </div>
  );
}
