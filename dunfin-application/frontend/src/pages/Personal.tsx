import { useUser } from "../context/UserContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { useLocale } from "../i18n/LocaleContext";
import type { TransactionRow } from "../api/client";
import { formatAmount, safeNumber } from "../lib/formatNumbers";
import { formatTrialRemaining } from "../lib/trialRemaining";
import { BrokerRankBadge } from "../components/broker/BrokerRankBadge";
import { CustomerManagerContacts } from "../components/support/CustomerManagerContacts";

function txStatusLabel(
  status: string,
  t: (key: import("../i18n/translations").TranslationKey) => string
) {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return t("txStatusCompleted");
    case "PENDING":
      return t("txStatusPending");
    case "REJECTED":
      return t("txStatusRejected");
    case "LOCKED":
      return t("txStatusLocked");
    default:
      return status;
  }
}

function txStatusClass(status: string) {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-[#00d4aa]";
    case "PENDING":
    case "LOCKED":
      return "rounded-md bg-[#f0b90b]/15 px-1.5 py-0.5 font-semibold text-[#f0b90b]";
    case "REJECTED":
      return "rounded-md bg-red-500/10 px-1.5 py-0.5 font-semibold text-red-400";
    default:
      return "text-[#f0b90b]";
  }
}

function formatTxAmount(tx: TransactionRow) {
  const value = formatAmount(tx.amount, undefined, { maximumFractionDigits: 6 });
  if (tx.amount > 0) return `+${value}`;
  return value;
}

function txAmountClass(tx: TransactionRow) {
  if (tx.type === "Withdrawal" || tx.amount < 0) return "text-red-400";
  if (tx.type === "Admin Reward" || tx.type === "Lucky Wheel") return "text-[#00d4aa]";
  return "text-df";
}

