import { useLocale } from "../../i18n/LocaleContext";
import type { TeamGenStats } from "../../api/client";

interface Props {
  gen1: TeamGenStats;
  gen2: TeamGenStats;
  gen3: TeamGenStats;
}

function GenRow({
  title,
  grade,
  rebate,
  participants,
}: {
  title: string;
  grade: string;
  rebate: number;
  participants: number;
}) {
  const { t } = useLocale();

  return (
    <div className="glass-card rounded-xl border border-df px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#f0b90b]">{title}</p>
          <p className="text-[10px] text-df-faint">{grade}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-df-faint">{t("teamGenRebate")}</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-[#00d4aa]">
            {rebate.toFixed(6)} USDT
          </p>
        </div>
        <div className="text-end">
          <p className="text-[10px] text-df-faint">{t("teamGenParticipants")}</p>
          <p className="mt-0.5 text-sm font-bold text-df">{participants}</p>
        </div>
      </div>
    </div>
  );
}

export function GenRebateMatrix({ gen1, gen2, gen3 }: Props) {
  const { t } = useLocale();

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-df">{t("h5CommissionRebateTitle")}</h2>
      <GenRow
        title={t("teamGen1Title")}
        grade={t("teamGradeA")}
        rebate={gen1.rebate}
        participants={gen1.count}
      />
      <GenRow
        title={t("teamGen2Title")}
        grade={t("teamGradeB")}
        rebate={gen2.rebate}
        participants={gen2.count}
      />
      <GenRow
        title={t("teamGen3Title")}
        grade={t("teamGradeC")}
        rebate={gen3.rebate}
        participants={gen3.count}
      />
    </div>
  );
}
