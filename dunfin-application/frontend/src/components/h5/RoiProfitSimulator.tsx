import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  BROKER_RANK_NONE,
  BROKER_TIERS,
  getTierBadge,
  getTierLabel,
  type BrokerRank,
} from "../../config/brokerProgram";
import {
  ROI_MAX_AMOUNT,
  ROI_MIN_AMOUNT,
  ROI_TIERS,
  computeGoalOrientedProjections,
  formatYieldPercent,
  resolveRoiTier,
  type RoiStrategyId,
} from "../../lib/roiCalculator";
import { getStrategyTierName } from "../../lib/strategyTiers";
import { useLocale } from "../../i18n/LocaleContext";
import type { TranslationKey } from "../../i18n/translations";

function fmtUsd(n: number) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const SELECT_CLASS =
  "w-full appearance-none rounded-xl border border-amber-500/25 bg-black/40 px-3 py-2.5 text-xs font-semibold text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20";

export function RoiProfitSimulator() {
  const { t, dir, locale } = useLocale();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(1_000);
  const [strategyId, setStrategyId] = useState<RoiStrategyId>(() =>
    resolveRoiTier(1_000).strategyId
  );
  const [brokerRank, setBrokerRank] = useState<BrokerRank>(BROKER_RANK_NONE);

  const projections = useMemo(
    () => computeGoalOrientedProjections({ amount, strategyId, brokerRank }),
    [amount, strategyId, brokerRank]
  );

  const sliderFillPct = useMemo(() => {
    const span = ROI_MAX_AMOUNT - ROI_MIN_AMOUNT;
    return ((projections.amount - ROI_MIN_AMOUNT) / span) * 100;
  }, [projections.amount]);

  const setClampedAmount = useCallback((next: number) => {
    setAmount(
      Math.min(ROI_MAX_AMOUNT, Math.max(ROI_MIN_AMOUNT, Math.round(next)))
    );
  }, []);

  const handleInputChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, "");
    if (!cleaned) {
      setAmount(ROI_MIN_AMOUNT);
      return;
    }
    setClampedAmount(Number(cleaned));
  };

  const brokerLabel =
    brokerRank === BROKER_RANK_NONE
      ? t("h5RoiBrokerNone")
      : projections.brokerTier
        ? `${getTierBadge(projections.brokerTier, locale)} · ${getTierLabel(projections.brokerTier, locale)}`
        : t("h5RoiBrokerNone");

  const badgePrimary = t("h5RoiSelectedGoalsBadge", {
    strategyId,
    yield: projections.yieldPercentLabel,
    broker: brokerLabel,
  });
  const showArabicBadge = locale === "en" || locale === "it";
  const badgeSecondary = showArabicBadge
    ? t("h5RoiSelectedGoalsBadgeAr", {
        strategyId,
        yield: projections.yieldPercentLabel,
        broker: brokerLabel,
      })
    : null;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-b from-[#121820] via-[#0f1419] to-[#0a0e1a] p-4 shadow-xl shadow-amber-500/5"
      dir={dir}
    >
      <header className="mb-4 text-center">
        <h2 className="text-sm font-bold text-[#fcd535]">
          {t("h5RoiSimulatorTitle")}
        </h2>
        <p className="mt-0.5 text-[10px] text-slate-400">
          {t("h5RoiSimulatorTitleAlt")}
        </p>
      </header>

      <div className="space-y-3">
        <label className="block text-[10px] font-semibold text-slate-400">
          {t("h5RoiAmountLabel")}
        </label>

        <div
          className={`flex flex-col gap-3 sm:flex-row sm:items-center ${
            dir === "rtl" ? "sm:flex-row-reverse" : ""
          }`}
        >
          <div className="relative min-w-0 flex-1">
            <input
              type="range"
              min={ROI_MIN_AMOUNT}
              max={ROI_MAX_AMOUNT}
              step={1}
              value={projections.amount}
              onChange={(e) => setClampedAmount(Number(e.target.value))}
              className="roi-range w-full"
              dir={dir}
              aria-valuemin={ROI_MIN_AMOUNT}
              aria-valuemax={ROI_MAX_AMOUNT}
              aria-valuenow={projections.amount}
              aria-label={t("h5RoiAmountLabel")}
              style={
                {
                  "--roi-fill": `${sliderFillPct}%`,
                } as CSSProperties
              }
            />
            <div
              className={`mt-1 flex justify-between text-[9px] text-slate-500 ${
                dir === "rtl" ? "flex-row-reverse" : ""
              }`}
            >
              <span>${ROI_MIN_AMOUNT.toLocaleString()}</span>
              <span>${ROI_MAX_AMOUNT.toLocaleString()}</span>
            </div>
          </div>

          <div className="relative w-full shrink-0 sm:w-36">
            <span
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm font-bold text-amber-500 ${
                dir === "rtl" ? "right-3" : "left-3"
              }`}
            >
              $
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={projections.amount}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={t("h5RoiAmountPlaceholder")}
              className={`w-full rounded-xl border border-amber-500/30 bg-black/40 py-2.5 font-mono text-sm font-bold text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/25 ${
                dir === "rtl" ? "pe-3 ps-8 text-end" : "ps-8 pe-3"
              }`}
              dir={dir}
              aria-label={t("h5RoiAmountLabel")}
            />
            <span className="mt-0.5 block text-center text-[9px] text-slate-500">
              USDT
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
          {t("h5RoiTargetGoalLabel")}
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <GoalSelectField
            label={t("h5RoiSelectStrategyLabel")}
            value={String(strategyId)}
            onChange={(value) => setStrategyId(Number(value) as RoiStrategyId)}
            dir={dir}
          >
            {ROI_TIERS.map((tier) => (
              <option key={tier.strategyId} value={tier.strategyId}>
                {getStrategyTierName(tier.strategyId, locale)} ·{" "}
                {formatYieldPercent(tier.dailyYield)}% · ${tier.min.toLocaleString()}–$
                {tier.max.toLocaleString()}
              </option>
            ))}
          </GoalSelectField>

          <GoalSelectField
            label={t("h5RoiSelectBrokerLabel")}
            value={brokerRank}
            onChange={(value) => setBrokerRank(value as BrokerRank)}
            dir={dir}
          >
            <option value={BROKER_RANK_NONE}>{t("h5RoiBrokerNone")}</option>
            {BROKER_TIERS.map((tier) => (
              <option key={tier.rank} value={tier.rank}>
                {getTierBadge(tier, locale)} · {getTierLabel(tier, locale)} ·{" "}
                {fmtUsd(tier.salary15Day)} {t("h5RoiSalaryPeriod")}
              </option>
            ))}
          </GoalSelectField>
        </div>
      </div>

      <div
        className={`mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 ${
          dir === "rtl" ? "sm:[direction:rtl]" : ""
        }`}
      >
        <YieldBoard
          label={t("h5RoiDailyProfit")}
          value={fmtUsd(projections.dailyProfit)}
          accent="teal"
        />
        <YieldBoard
          label={t("h5RoiSalary15Day")}
          value={fmtUsd(projections.salary15Day)}
          accent="amber"
          hint={
            brokerRank === BROKER_RANK_NONE
              ? t("h5RoiPotentialSalaryHint")
              : undefined
          }
        />
        <YieldBoard
          label={t("h5RoiTotalMonthlyProfit")}
          value={fmtUsd(projections.totalMonthlyProfit)}
          accent="gold"
        />
      </div>

      <div className="roi-tier-badge mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-center text-[10px] font-bold leading-relaxed shadow-[0_0_15px_rgba(245,158,11,0.15)]">
        <p className="text-amber-500">{badgePrimary}</p>
        {badgeSecondary ? (
          <p className="mt-1 font-arabic text-teal-400" dir="rtl">
            {badgeSecondary}
          </p>
        ) : null}
      </div>

      <GoalRequirementsCard
        projections={projections}
        brokerLabel={brokerLabel}
        dir={dir}
        locale={locale}
        t={t}
        onInvite={() => navigate("/invite")}
      />

      <button
        type="button"
        onClick={() => navigate("/deposit")}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#c99400] px-4 py-3.5 text-sm font-bold text-[#0a0e1a] shadow-lg shadow-amber-500/30 transition active:scale-[0.98] hover:shadow-amber-500/45"
      >
        <i className="fa-solid fa-bolt animate-pulse" aria-hidden />
        <span>{t("h5RoiInvestCta")}</span>
      </button>
    </section>
  );
}

type Projections = ReturnType<typeof computeGoalOrientedProjections>;

function GoalSelectField({
  label,
  value,
  onChange,
  dir,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir: "ltr" | "rtl";
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[10px] font-semibold text-slate-400">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${SELECT_CLASS} ${dir === "rtl" ? "pl-8 text-end" : "pr-8"}`}
          dir={dir}
        >
          {children}
        </select>
        <i
          className={`fa-solid fa-chevron-down pointer-events-none absolute top-1/2 -translate-y-1/2 text-[10px] text-amber-500/80 ${
            dir === "rtl" ? "left-3" : "right-3"
          }`}
          aria-hidden
        />
      </div>
    </label>
  );
}

