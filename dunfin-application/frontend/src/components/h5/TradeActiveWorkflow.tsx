import { useEffect } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import { useH5Portfolio } from "../../context/H5PortfolioContext";
import { useCountdownTo } from "../../hooks/useCountdown";

const STATUS_KEYS = [
  "h5AiStatusLive",
  "h5AiStatusOptimized",
  "h5AiStatusProtected",
] as const;

export function TradeActiveWorkflow() {
  const { t } = useLocale();
  const { isTrading, activeStrategyLabel, tradeStatus, loading, refresh } =
    useH5Portfolio();

  const sessionActive = tradeStatus?.tradeSession?.active ?? false;
  const sessionEndsAt = tradeStatus?.tradeSession?.endsAt;
  const sessionCountdown = useCountdownTo(sessionEndsAt, sessionActive);

  useEffect(() => {
    if (!sessionActive || !sessionEndsAt) return;
    const endMs = new Date(sessionEndsAt).getTime();
    const remaining = endMs - Date.now();
    if (remaining <= 0) {
      void refresh({ skipChainSync: true });
      return;
    }
    const id = window.setTimeout(() => {
      void refresh({ skipChainSync: true });
    }, remaining + 400);
    return () => window.clearTimeout(id);
  }, [sessionActive, sessionEndsAt, refresh]);

  if (!isTrading && !loading) return null;

  const capital = tradeStatus?.lockedCapital ?? 0;
  const activeId = tradeStatus?.activeStrategy;
  const tier = tradeStatus?.strategies.find((s) => s.id === activeId);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t("h5JournalTitle")}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-[10px] font-bold text-white">
          <i className="fa-solid fa-bolt text-[10px]" aria-hidden />
          {t("h5TransactionInProgress")}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 text-slate-900 shadow-sm dark:border-slate-800/40 dark:bg-[#111728] dark:text-white">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{activeStrategyLabel}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t("h5RequiredLevel")}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {tier ? `${tier.minCapital}–${tier.maxCapital}` : "—"}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t("h5TradingFunds")}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-[#c99400] dark:text-[#f0b90b]">
              {t("h5TransactionInProgress")}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t("h5StatusLabel")}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-[#c99400] dark:text-[#f0b90b]">1.98–2.02 %</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t("h5DailyYield")}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{capital.toFixed(2)}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t("h5TradableToday")}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">—</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t("h5EstimatedProceeds")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-full bg-slate-950 px-4 py-2.5 text-center text-sm font-bold text-white transition-colors duration-200 dark:bg-amber-500 dark:text-slate-950">
        <span className="block">{t("h5TransactionInProgress")}</span>
        {sessionActive && (
          <span className="mt-0.5 block font-mono text-xs opacity-90">
            {t("h5SessionTimeRemaining")}: {sessionCountdown}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm dark:border-white/10 dark:from-[#111728] dark:to-[#0d1220]">
        <div className="flex items-start gap-3 p-4">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0b90b]/10">
            <i className="fa-solid fa-robot text-lg text-[#f0b90b]" aria-hidden />
            <span className="bot-pulse-dot absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#111728]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("h5AiExecutionTitle")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t("h5AiExecutionDesc")}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-slate-100 dark:border-white/5">
          {STATUS_KEYS.map((key) => (
            <div
              key={key}
              className="flex flex-col items-center gap-1.5 px-2 py-3 text-center"
            >
              <i className="fa-solid fa-circle-check text-[10px] text-emerald-500" aria-hidden />
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {t(key)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
