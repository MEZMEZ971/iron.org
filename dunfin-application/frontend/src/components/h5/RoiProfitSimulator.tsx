import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  ROI_MAX_AMOUNT,
  ROI_MIN_AMOUNT,
  computeRoiProjections,
} from "../../lib/roiCalculator";
import { useLocale } from "../../i18n/LocaleContext";
import type { TranslationKey } from "../../i18n/translations";

function fmtUsd(n: number) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function RoiProfitSimulator() {
  const { t, dir } = useLocale();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(1_000);

  const projections = useMemo(() => computeRoiProjections(amount), [amount]);

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

  const badgeEn = t("h5RoiRecommendedTier", {
    id: projections.strategyId,
    yield: projections.yieldPercentLabel,
  });
  const badgeAr = t("h5RoiRecommendedTierAr", {
    id: projections.strategyId,
    yield: projections.yieldPercentLabel,
  });

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
          label={t("h5RoiMonthlyIncome")}
          value={fmtUsd(projections.monthlyIncome)}
          accent="amber"
        />
        <YieldBoard
          label={t("h5RoiAnnualRevenue")}
          value={fmtUsd(projections.annualRevenue)}
          accent="gold"
        />
      </div>

      <div className="roi-tier-badge mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-center text-[10px] font-bold leading-relaxed shadow-[0_0_15px_rgba(245,158,11,0.15)]">
        <p className="text-amber-500">{badgeEn}</p>
        <p className="mt-1 font-arabic text-teal-400" dir="rtl">
          {badgeAr}
        </p>
      </div>

      <TierActivationLockCard
        projections={projections}
        dir={dir}
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

type Projections = ReturnType<typeof computeRoiProjections>;

function TierActivationLockCard({
  projections,
  dir,
  t,
  onInvite,
}: {
  projections: Projections;
  dir: "ltr" | "rtl";
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  onInvite: () => void;
}) {
  const hasTeamLock = projections.teamMembersRequired > 0;

  const containerClass = hasTeamLock
    ? "my-2 rounded-xl border border-amber-500/20 bg-slate-800/40 bg-amber-500/10 p-3 text-center backdrop-blur-md"
    : "my-2 rounded-xl border border-slate-500/25 bg-slate-800/40 p-3 text-center backdrop-blur-md";

  return (
    <div className={containerClass}>
      <p className="mb-2 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
        {hasTeamLock && (
          <i
            className={`fa-solid fa-lock text-amber-500 ${dir === "rtl" ? "ms-2" : "me-2"}`}
            aria-hidden
          />
        )}
        <span>{t("h5RoiTierLockTitle")}</span>
      </p>

      <p className="text-[10px] leading-relaxed text-slate-400">
        {t("h5RoiTierUnlockIntroEn")}
      </p>
      <p className="mt-1 font-arabic text-[10px] leading-relaxed text-slate-400" dir="rtl">
        {t("h5RoiTierUnlockIntroAr")}
      </p>

      <p className="mt-2 text-sm font-bold text-[#fcd535]">
        {projections.teamRequirementEn}
      </p>
      <p className="mt-0.5 font-arabic text-xs font-bold text-amber-400" dir="rtl">
        {projections.teamRequirementAr}
      </p>

      {hasTeamLock && (
        <button
          type="button"
          onClick={onInvite}
          className="mt-3 w-full text-[10px] font-semibold text-teal-400 underline decoration-teal-400/50 underline-offset-2 transition hover:text-teal-300"
        >
          <span className="block">{t("h5RoiInviteTeamLink")}</span>
          <span className="mt-1 block font-arabic" dir="rtl">
            {t("h5RoiInviteTeamLinkAr")}
          </span>
        </button>
      )}
    </div>
  );
}

function YieldBoard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "teal" | "amber" | "gold";
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
    </div>
  );
}
