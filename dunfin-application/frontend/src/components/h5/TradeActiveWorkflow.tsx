import { useEffect, useMemo } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import { useH5Portfolio } from "../../context/H5PortfolioContext";
import { useCountdownTo } from "../../hooks/useCountdown";
import {
  computeEstimatedProceeds,
  formatYieldDisplay,
} from "../../lib/tradingLevels";

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

  const dailyYieldLabel = useMemo(() => {
    if (tradeStatus?.dailyYieldLabel) return tradeStatus.dailyYieldLabel;
    if (tier?.dailyYieldLabel) return tier.dailyYieldLabel;
    if (activeId != null) return formatYieldDisplay(activeId);
    return "—";
  }, [tradeStatus?.dailyYieldLabel, tier?.dailyYieldLabel, activeId]);

  const estimatedProceeds = useMemo(() => {
    if (tradeStatus?.estimatedProceeds != null) {
      return tradeStatus.estimatedProceeds;
    }
    if (activeId != null && capital > 0) {
      return computeEstimatedProceeds(capital, activeId);
    }
    return null;
  }, [tradeStatus?.estimatedProceeds, activeId, capital]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-df">{t("h5JournalTitle")}</h2>
        <span className="trade-status-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold">
          <i className="fa-solid fa-bolt text-[10px]" aria-hidden />
          {t("h5TransactionInProgress")}
        </span>
      </div>

      <div className="trade-journal-grid rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-sm font-bold text-df">{activeStrategyLabel}</p>
            <p className="text-xs text-df-faint">{t("h5RequiredLevel")}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-df">
              {tier
                ? tier.id === 6 || tier.maxCapital >= 999_999
                  ? `${tier.minCapital}+`
                  : `${tier.minCapital}–${tier.maxCapital}`
                : "—"}
            </p>
            <p className="text-xs text-df-faint">{t("h5TradingFunds")}</p>
          </div>
          <div>
            <p className="trade-highlight text-sm">{t("h5TransactionInProgress")}</p>
            <p className="text-xs text-df-faint">{t("h5StatusLabel")}</p>
          </div>
          <div>
            <p className="trade-highlight text-sm">{dailyYieldLabel}</p>
            <p className="text-xs text-df-faint">{t("h5DailyYield")}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-df">{capital.toFixed(2)}</p>
            <p className="text-xs text-df-faint">{t("h5TradableToday")}</p>
          </div>
          <div>
            <p className="trade-highlight text-sm font-bold">
              {estimatedProceeds != null
                ? `≈ ${estimatedProceeds.toFixed(2)} USDT`
                : "—"}
            </p>
            <p className="text-xs text-df-faint">{t("h5EstimatedProceeds")}</p>
          </div>
        </div>
      </div>

      <div className="trade-session-bar rounded-full px-4 py-2.5 text-center text-sm font-bold transition-colors duration-200">
        <span className="block">{t("h5TransactionInProgress")}</span>
        {sessionActive && (
          <span className="mt-0.5 block font-mono text-xs opacity-80">
            {t("h5SessionTimeRemaining")}: {sessionCountdown}
          </span>
        )}
      </div>

      <div className="trade-card overflow-hidden rounded-2xl">
        <div className="flex items-start gap-3 p-4">
          <div className="trade-ai-icon-wrap relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
            <i className="fa-solid fa-robot text-lg" aria-hidden />
            <span className="trade-pulse-dot absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#12161f]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-df">{t("h5AiExecutionTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-df-muted">
              {t("h5AiExecutionDesc")}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-df">
          {STATUS_KEYS.map((key) => (
            <div
              key={key}
              className="flex flex-col items-center gap-1.5 px-2 py-3 text-center"
            >
              <i className="fa-solid fa-circle-check text-[10px] text-df" aria-hidden />
              <span className="text-[10px] font-medium text-df-muted">{t(key)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
