import { EarningsDashboardPanel } from "../components/trade/EarningsDashboardPanel";
import { TradeExecutePanel } from "../components/trade/TradeExecutePanel";
import { useTradeEarnings } from "../hooks/useTradeEarnings";
import { useUser } from "../context/UserContext";
import { useLocale } from "../i18n/LocaleContext";

export default function Trade() {
  const { t } = useLocale();
  const { userId } = useUser();
  const { earnings, loading, refresh: refreshEarnings } = useTradeEarnings(userId);

  return (
    <div className="space-y-4 pb-4">
      <div className="text-center">
        <h1 className="text-lg font-bold text-df">{t("tradeTitle")}</h1>
        <p className="mt-1 text-xs text-df-muted">{t("tradeSubtitle")}</p>
      </div>

      <EarningsDashboardPanel earnings={earnings} loading={loading} />

      <TradeExecutePanel
        userId={userId}
        onTradeSettled={refreshEarnings}
      />
    </div>
  );
}
