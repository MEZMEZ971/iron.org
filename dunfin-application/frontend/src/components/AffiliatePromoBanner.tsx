import { useLocale } from "../i18n/LocaleContext";

export function AffiliatePromoBanner() {
  const { t } = useLocale();

  return (
    <div className="glass-card relative overflow-hidden rounded-2xl border border-[#f0b90b]/25 bg-gradient-to-br from-[#1a1f2e]/90 via-[#0a0e1a] to-[#1a2540]/80 p-5 backdrop-blur-md dark:from-[#1a1f2e]/90 dark:via-[#0a0e1a] dark:to-[#1a2540]/80">
      <div className="absolute -end-8 -top-8 h-32 w-32 rounded-full bg-[#f0b90b]/10 blur-2xl" />
      <div className="absolute -bottom-6 -start-6 h-24 w-24 rounded-full bg-[#00d4aa]/10 blur-xl" />
      <span className="inline-block rounded-lg bg-[#f0b90b] px-2 py-0.5 text-[10px] font-bold uppercase text-[#0a0e1a]">
        {t("affiliateVip")}
      </span>
      <h3 className="relative mt-2 text-base font-bold leading-snug text-df">
        {t("h5VipNetworkTitle")}
      </h3>
      <p className="relative mt-2 text-xs leading-relaxed text-df-muted">
        {t("h5VipNetworkDesc")}
      </p>
      <div className="relative mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-[#f0b90b]">6%</span>
        <span className="text-xs text-df-muted">{t("h5DailyCommissionLabel")}</span>
      </div>
    </div>
  );
}
