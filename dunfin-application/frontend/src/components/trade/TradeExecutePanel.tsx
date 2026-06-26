import { useRef, useState } from "react";
import { ApiError, executeTrade } from "../../api/client";
import { useSuccessFeedback } from "../../context/SuccessFeedbackContext";
import { useLocale } from "../../i18n/LocaleContext";
import type { TranslationKey } from "../../i18n/translations";
import { useCountdownTo } from "../../hooks/useCountdown";
import { useTradeStatus } from "../../hooks/useTradeStatus";
import Strategies from "../../pages/Strategies";
import { StatWidget } from "../StatWidget";

interface Props {
  userId: string;
  onTradeSettled?: () => void | Promise<void>;
}

function resolveTradeErrorMessage(
  e: unknown,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  locale: string
) {
  if (!(e instanceof ApiError)) {
    return e instanceof Error ? e.message : t("tradeExecuteFailed");
  }

  if (e.code === "QUALIFICATION_DENIED") {
    const team = e.requiredTeam ?? 0;
    if (team === 0) {
      return t("h5TradeMatrixDeniedEntry", {
        capital: e.requiredCapital ?? 100,
      });
    }
    return t("h5TradeMatrixDenied", {
      capital: e.requiredCapital ?? 100,
      team,
    });
  }

  if (locale === "ar" && e.errorAr) return e.errorAr;
  return e.message || t("tradeExecuteFailed");
}

export function TradeExecutePanel({ userId, onTradeSettled }: Props) {
  const { t, locale } = useLocale();
  const { showTradeSuccess } = useSuccessFeedback();
  const executeSectionRef = useRef<HTMLDivElement>(null);
  const [executing, setExecuting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [matrixDenied, setMatrixDenied] = useState(false);

  const { status, loading, error, refresh } = useTradeStatus(userId);

  const onCooldown = status?.cooldown.onCooldown ?? false;
  const countdown = useCountdownTo(status?.cooldown.nextTradeAt, onCooldown);
  const sessionActive = status?.tradeSession?.active ?? false;
  const botActive = (status?.cooldown.onCooldown ?? false) && !sessionActive;

  const walletBalance = status?.walletBalance ?? 0;
  const availableBalance = status?.availableBalance ?? walletBalance;
  const belowEntryMinimum = availableBalance < 100;

  const canExecute =
    !loading &&
    !onCooldown &&
    !executing &&
    status?.eligibility?.eligible === true &&
    availableBalance >= 100;

  async function handleExecute() {
    setActionError(null);
    setMatrixDenied(false);

    setExecuting(true);
    try {
      const result = await executeTrade(userId);
      showTradeSuccess(
        t("tradeSuccessDetail", {
          strategy: result.trade.strategy.name,
          amount: result.trade.capitalAmount.toLocaleString(),
        })
      );
      await refresh();
      await onTradeSettled?.();
    } catch (e) {
      const msg = resolveTradeErrorMessage(e, t, locale);
      setActionError(msg);
      if (e instanceof ApiError && e.code === "QUALIFICATION_DENIED") {
        setMatrixDenied(true);
      }
    } finally {
      setExecuting(false);
    }
  }

  const matched = status?.eligibility?.matchedStrategy;
  const autoLock = status?.eligibility?.autoLockAmount;

  function renderAutoTierPreview() {
    if (!matched || autoLock == null || onCooldown) return null;
    if (matched.id === 0) {
      return (
        <p className="trade-highlight mb-3 text-center text-xs">
          {t("h5TradeLevel0AutoSelected", { amount: autoLock })}
        </p>
      );
    }
    return (
      <p className="mb-3 text-center text-xs text-df-muted">
        {t("h5TradeAutoTierPreview", {
          strategy: matched.name,
          amount: autoLock,
        })}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <StatWidget
        label={t("activeTeam")}
        value={String(status?.affiliate.totalActiveMembers ?? 0)}
        accent="default"
      />

      <div ref={executeSectionRef} className="glass-card rounded-2xl p-4">
        {renderAutoTierPreview()}

        {!loading && status && belowEntryMinimum && !onCooldown && (
          <div
            role="alert"
            className="trade-notice mb-3 rounded-xl px-3 py-3 text-center text-xs leading-relaxed"
          >
            {t("h5TradeMatrixDeniedEntry", { capital: 100 })}
          </div>
        )}

        {botActive && (
          <div className="trade-bot-active mb-4 flex items-center justify-center gap-3 rounded-xl px-4 py-3">
            <span className="trade-pulse-dot h-3 w-3 rounded-full" />
            <span className="text-sm font-bold text-df">{t("aiBotActive")}</span>
            <span className="trade-accent-value font-mono text-lg">{countdown}</span>
          </div>
        )}

        <button
          type="button"
          disabled={!canExecute && !onCooldown}
          onClick={handleExecute}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold transition-all duration-300 ${
            onCooldown
              ? "cursor-not-allowed border border-df bg-df-inset text-df-faint"
              : canExecute
                ? "trade-btn-primary"
                : "cursor-not-allowed bg-df-inset text-df-faint"
          }`}
        >
          {executing && (
            <i
              className="fa-solid fa-circle-notch animate-spin text-lg"
              aria-hidden
            />
          )}
          {executing
            ? t("executing")
            : onCooldown
              ? `${countdown}`
              : t("executeTrade")}
        </button>

        {onCooldown && (
          <p className="mt-2 text-center text-[10px] text-df-faint">
            {t("nextTradeIn")} · {t("aiBotActive")}
          </p>
        )}

        {actionError && (
          <div
            role="alert"
            className={`mt-3 rounded-xl border px-3 py-3 text-center text-xs leading-relaxed ${
              matrixDenied
                ? "trade-notice"
                : "border-red-500/40 bg-red-950/30 text-red-200"
            }`}
          >
            {actionError}
          </div>
        )}

        {(error || loading) && !status && (
          <p className="mt-2 text-center text-xs text-df-faint">
            {loading ? t("loading") : error}
          </p>
        )}
      </div>

      {status?.strategies && status.strategies.length > 0 && (
        <Strategies
          strategies={status.strategies}
          activeStrategyId={status.activeStrategy}
          walletBalance={status.availableBalance ?? status.walletBalance}
          executeSectionRef={executeSectionRef}
        />
      )}
    </div>
  );
}