function GoalRequirementsCard({
  projections,
  brokerLabel,
  dir,
  locale,
  t,
  onInvite,
}: {
  projections: Projections;
  brokerLabel: string;
  dir: "ltr" | "rtl";
  locale: string;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  onInvite: () => void;
}) {
  const hasTeamLock = projections.teamRequired > 0;
  const hasCapitalGap = projections.capitalShortfall > 0;
  const hasBrokerBonus = projections.brokerOneTimeBonus > 0;
  const showLock = hasTeamLock || hasCapitalGap || hasBrokerBonus;

  const heading = t("h5RoiUnlockGoalsHeading", {
    broker: brokerLabel,
    strategyId: projections.strategyId,
  });

  const containerClass = showLock
    ? "my-2 rounded-xl border border-amber-500/20 bg-slate-800/40 bg-amber-500/10 p-3 text-center backdrop-blur-md"
    : "my-2 rounded-xl border border-slate-500/25 bg-slate-800/40 p-3 text-center backdrop-blur-md";

  return (
    <div className={containerClass}>
      <p className="mb-2 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
        {showLock && (
          <i
            className={`fa-solid fa-lock text-amber-500 ${dir === "rtl" ? "ms-2" : "me-2"}`}
            aria-hidden
          />
        )}
        <span>{t("h5RoiTierLockTitle")}</span>
      </p>

      <p className="text-[10px] leading-relaxed text-slate-300">{heading}</p>

      <ul className="mt-3 space-y-1.5 text-start text-[10px] leading-relaxed text-slate-400">
        <li className="flex items-start gap-2">
          <i className="fa-solid fa-circle-check mt-0.5 shrink-0 text-teal-500/80" aria-hidden />
          <span>
            {t("h5RoiReqMinCapital", {
              amount: fmtUsd(projections.strategyMinCapital),
            })}
          </span>
        </li>
        {projections.teamRequired > 0 && (
          <li className="flex items-start gap-2">
            <i className="fa-solid fa-users mt-0.5 shrink-0 text-amber-500/80" aria-hidden />
            <span>
              {t("h5RoiReqTeamMembers", { count: projections.teamRequired })}
            </span>
          </li>
        )}
        {hasBrokerBonus && (
          <li className="flex items-start gap-2">
            <i className="fa-solid fa-gift mt-0.5 shrink-0 text-[#fcd535]/80" aria-hidden />
            <span>
              {t("h5RoiReqBrokerBonus", {
                amount: fmtUsd(projections.brokerOneTimeBonus),
              })}
            </span>
          </li>
        )}
      </ul>

      {hasCapitalGap && (
        <p className="mt-2 text-xs font-semibold text-amber-400">
          {t("h5RoiCapitalShortfall", {
            amount: fmtUsd(projections.capitalShortfall),
          })}
        </p>
      )}

      {hasTeamLock && (
        <button
          type="button"
          onClick={onInvite}
          className="mt-3 w-full text-[10px] font-semibold text-teal-400 underline decoration-teal-400/50 underline-offset-2 transition hover:text-teal-300"
        >
          <span className="block">{t("h5RoiInviteTeamLink")}</span>
          {(locale === "en" || locale === "it") && (
            <span className="mt-1 block font-arabic" dir="rtl">
              {t("h5RoiInviteTeamLinkAr")}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function YieldBoard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent: "teal" | "amber" | "gold";
  hint?: string;
}) {
  const border =
    accent === "teal"
      ? "border-teal-500/35"
      : accent === "amber"
        ? "border-amber-500/35"
        : "border-[#fcd535]/40";
  const valueColor =
    accent === "teal"
      ? "text-teal-400"
      : accent === "amber"
        ? "text-amber-400"
        : "text-[#fcd535]";

  return (
    <div
      className={`roi-yield-board rounded-xl border bg-black/35 px-3 py-3 backdrop-blur-sm ${border}`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`roi-yield-value mt-1 font-mono text-lg font-bold ${valueColor}`}
      >
        ${value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[9px] leading-snug text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
