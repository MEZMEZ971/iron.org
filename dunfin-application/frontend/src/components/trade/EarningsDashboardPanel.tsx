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
    <div className="rounded-xl bg-black/10 px-2.5 py-2.5 backdrop-blur-sm dark:bg-black/15">
      <p className="text-[10px] font-medium leading-tight text-slate-800/90 dark:text-slate-900/90">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-slate-900">
        {value}
      </p>
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
    <section className="glass-card space-y-4 rounded-2xl p-4 transition-all duration-300">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-df-muted">
          {t("earningsAccountBalance")}
        </p>
        <p className="mt-1 font-mono text-3xl font-bold text-df">
          {loading ? "—" : balance}{" "}
          <span className="text-lg font-semibold text-[#f0b90b]">{currency}</span>
        </p>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-[#f0b90b] via-[#fcd535] to-[#c9a227] p-4 shadow-lg shadow-[#f0b90b]/15">
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
          <div className="rounded-xl bg-black/10 px-2.5 py-2.5 backdrop-blur-sm dark:bg-black/15">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-900">
              {t("earningsTeamCommissions")}
            </p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-900">
                <span>{t("earningsDailyReferral")}</span>
                <span className="font-mono font-bold">
                  {loading ? "—" : `${dailyRef}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-900">
                <span>{t("earningsMonthlyReferral")}</span>
                <span className="font-mono font-bold">
                  {loading ? "—" : `${monthlyRef}`}
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[9px] text-slate-800/80">
          {t("earningsProceedsResets")}
        </p>
      </div>

      <Link
        to="/deposit"
        className="btn-golden-glow flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] py-3.5 text-sm font-bold text-[#0a0e1a] shadow-lg shadow-[#f0b90b]/25 transition-all duration-300"
      >
        {t("earningsDeposit")}
      </Link>

      <div
        role="note"
        className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2.5 text-center text-xs font-medium text-orange-800 dark:border-orange-400/35 dark:bg-orange-500/15 dark:text-orange-200"
      >
        {t("earningsTradeOnceNotice")}
      </div>
    </section>
  );
}
