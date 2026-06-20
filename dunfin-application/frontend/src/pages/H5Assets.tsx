import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedSafeBox } from "../components/h5/AnimatedSafeBox";
import { LockboxInfoModal } from "../components/h5/LockboxInfoModal";
import { useH5Portfolio } from "../context/H5PortfolioContext";
import { useLocale } from "../i18n/LocaleContext";
import { formatTrialRemaining } from "../lib/trialRemaining";

function fmt(n: number) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export default function H5Assets() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const {
    availableBalance,
    lockedBalance,
    trialBalance,
    isTrialActive,
    trialExpiresAt,
    activeStrategyLabel,
    isTrading,
    loading,
  } = useH5Portfolio();

  const trialRemaining = formatTrialRemaining(trialExpiresAt, t);

  const [lockboxInfoOpen, setLockboxInfoOpen] = useState(false);
  const [lockboxHover, setLockboxHover] = useState(false);

  const total = availableBalance + lockedBalance;

  const actions = [
    { labelKey: "deposit" as const, icon: "fa-download", path: "/deposit" },
    { labelKey: "withdraw" as const, icon: "fa-arrow-up-from-bracket", path: "/withdraw" },
    { labelKey: "h5Bill" as const, icon: "fa-clipboard-list", path: "/personal" },
  ];

  return (
    <div className="space-y-4 pb-4 text-white">
      <h1 className="text-center text-lg font-bold">{t("navAssets")}</h1>

      {isTrialActive && trialBalance > 0 && (
        <div className="rounded-2xl border border-[#fcd535]/30 bg-gradient-to-br from-[#121824] via-[#1a1408] to-[#0f131c] p-4 shadow-lg shadow-amber-500/10">
          <p className="text-sm font-semibold leading-relaxed text-[#fcd535]">
            {t("trialBannerTitle", {
              amount: fmt(trialBalance),
              remaining: trialRemaining,
            })}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            {t("trialBannerSubtext")}
          </p>
        </div>
      )}

      <section className="rounded-2xl bg-[#fdfcf0] p-4 text-amber-950 shadow-xl dark:bg-gradient-to-b dark:from-[#1a1510] dark:to-[#121820] dark:text-white">
        <p className="text-center text-xs text-amber-900/70 dark:text-amber-200/70">
          {t("h5AssetsOverview")}
        </p>
        <p className="mt-1 text-center font-mono text-3xl font-bold text-amber-950 dark:text-[#fcd535]">
          {loading ? "—" : fmt(total)}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* Available — liquid USDT */}
          <div className="flex flex-col rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-50 to-teal-50/80 p-3.5 shadow-sm dark:border-emerald-400/40 dark:from-emerald-950/40 dark:to-[#0a1a14]">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <i className="fa-solid fa-wallet text-lg" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  {t("h5AvailableBalance")}
                </p>
                <p className="text-[10px] text-emerald-800/70 dark:text-emerald-400/80">
                  {t("h5AvailableBalanceSub")}
                </p>
              </div>
            </div>
            <p className="mt-3 font-mono text-xl font-bold text-emerald-950 dark:text-emerald-300">
              {loading ? "—" : fmt(availableBalance)}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-400">
              {t("h5UsdtLiquid")}
            </p>
          </div>

          {/* Locked — strategy escrow lockbox */}
          <div
            className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-950/90 via-slate-900 to-[#0a0e1a] p-3.5 text-white shadow-[0_0_15px_rgba(245,158,11,0.12)] transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            onMouseEnter={() => setLockboxHover(true)}
            onMouseLeave={() => setLockboxHover(false)}
            onTouchStart={() => setLockboxHover(true)}
            onTouchEnd={() => setLockboxHover(false)}
          >
            <p className="mb-2 text-[10px] font-bold leading-snug">
              <span className="text-emerald-400" aria-hidden>
                ●{" "}
              </span>
              <span className="text-amber-500">{t("h5LockboxSecuredBadge")}</span>
            </p>

            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-amber-500">
                    {t("h5LockedStrategyCapital")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setLockboxInfoOpen(true)}
                    className="rounded-full p-0.5 text-teal-400 transition hover:bg-white/10 hover:text-teal-300"
                    aria-label={t("h5LockboxInfoTitle")}
                  >
                    <i className="fa-solid fa-circle-info text-sm" aria-hidden />
                  </button>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {t("h5LockboxTitle")}
                </p>
              </div>
              <AnimatedSafeBox active={lockboxHover || isTrading} />
            </div>

            <p className="mt-2 font-mono text-xl font-bold text-[#fcd535]">
              {loading ? "—" : fmt(lockedBalance)}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-amber-500/90">
              {t("h5UsdtEscrow")}
            </p>
            {activeStrategyLabel && lockedBalance > 0 && (
              <p className="mt-2 truncate text-[10px] text-teal-400/90">
                {t("h5ActiveStrategyTier")}: {activeStrategyLabel}
                {isTrading ? " · ●" : ""}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-amber-900/10 pt-4 dark:border-white/10">
          {actions.map(({ labelKey, icon, path }) => (
            <button
              key={labelKey}
              type="button"
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1.5 rounded-xl py-2 transition active:scale-95"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow dark:bg-white/10">
                <i className={`fa-solid ${icon} text-amber-900 dark:text-[#f0b90b]`} aria-hidden />
              </span>
              <span className="text-[10px] font-semibold text-amber-950 dark:text-slate-200">
                {t(labelKey)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-white">{t("h5AssetList")}</h2>
        <div className="space-y-2">
          <AssetRow
            label="USDT"
            sublabel={t("h5UsdtLiquid")}
            amount={availableBalance}
            loading={loading}
            accent="emerald"
            icon="₮"
            iconBg="#26a17b"
          />
          <AssetRow
            label="USDT"
            sublabel={t("h5UsdtEscrow")}
            amount={lockedBalance}
            loading={loading}
            accent="amber"
            icon="🔒"
            iconBg="#b45309"
            trailing={
              lockedBalance > 0 ? (
                <i
                  className="fa-solid fa-vault text-amber-500/80 text-xs"
                  aria-hidden
                />
              ) : null
            }
          />
        </div>
      </section>

      <LockboxInfoModal
        open={lockboxInfoOpen}
        onClose={() => setLockboxInfoOpen(false)}
      />
    </div>
  );
}

function AssetRow({
  label,
  sublabel,
  amount,
  loading,
  accent,
  icon,
  iconBg,
  trailing,
}: {
  label: string;
  sublabel: string;
  amount: number;
  loading: boolean;
  accent: "emerald" | "amber";
  icon: string;
  iconBg: string;
  trailing?: ReactNode;
}) {
  const border =
    accent === "emerald"
      ? "border-emerald-500/25"
      : "border-amber-500/30";
  const glow =
    accent === "amber" ? "shadow-[0_0_12px_rgba(245,158,11,0.08)]" : "";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border bg-white/5 p-4 backdrop-blur-sm ${border} ${glow}`}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </span>
        <div>
          <p className="text-sm font-bold">{label}</p>
          <p className="text-[10px] text-slate-400">{sublabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-end">
        {trailing}
        <div>
          <p className="font-mono text-sm font-bold">
            {loading ? "—" : fmt(amount)}
          </p>
          <p className="text-[10px] text-slate-400">
            ≈ {loading ? "—" : fmt(amount)} USDT
          </p>
        </div>
      </div>
    </div>
  );
}
