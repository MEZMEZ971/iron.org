import type { StrategyCard } from "../api/client";
import {
  formatStrategyCapitalRange,
  formatStrategyDailyRoi,
  getStrategyDefinition,
} from "../lib/strategiesConfig";
import { StrategyStarBadge } from "./StrategyStarBadge";
import { useLocale } from "../i18n/LocaleContext";

interface Props {
  strategy: StrategyCard;
  isActive: boolean;
  onSelect?: () => void;
}

export function StrategyTierCard({ strategy, isActive, onSelect }: Props) {
  const { t } = useLocale();
  const locked = !strategy.unlocked;
  const def = getStrategyDefinition(strategy.id);
  const dailyRoi = formatStrategyDailyRoi(strategy.id);
  const capitalLabel = formatStrategyCapitalRange(
    strategy.minCapital,
    strategy.maxCapital,
    strategy.id
  );

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={`glass-card group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 hover:border-[#f0b90b]/30 hover:shadow-lg hover:shadow-[#f0b90b]/10 active:scale-[0.98] ${
        locked
          ? "border-df opacity-95"
          : "glass-card-gold strategy-unlocked border-[#00d4aa]/35"
      } ${isActive ? "ring-2 ring-[#f0b90b]" : ""}`}
    >
      <div className="absolute top-2 end-2 z-10">
        {locked ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#f0b90b]/25 bg-[#f0b90b]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#f0b90b]">
            <i className="fa-solid fa-lock text-[8px]" aria-hidden />
            {t("locked")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#00d4aa]/30 bg-[#00d4aa]/10 px-2 py-0.5 text-[9px] font-bold text-[#00d4aa]">
            <i className="fa-solid fa-circle-check text-[8px]" aria-hidden />
            {t("unlocked")}
          </span>
        )}
      </div>

      <div className="p-4 pt-8">
        <div className="mb-3 flex items-start gap-2">
          <StrategyStarBadge tierId={strategy.id} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-lg bg-[#f0b90b]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#f0b90b]">
                #{strategy.id}
              </span>
              <h3 className="font-semibold text-df">{strategy.name}</h3>
              {locked && (
                <i
                  className="fa-solid fa-lock text-[10px] text-[#f0b90b]/80"
                  aria-hidden
                />
              )}
            </div>
          </div>
        </div>

        <div className="mb-3 rounded-xl border border-[#00d4aa]/20 bg-[#00d4aa]/5 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-df-faint">
            {t("strategyDailyYield")}
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-[#00d4aa]">
            {dailyRoi}
          </p>
        </div>

        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-[10px] uppercase text-df-faint">{t("capital")}</dt>
            <dd className="font-medium text-df">{capitalLabel}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-df-faint">{t("team")}</dt>
            <dd className="font-medium text-df">
              {strategy.minTeam === 0
                ? t("noneRequired")
                : t("minActive", { n: strategy.minTeam })}
            </dd>
          </div>
          {def?.affiliationRequired && (
            <div>
              <dt className="text-[10px] uppercase text-df-faint">
                {t("affiliation")}
              </dt>
              <dd className="font-medium text-df">
                {strategy.affiliationMet ? t("required") : t("needReferral")}
              </dd>
            </div>
          )}
        </dl>

        {locked && strategy.teamShortfall > 0 && (
          <p className="mt-3 text-[11px] text-[#f0b90b]/90">
            {t("needMoreMembers", { n: strategy.teamShortfall })}
          </p>
        )}
        {locked &&
          strategy.affiliationMet &&
          strategy.teamShortfall === 0 &&
          !strategy.capitalInRange && (
            <p className="mt-3 text-[11px] text-df-muted">{t("adjustCapital")}</p>
          )}
      </div>
    </article>
  );
}
