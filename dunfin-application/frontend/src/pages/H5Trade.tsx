import { H5EarningsCard } from "../components/h5/H5EarningsCard";
import { TradeActiveWorkflow } from "../components/h5/TradeActiveWorkflow";
import { TradeExecutePanel } from "../components/trade/TradeExecutePanel";
import { useH5Portfolio } from "../context/H5PortfolioContext";
import { useUser } from "../context/UserContext";
import { useLocale } from "../i18n/LocaleContext";

export default function H5Trade() {
  const { t } = useLocale();
  const { userId } = useUser();
  const { isTrading, activeStrategyLabel, refresh } = useH5Portfolio();

  return (
    <div className="space-y-4 pb-4 text-slate-900 dark:text-white">
      <H5EarningsCard />

      <div
        role="note"
        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 p-3 text-xs font-semibold text-orange-50 shadow-md dark:text-white"
      >
        <i className="fa-solid fa-circle-exclamation" aria-hidden />
        {t("h5TradeOnceADayWarning")}
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t("h5MyTransaction")}</h2>
          <button
            type="button"
            className="text-xs text-slate-500 dark:text-slate-400"
          >
            {t("h5AllProducts")} ›
          </button>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {t("h5TradingLevel")}:{" "}
            <strong className="text-[#f0b90b]">{activeStrategyLabel}</strong>
          </span>
          <i className="fa-solid fa-chevron-down text-[10px] text-slate-500" aria-hidden />
        </div>
      </section>

      {isTrading ? (
        <TradeActiveWorkflow />
      ) : (
        <TradeExecutePanel userId={userId} onTradeSettled={refresh} />
      )}
    </div>
  );
}
