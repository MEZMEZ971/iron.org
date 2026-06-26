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
    <div className="space-y-4 pb-4 text-df">
      <H5EarningsCard />

      <div
        role="note"
        className="trade-notice flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-semibold"
      >
        <i className="fa-solid fa-circle-exclamation" aria-hidden />
        {t("h5TradeOnceADayWarning")}
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-df">{t("h5MyTransaction")}</h2>
          <button type="button" className="text-xs text-df-muted">
            {t("h5AllProducts")} ›
          </button>
        </div>
        <div className="trade-level-select flex items-center justify-between rounded-xl px-3 py-2.5 shadow-sm">
          <span className="text-xs text-df-muted">
            {t("h5TradingLevel")}:{" "}
            <strong className="trade-highlight">{activeStrategyLabel}</strong>
          </span>
          <i className="fa-solid fa-chevron-down text-[10px] text-df-faint" aria-hidden />
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
