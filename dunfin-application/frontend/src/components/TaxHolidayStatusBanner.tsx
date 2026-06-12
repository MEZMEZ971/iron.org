import { useH5Portfolio } from "../context/H5PortfolioContext";
import { useLocale } from "../i18n/LocaleContext";

export function TaxHolidayStatusBanner() {
  const { t } = useLocale();
  const { profile, loading } = useH5Portfolio();

  if (loading || !profile) return null;

  const {
    taxHolidayActive,
    taxHolidayDaysRemaining = 0,
    hasActivatedBonusStrategy,
    isInvited,
  } = profile;

  if (taxHolidayActive) {
    const message = t("taxHolidayActive").replace(
      "{days}",
      String(taxHolidayDaysRemaining)
    );
    return (
      <section
        className="rounded-2xl border border-emerald-500/35 bg-gradient-to-r from-emerald-950/40 to-emerald-900/20 px-4 py-3 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-emerald-300">{message}</p>
      </section>
    );
  }

  return (
    <section className="space-y-2" aria-live="polite">
      <div className="rounded-2xl border border-slate-500/30 bg-white/5 px-4 py-3 backdrop-blur-sm">
        <p className="text-sm font-medium text-slate-300">
          {t("taxHolidayStandardSplit")}
        </p>
      </div>
      {isInvited && !hasActivatedBonusStrategy && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-semibold leading-snug text-amber-300">
            {t("taxHolidayStrategyPromo")}
          </p>
        </div>
      )}
    </section>
  );
}
