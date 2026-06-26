import { Link } from "react-router-dom";
import { useH5Portfolio } from "../../context/H5PortfolioContext";
import { useLocale } from "../../i18n/LocaleContext";

function fmt(n: number) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const METRIC_CARD = "trade-metric-cell rounded-xl px-2 py-2";

export function H5EarningsCard() {
  const { t } = useLocale();
  const { earningsView, loading } = useH5Portfolio();
  const cur = earningsView.currency;

  return (
    <section className="trade-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[10px] text-df-muted">{t("h5CurrentLevel")}</span>
        <Link
          to="/trade"
          className="flex items-center gap-1 text-[10px] font-semibold text-df-muted transition-colors hover:text-df"
        >
          {t("h5EarningsRecords")}
          <i className="fa-solid fa-chart-pie" aria-hidden />
        </Link>
      </div>

      <div className="px-4 pb-3 text-center">
        <p className="text-xs text-df-muted">{t("earningsAccountBalance")}</p>
        <p className="trade-balance-value mt-1 font-mono text-3xl font-extrabold">
          {loading ? "—" : fmt(earningsView.accountBalance)}{" "}
          <span className="text-lg text-df-muted">{cur}</span>
        </p>
      </div>

      <div className="trade-metrics-panel mx-4 mb-3 rounded-2xl p-3">
        <div className="grid grid-cols-2 gap-2">
          <Metric
            label={t("earningsTotalTransactionProceeds")}
            value={fmt(earningsView.totalProceeds)}
          />
          <Metric
            label={t("earningsTotalIncomeToDistribute")}
            value={fmt(earningsView.pendingIncome)}
          />
          <Metric
            label={t("earningsTodayToDistribute")}
            value={fmt(earningsView.todayEarnings)}
          />
          <div className={METRIC_CARD}>
            <p className="text-[9px] font-medium text-df-muted">
              {t("earningsTeamCommissions")}
            </p>
            <p className="mt-1 flex justify-between text-[9px] font-medium text-df-muted">
              <span>{t("earningsDailyReferral")}</span>
              <span className="trade-accent-value font-mono font-extrabold">
                {fmt(earningsView.dailyReferral)}
              </span>
            </p>
            <p className="flex justify-between text-[9px] font-medium text-df-muted">
              <span>{t("earningsMonthlyReferral")}</span>
              <span className="trade-accent-value font-mono font-extrabold">
                {fmt(earningsView.monthlyReferral)}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0">
        <Link
          to="/deposit"
          className="trade-btn-primary block w-full rounded-xl py-3 text-center text-sm font-bold tracking-wide active:scale-[0.98]"
        >
          {t("earningsDeposit")}
        </Link>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={METRIC_CARD}>
      <p className="text-[9px] font-medium leading-tight text-df-muted">{label}</p>
      <p className="trade-accent-value mt-0.5 font-mono text-sm font-extrabold">
        {value}
      </p>
    </div>
  );
}
