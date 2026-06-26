import { Link } from "react-router-dom";
import type { TradeEarnings } from "../../api/client";
import { useLocale } from "../../i18n/LocaleContext";

interface Props {
  earnings: TradeEarnings | null;
  loading?: boolean;
}

function formatUsdt(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="trade-metric-cell rounded-xl px-2.5 py-2.5">
      <p className="text-[10px] font-medium leading-tight text-df-muted">{label}</p>
      <p className="trade-accent-value mt-1 font-mono text-sm font-bold">{value}</p>
    </div>
  );
}

export function EarningsDashboardPanel({ earnings, loading }: Props) {
  const { t } = useLocale();
  const currency = earnings?.currency ?? "USDT";

  const balance = formatUsdt(earnings?.accountBalance ?? 0);
  const proceeds = formatUsdt(earnings?.totalTransactionProceeds ?? 0);
  const pending = formatUsdt(earnings?.totalIncomeToBeDistributed ?? 0);
  const today = formatUsdt(earnings?.todayPendingEarnings ?? 0);
  const dailyRef = formatUsdt(
    earnings?.teamCommissions.dailyReferralEarnings ?? 0
  );
  const monthlyRef = formatUsdt(
    earnings?.teamCommissions.monthlyReferralEarnings ?? 0
  );

  return (
    <section className="trade-card space-y-4 rounded-2xl p-4 transition-all duration-300">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-df-muted">
          {t("earningsAccountBalance")}
        </p>
        <p className="trade-balance-value mt-1 font-mono text-3xl font-bold">
          {loading ? "—" : balance}{" "}
          <span className="text-lg font-semibold text-df-muted">{currency}</span>
        </p>
      </div>

      <div className="trade-metrics-panel rounded-2xl p-4">
        <div className="grid grid-cols-2 gap-2.5">
          <MetricCell
            label={t("earningsTotalTransactionProceeds")}
            value={loading ? "—" : `${proceeds} ${currency}`}
          />
          <MetricCell
            label={t("earningsTotalIncomeToDistribute")}
            value={loading ? "—" : `${pending} ${currency}`}
          />
          <MetricCell
            label={t("earningsTodayToDistribute")}
            value={loading ? "—" : `${today} ${currency}`}
          />
          <div className="trade-metric-cell rounded-xl px-2.5 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-df-muted">
              {t("earningsTeamCommissions")}
            </p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[10px] text-df-muted">
                <span>{t("earningsDailyReferral")}</span>
                <span className="trade-accent-value font-mono font-bold">
                  {loading ? "—" : `${dailyRef}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px] text-df-muted">
                <span>{t("earningsMonthlyReferral")}</span>
                <span className="trade-accent-value font-mono font-bold">
                  {loading ? "—" : `${monthlyRef}`}
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[9px] text-df-faint">
          {t("earningsProceedsResets")}
        </p>
      </div>

      <Link
        to="/deposit"
        className="trade-btn-primary flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-bold transition-all duration-300"
      >
        {t("earningsDeposit")}
      </Link>

      <div role="note" className="trade-notice rounded-xl px-3 py-2.5 text-center text-xs font-medium">
        {t("earningsTradeOnceNotice")}
      </div>
    </section>
  );
}