export default function Personal() {
  const { t, locale } = useLocale();
  const { userId, displayName } = useUser();
  const { profile, loading, error } = useUserProfile(userId);

  const fund = safeNumber(profile?.fundAccount);
  const trading = safeNumber(profile?.tradingAccount);
  const total = fund + trading || 1;
  const fundPct = (fund / total) * 100;

  const todayPnl = safeNumber(profile?.todayPnl);
  const totalPnl = safeNumber(profile?.totalPnl);
  const trialRemaining = formatTrialRemaining(profile?.trialExpiresAt, locale);

  return (
    <div className="space-y-4 pb-4">
      {profile?.isTrialActive && safeNumber(profile.trialBalance) > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-[#fcd535]/30 bg-gradient-to-br from-[#121824] via-[#1a1408] to-[#0f131c] p-4 shadow-lg shadow-amber-500/10">
          <div className="pointer-events-none absolute -end-8 -top-8 h-24 w-24 rounded-full bg-[#fcd535]/10 blur-2xl" />
          <p className="relative text-sm font-semibold leading-relaxed text-[#fcd535]">
            {t("trialBannerTitle", {
              amount: formatAmount(safeNumber(profile.trialBalance), undefined, {
                maximumFractionDigits: 0,
              }),
              remaining: trialRemaining,
            })}
          </p>
          <p className="relative mt-2 text-xs leading-relaxed text-slate-300">
            {t("trialBannerSubtext")}
          </p>
        </div>
      )}

      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-df-faint">
              {t("userId")}
            </p>
            <p className="mt-0.5 text-lg font-bold text-[#f0b90b]">{displayName}</p>
            <p className="mt-1 truncate font-mono text-[10px] text-df-faint">{userId}</p>
          </div>
          <BrokerRankBadge broker={profile?.broker} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <PnlCard
            label={t("todayPnl")}
            value={todayPnl}
            positive={todayPnl >= 0}
          />
          <PnlCard
            label={t("totalPnl")}
            value={totalPnl}
            positive={totalPnl >= 0}
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-bold text-df">{t("capitalDistribution")}</h2>
        <div className="flex h-3 overflow-hidden rounded-full bg-df-inset">
          <div
            className="bg-[#00d4aa] transition-all"
            style={{ width: `${fundPct}%` }}
          />
          <div
            className="bg-[#f0b90b] transition-all"
            style={{ width: `${100 - fundPct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-[#00d4aa]">
            {t("fundAccount")}: ${formatAmount(fund)}
          </span>
          <span className="text-[#f0b90b]">
            {t("tradingAccount")}: ${formatAmount(trading)}
          </span>
        </div>
      </div>

      <CustomerManagerContacts
        title={t("supportManagersTitle")}
        subtitle={t("supportManagersSubtitle")}
      />

      <div className="df-table-shell glass-card overflow-hidden rounded-2xl">
        <h2 className="border-b border-df bg-df-table-head px-4 py-3 text-sm font-bold text-df">
          {t("assetLedger")}
        </h2>
        {loading && !profile ? (
          <p className="p-4 text-xs text-df-faint">{t("loading")}</p>
        ) : error ? (
          <p className="p-4 text-xs text-red-400">{error}</p>
        ) : (
          <>
            <div className="space-y-2 p-3 md:hidden">
              {profile?.assets.map((a) => (
                <div key={a.symbol} className="df-mobile-card space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-df">{a.symbol}</span>
                    <span className="text-xs font-semibold text-df-muted">
                      {t("total")}: {formatAmount(a.total)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-df-page/60 px-2 py-1.5">
                      <p className="text-[10px] text-df-faint">{t("available")}</p>
                      <p className="font-semibold text-[#00d4aa]">{formatAmount(a.available)}</p>
                    </div>
                    <div className="rounded-lg bg-df-page/60 px-2 py-1.5 text-end">
                      <p className="text-[10px] text-df-faint">{t("freeze")}</p>
                      <p className="font-semibold text-[#f0b90b]">{formatAmount(a.freeze)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <table className="hidden w-full text-xs md:table">
              <thead>
                <tr className="text-df-faint">
                  <th className="px-3 py-2 text-start font-medium">{t("asset")}</th>
                  <th className="px-2 py-2 text-end font-medium">{t("total")}</th>
                  <th className="px-2 py-2 text-end font-medium">{t("available")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("freeze")}</th>
                </tr>
              </thead>
              <tbody>
                {profile?.assets.map((a) => (
                  <tr key={a.symbol} className="border-t border-df hover:bg-df-hover">
                    <td className="px-3 py-2.5 font-semibold text-df">{a.symbol}</td>
                    <td className="px-2 py-2.5 text-end text-df-muted">
                      {formatAmount(a.total)}
                    </td>
                    <td className="px-2 py-2.5 text-end text-[#00d4aa]">
                      {formatAmount(a.available)}
                    </td>
                    <td className="px-3 py-2.5 text-end text-[#f0b90b]">
                      {formatAmount(a.freeze)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="glass-card rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-bold text-df">{t("recentTransactions")}</h2>
        <ul className="max-h-52 space-y-2 overflow-y-auto">
          {!profile?.transactions.length && (
            <li className="text-xs text-df-faint">{t("noTransactions")}</li>
          )}
          {profile?.transactions.map((tx) => (
            <li
              key={tx.id}
              className="flex items-start justify-between gap-2 rounded-xl bg-df-inset px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-df">{tx.type}</p>
                <p className="text-[10px] text-df-faint">
                  {new Date(tx.timestamp).toLocaleString()}
                </p>
                {tx.commission != null && (
                  <p className="text-[10px] text-[#f0b90b]">
                    {t("commission")}: {tx.commission}%
                  </p>
                )}
              </div>
              <div className="shrink-0 text-end">
                <p className={`text-xs font-bold ${txAmountClass(tx)}`}>
                  {formatTxAmount(tx)} {tx.currency}
                </p>
                <span className={`text-[10px] ${txStatusClass(tx.status)}`}>
                  {txStatusLabel(tx.status, t)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PnlCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: number;
  positive: boolean;
}) {
  return (
    <div className="rounded-xl bg-df-inset p-3">
      <p className="text-[10px] text-df-faint">{label}</p>
      <p
        className={`mt-1 text-base font-bold ${
          positive ? "text-[#00d4aa]" : "text-[#ef4444]"
        }`}
      >
        {positive ? "+" : ""}${formatAmount(value)}
      </p>
    </div>
  );
}
