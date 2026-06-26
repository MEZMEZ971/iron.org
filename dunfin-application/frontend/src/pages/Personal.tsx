import { useEffect } from "react";
import { useUser } from "../context/UserContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { useLocale } from "../i18n/LocaleContext";
import { formatAmount, safeNumber } from "../lib/formatNumbers";
import { formatTrialRemaining } from "../lib/trialRemaining";
import { BrokerRankBadge } from "../components/broker/BrokerRankBadge";
import { CustomerManagerContacts } from "../components/support/CustomerManagerContacts";
import { TransactionLedgerList } from "../components/ledger/TransactionLedgerList";

export default function Personal() {
  const { t } = useLocale();
  const { userId, displayName } = useUser();
  const { profile, loading, syncing, error, refresh } = useUserProfile(userId);

  useEffect(() => {
    void refresh({ background: Boolean(profile), skipChainSync: false });
  }, [refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const ledger = profile?.ledger;
  const usdtAsset =
    ledger?.assets?.[0] ?? profile?.assets?.find((a) => a.symbol === "USDT");

  const fund = safeNumber(usdtAsset?.available ?? profile?.fundAccount);
  const trading = safeNumber(usdtAsset?.freeze ?? profile?.tradingAccount);
  const total = safeNumber(usdtAsset?.total ?? fund + trading);
  const fundPct = total > 0 ? (fund / total) * 100 : 0;

  const todayPnl = safeNumber(ledger?.todayPnl ?? profile?.todayPnl);
  const totalPnl = safeNumber(ledger?.totalTradingPnl ?? profile?.totalPnl);
  const trialRemaining = formatTrialRemaining(profile?.trialExpiresAt, t);
  const transactions = ledger?.recentTransactions ?? profile?.transactions ?? [];
  const showSkeleton = loading && !profile;

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
            loading={showSkeleton}
          />
          <PnlCard
            label={t("totalPnl")}
            value={totalPnl}
            positive={totalPnl >= 0}
            loading={showSkeleton}
          />
        </div>

        {ledger && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-df-faint">
            <StatChip label={t("deposit")} value={ledger.totalDeposits} />
            <StatChip label={t("withdraw")} value={ledger.totalWithdrawals} />
            <StatChip label={t("commission")} value={ledger.totalCommissions} />
            <StatChip label="Rewards" value={ledger.totalRewards} />
          </div>
        )}
        {syncing && profile && (
          <p className="mt-2 text-center text-[10px] text-df-faint">{t("loading")}…</p>
        )}
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
            {t("fundAccount")}: ${showSkeleton ? "—" : formatAmount(fund)}
          </span>
          <span className="text-[#f0b90b]">
            {t("tradingAccount")}: ${showSkeleton ? "—" : formatAmount(trading)}
          </span>
        </div>
        <p className="mt-2 text-center text-[10px] text-df-faint">
          {t("total")}: ${showSkeleton ? "—" : formatAmount(total)} USDT
        </p>
      </div>

      <CustomerManagerContacts
        title={t("supportManagersTitle")}
        subtitle={t("supportManagersSubtitle")}
      />

      <div className="df-table-shell glass-card overflow-hidden rounded-2xl">
        <h2 className="border-b border-df bg-df-table-head px-4 py-3 text-sm font-bold text-df">
          {t("assetLedger")}
        </h2>
        {showSkeleton ? (
          <div className="space-y-2 p-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-df-inset" />
            ))}
          </div>
        ) : error ? (
          <p className="p-4 text-xs text-red-400">{error}</p>
        ) : (
          <>
            <div className="space-y-2 p-3 md:hidden">
              {(ledger?.assets ?? profile?.assets ?? []).map((a) => (
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
                      <p className="font-semibold text-[#00d4aa]">
                        {formatAmount(a.available)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-df-page/60 px-2 py-1.5 text-end">
                      <p className="text-[10px] text-df-faint">{t("freeze")}</p>
                      <p className="font-semibold text-[#f0b90b]">
                        {formatAmount(a.freeze)}
                      </p>
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
                {(ledger?.assets ?? profile?.assets ?? []).map((a) => (
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
        <TransactionLedgerList
          transactions={transactions}
          loading={showSkeleton}
          emptyLabel={t("noTransactions")}
          t={t}
        />
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-df-inset px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wide">{label}</p>
      <p className="font-semibold text-df">${formatAmount(value)}</p>
    </div>
  );
}

function PnlCard({
  label,
  value,
  positive,
  loading,
}: {
  label: string;
  value: number;
  positive: boolean;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl bg-df-inset p-3">
      <p className="text-[10px] text-df-faint">{label}</p>
      <p
        className={`mt-1 text-base font-bold ${
          positive ? "text-[#00d4aa]" : "text-[#ef4444]"
        }`}
      >
        {loading ? "—" : `${positive ? "+" : ""}$${formatAmount(value)}`}
      </p>
    </div>
  );
}
