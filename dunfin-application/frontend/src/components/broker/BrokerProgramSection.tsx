import type { BrokerProfileSnapshot } from "../../config/brokerProgram";
import { getTierLabel } from "../../config/brokerProgram";
import { useLocale } from "../../i18n/LocaleContext";
import { formatAmount, safeNumber } from "../../lib/formatNumbers";

type Props = {
  broker?: BrokerProfileSnapshot | null;
};

export function BrokerProgramSection({ broker }: Props) {
  const { t, locale } = useLocale();
  const teamSize = safeNumber(broker?.teamSize);
  const nextTier = broker?.nextTier ?? null;
  const progressPct = nextTier
    ? Math.min(100, Math.round((teamSize / nextTier.minTeamSize) * 100))
    : 100;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#1e2530] dark:shadow-xl dark:shadow-black/20">
      <div className="mb-4 space-y-2">
        <h2 className="text-sm font-bold leading-snug text-amber-800 dark:text-[#fcd535]">
          💼 {t("brokerProgramTitle")}
        </h2>
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {t("brokerProgramSubtitle")}
        </p>
      </div>

      {broker && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-[#fcd535]/20 dark:bg-[#121824]/80">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-400">
              {t("brokerTeamSizeLabel")}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {teamSize}
            </span>
          </div>
          {nextTier ? (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#b8860b] via-[#fcd535] to-[#fef08a] transition-all duration-500"
                  style={{ width: `${Math.max(8, progressPct)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                {t("brokerNextTierProgress", {
                  count: String(nextTier.membersToNext),
                  tier:
                    locale === "ar" ? nextTier.labelAr : nextTier.labelEn,
                })}
              </p>
            </>
          ) : (
            <p className="mt-2 text-[11px] font-semibold text-amber-700 dark:text-[#fcd535]">
              {t("brokerMaxTierReached")}
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/50">
        <table className="min-w-full text-start text-[11px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 dark:border-slate-700/50 dark:bg-white/[0.03]">
              <th className="px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400">
                {t("brokerColTier")}
              </th>
              <th className="px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400">
                {t("brokerColBadge")}
              </th>
              <th className="px-3 py-2.5 text-center font-medium text-slate-500 dark:text-slate-400">
                {t("brokerColTeam")}
              </th>
              <th className="px-3 py-2.5 text-end font-medium text-slate-500 dark:text-slate-400">
                {t("brokerColBonus")}
              </th>
              <th className="px-3 py-2.5 text-end font-medium text-slate-500 dark:text-slate-400">
                {t("brokerColSalary")}
              </th>
            </tr>
          </thead>
          <tbody>
            {(broker?.tiers ?? []).map((tier) => {
              const active = tier.current;
              const achieved = tier.achieved;
              return (
                <tr
                  key={tier.rank}
                  className={`border-b border-slate-200 dark:border-slate-700/50 ${
                    active
                      ? "bg-amber-50 dark:bg-[#fcd535]/10"
                      : achieved
                        ? "bg-emerald-50 dark:bg-emerald-500/5"
                        : "bg-white dark:bg-transparent"
                  }`}
                >
                  <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                    {getTierLabel(tier, locale)}
                    {active && (
                      <span className="ms-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800 dark:bg-[#fcd535]/20 dark:text-[#fcd535]">
                        {t("brokerCurrentTier")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">
                    {tier.badge}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-slate-600 dark:text-slate-300">
                    {tier.minTeamSize}+
                  </td>
                  <td className="px-3 py-2.5 text-end font-semibold text-emerald-700 dark:text-[#00d4aa]">
                    {formatAmount(tier.oneTimeBonus, undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    USDT
                  </td>
                  <td className="px-3 py-2.5 text-end font-semibold text-amber-700 dark:text-[#fcd535]">
                    {formatAmount(tier.salary15Day, undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    USDT
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t("brokerSalaryFootnote")}
      </p>
    </section>
  );
}
