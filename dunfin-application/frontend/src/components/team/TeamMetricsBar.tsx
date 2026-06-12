import { useLocale } from "../../i18n/LocaleContext";
import { formatUsdt, safeNumber } from "../../lib/formatNumbers";

interface Props {
  totalCommission: number;
  totalTurnover: number;
  dailyVolume: number;
  headcount: number;
  newRegistrationsToday: number;
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="glass-card rounded-xl border border-df px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-df-faint">{label}</p>
      <p
        className={`mt-1 text-sm font-bold tabular-nums ${
          accent ? "text-[#f0b90b]" : "text-df"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function TeamMetricsBar({
  totalCommission,
  totalTurnover,
  dailyVolume,
  headcount,
  newRegistrationsToday,
}: Props) {
  const { t } = useLocale();
  const usdt = (n: number) => `${formatUsdt(n, undefined, 6)} USDT`;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label={t("h5TeamCommission")}
          value={usdt(totalCommission)}
          accent
        />
        <MetricCard
          label={t("h5TeamTotalTurnover")}
          value={usdt(totalTurnover)}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label={t("h5DailyVolume")} value={usdt(dailyVolume)} />
        <MetricCard label={t("h5TeamHeadcount")} value={String(safeNumber(headcount))} />
        <MetricCard
          label={t("h5NewRegistrationToday")}
          value={String(safeNumber(newRegistrationsToday))}
          accent
        />
      </div>
    </div>
  );
}
