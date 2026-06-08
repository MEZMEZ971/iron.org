import { Link } from "react-router-dom";
import { useH5Portfolio } from "../../context/H5PortfolioContext";
import { useLocale } from "../../i18n/LocaleContext";

function fmt(n: number) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const METRIC_CARD =
  "rounded-xl border bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border-amber-400/40 px-2 py-2 dark:border-amber-500/30";

export function H5EarningsCard() {
  const { t } = useLocale();
  const { earningsView, loading } = useH5Portfolio();
  const cur = earningsView.currency;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur-md">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[10px] text-slate-600 dark:text-slate-400">
          {t("h5CurrentLevel")}
        </span>
        <Link
          to="/trade"
          className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
        >
          {t("h5EarningsRecords")}
          <i className="fa-solid fa-chart-pie" aria-hidden />
        </Link>
      </div>

      <div className="px-4 pb-3 text-center">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {t("earningsAccountBalance")}
        </p>
        <p className="mt-1 font-mono text-3xl font-extrabold text-amber-600 dark:text-amber-400">
          {loading ? "—" : fmt(earningsView.accountBalance)}{" "}
          <span className="text-lg">{cur}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
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
          <p className="text-[9px] font-medium text-slate-800 dark:text-slate-200">
            {t("earningsTeamCommissions")}
          </p>
          <p className="mt-1 flex justify-between text-[9px] font-medium text-slate-800 dark:text-slate-200">
            <span>{t("earningsDailyReferral")}</span>
            <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400">
              {fmt(earningsView.dailyReferral)}
            </span>
          </p>
          <p className="flex justify-between text-[9px] font-medium text-slate-800 dark:text-slate-200">
            <span>{t("earningsMonthlyReferral")}</span>
            <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400">
              {fmt(earningsView.monthlyReferral)}
            </span>
          </p>
        </div>
      </div>

      <div className="p-4 pt-1">
        <Link
          to="/deposit"
          className="block w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-3 text-center font-black tracking-wider text-slate-950 shadow-[0_4px_15px_rgba(245,158,11,0.3)] transition-all hover:from-amber-600 hover:to-yellow-600 active:scale-[0.98]"
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
      <p className="text-[9px] font-medium leading-tight text-slate-800 dark:text-slate-200">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm font-extrabold text-amber-600 dark:text-amber-400">
        {value}
      </p>
    </div>
  );
}
