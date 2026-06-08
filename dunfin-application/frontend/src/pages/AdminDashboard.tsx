import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  adminKycAction,
  adminWithdrawalAction,
  fetchAdminKyc,
  fetchAdminStats,
  fetchAdminWithdrawals,
  type AdminKycRow,
  type AdminStats,
  type AdminWithdrawalRow,
} from "../api/client";
import { ActivitySleepTracker } from "../components/admin/ActivitySleepTracker";
import { UserControlHub } from "../components/admin/UserControlHub";
import { UserWalletsAuditor } from "../components/admin/UserWalletsAuditor";
import { useLocale } from "../i18n/LocaleContext";
import type { TranslationKey } from "../i18n/translations";

type AdminTab = "withdrawals" | "kyc" | "stats" | "users" | "activity" | "finance";

const PANEL =
  "rounded-xl border border-white/[0.06] bg-[rgba(26,31,46,0.65)] backdrop-blur-md transition-all duration-300 ease-in-out";

const GOLD_BADGE =
  "inline-flex rounded-md bg-[#f0b90b]/15 px-2 py-0.5 text-[10px] font-bold text-[#f0b90b] shadow-[0_0_12px_rgba(240,185,11,0.25)]";

const GOLD_BTN =
  "rounded-lg bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] px-3 py-1.5 text-xs font-bold text-[#0a0e1a] transition-all duration-300 ease-in-out hover:shadow-[0_0_12px_rgba(240,185,11,0.35)] disabled:opacity-50";

const GHOST_BTN =
  "rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-df-muted transition-all duration-300 ease-in-out hover:border-red-400/40 hover:text-red-400 disabled:opacity-50";

function KycDocThumb({
  label,
  fileName,
  onExpand,
}: {
  label: string;
  fileName: string;
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="group flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d1528]/80 transition-all duration-300 ease-in-out hover:border-[#f0b90b]/30"
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[#1a2238] to-[#0a0e1a] transition-all duration-300 ease-in-out group-hover:from-[#1e2a4a]">
        <i className="fa-solid fa-id-card text-3xl text-[#f0b90b]/60" aria-hidden />
      </div>
      <div className="border-t border-white/[0.06] px-2 py-2 text-start">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#f0b90b]">
          {label}
        </p>
        <p className="truncate text-[11px] text-df-muted">{fileName}</p>
      </div>
    </button>
  );
}

export default function AdminDashboard() {
  const { t, dir } = useLocale();
  const rtl = dir === "rtl";

  const [tab, setTab] = useState<AdminTab>("users");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRow[]>([]);
  const [kycList, setKycList] = useState<AdminKycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{
    type: "withdrawal" | "kyc";
    id: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{
    label: string;
    fileName: string;
    user: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, w, k] = await Promise.all([
        fetchAdminStats(),
        fetchAdminWithdrawals(),
        fetchAdminKyc(),
      ]);
      setStats(s);
      setWithdrawals(w.withdrawals);
      setKycList(k.submissions);
    } catch {
      setNotice(t("adminAccessDenied"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2500);
  }

  async function copyWithdrawal(row: AdminWithdrawalRow) {
    const text = `${row.address}\n${row.netAmount} ${row.currency}`;
    await navigator.clipboard.writeText(text);
    flash(t("adminCopied"));
  }

  async function approveWithdrawal(id: string) {
    setBusyId(id);
    try {
      await adminWithdrawalAction(id, { action: "approve" });
      await refresh();
      flash(t("adminApproveClear"));
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      if (rejectTarget.type === "withdrawal") {
        await adminWithdrawalAction(rejectTarget.id, {
          action: "reject",
          reason: rejectReason,
        });
      } else {
        await adminKycAction(rejectTarget.id, {
          action: "reject",
          reason: rejectReason,
        });
        flash(t("adminKycRejectAlert"));
      }
      setRejectTarget(null);
      setRejectReason("");
      await refresh();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  async function approveKyc(id: string) {
    setBusyId(id);
    try {
      await adminKycAction(id, { action: "approve" });
      await refresh();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  const tabs: { id: AdminTab; labelKey: TranslationKey; icon?: string }[] = [
    { id: "users", labelKey: "adminTabUserControl" },
    {
      id: "activity",
      labelKey: "adminTabActivitySleep",
      icon: "fa-user-clock",
    },
    {
      id: "finance",
      labelKey: "adminTabFinanceAuditor",
      icon: "fa-money-bill-transfer",
    },
    { id: "withdrawals", labelKey: "adminTabWithdrawals" },
    { id: "kyc", labelKey: "adminTabKyc" },
    { id: "stats", labelKey: "adminTabStats" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] pb-10 transition-all duration-300 ease-in-out">
      <header className="border-b border-white/[0.06] bg-[#0a0e1a]/95 px-4 py-5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/"
              className="mb-2 inline-flex items-center gap-2 text-xs text-df-muted transition-all duration-300 hover:text-[#f0b90b]"
            >
              <i
                className={`fa-solid fa-arrow-left ${rtl ? "rotate-180" : ""}`}
                aria-hidden
              />
              {t("back")}
            </Link>
            <h1 className="text-xl font-bold tracking-wide text-white">
              {t("adminPortalTitle")}
            </h1>
          </div>
          <button
            type="button"
            onClick={refresh}
            className={`${GHOST_BTN} !text-[#f0b90b]`}
          >
            <i className="fa-solid fa-rotate me-1.5" aria-hidden />
            {t("adminRefresh")}
          </button>
        </div>

        <nav className="mx-auto mt-4 flex max-w-6xl gap-2 overflow-x-auto">
          {tabs.map(({ id, labelKey, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ease-in-out ${
                tab === id
                  ? "bg-[#f0b90b]/15 text-[#f0b90b] shadow-[inset_0_0_0_1px_rgba(240,185,11,0.25)]"
                  : "text-df-muted hover:bg-white/[0.04] hover:text-df"
              }`}
            >
              {icon && (
                <i className={`fa-solid ${icon} me-1.5`} aria-hidden />
              )}
              {t(labelKey)}
              {id === "withdrawals" && stats && stats.pendingWithdrawalCount > 0 && (
                <span className={`${GOLD_BADGE} ms-2`}>{stats.pendingWithdrawalCount}</span>
              )}
              {id === "kyc" && stats && stats.pendingKycCount > 0 && (
                <span className={`${GOLD_BADGE} ms-2`}>{stats.pendingKycCount}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {notice && (
          <p className="mb-4 rounded-lg bg-[#f0b90b]/10 px-3 py-2 text-center text-xs text-[#f0b90b]">
            {notice}
          </p>
        )}
        {loading && (
          <p className="text-center text-sm text-df-muted">{t("adminLoading")}</p>
        )}

        {!loading && tab === "users" && <UserControlHub onNotice={flash} />}

        {tab === "activity" && <ActivitySleepTracker onNotice={flash} />}

        {tab === "finance" && <UserWalletsAuditor onNotice={flash} />}

        {!loading && tab === "stats" && stats && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "adminStatLiquidity" as const, value: stats.totalManagedLiquidity },
              { key: "adminStatDeposits" as const, value: stats.totalCumulativeDeposits },
              { key: "adminStatWithdrawals" as const, value: stats.totalSettledWithdrawals },
              { key: "adminStatRevenue" as const, value: stats.totalPlatformRevenue },
            ].map(({ key, value }) => (
              <div key={key} className={`${PANEL} p-5`}>
                <p className="text-xs uppercase tracking-widest text-df-faint">{t(key)}</p>
                <p className="mt-2 text-2xl font-bold text-[#f0b90b]">
                  {value.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDT
                </p>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "withdrawals" && (
          <div className={`${PANEL} overflow-x-auto`}>
            {withdrawals.length === 0 ? (
              <p className="p-8 text-center text-sm text-df-muted">
                {t("adminNoPendingWithdrawals")}
              </p>
            ) : (
              <table className="w-full min-w-[900px] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wide text-df-faint">
                    <th className="px-4 py-3">{t("adminColUser")}</th>
                    <th className="px-4 py-3">{t("adminColAmount")}</th>
                    <th className="px-4 py-3">{t("adminColFee")}</th>
                    <th className="px-4 py-3">{t("adminColNet")}</th>
                    <th className="px-4 py-3">{t("adminColNetwork")}</th>
                    <th className="px-4 py-3">{t("adminColAddress")}</th>
                    <th className="px-4 py-3">{t("adminColActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/[0.04] transition-all duration-300 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-df">{row.displayName}</p>
                        <p className="text-xs text-df-faint">
                          {row.uid || row.email || row.userId}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-df">
                        {row.amount} {row.currency}
                      </td>
                      <td className="px-4 py-3 text-df-muted">{row.fee}</td>
                      <td className="px-4 py-3 font-semibold text-[#f0b90b]">
                        {row.netAmount}
                      </td>
                      <td className="px-4 py-3">
                        <span className={GOLD_BADGE}>{row.network}</span>
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs text-df-muted">
                        {row.address}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyWithdrawal(row)}
                            className={GHOST_BTN}
                          >
                            {t("adminCopyAddressAmount")}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => approveWithdrawal(row.id)}
                            className={GOLD_BTN}
                          >
                            {t("adminApproveClear")}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() =>
                              setRejectTarget({ type: "withdrawal", id: row.id })
                            }
                            className={GHOST_BTN}
                          >
                            {t("adminReject")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!loading && tab === "kyc" && (
          <div className="space-y-4">
            {kycList.length === 0 && (
              <p className={`${PANEL} p-8 text-center text-sm text-df-muted`}>
                {t("adminNoPendingKyc")}
              </p>
            )}
            {kycList.map((row) => (
              <div key={row.id} className={`${PANEL} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-df">{row.displayName}</p>
                    <p className="text-xs text-df-faint">
                      {row.uid || row.email} · {new Date(row.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={GOLD_BADGE}>{row.status}</span>
                </div>
                <div className="mt-4 flex gap-3">
                  <KycDocThumb
                    label={t("adminKycFrontId")}
                    fileName={row.frontFileName}
                    onExpand={() =>
                      setPreviewDoc({
                        label: t("adminKycFrontId"),
                        fileName: row.frontFileName,
                        user: row.displayName,
                      })
                    }
                  />
                  <KycDocThumb
                    label={t("adminKycBackId")}
                    fileName={row.backFileName}
                    onExpand={() =>
                      setPreviewDoc({
                        label: t("adminKycBackId"),
                        fileName: row.backFileName,
                        user: row.displayName,
                      })
                    }
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => approveKyc(row.id)}
                    className={GOLD_BTN}
                  >
                    {t("adminKycApprove")}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => setRejectTarget({ type: "kyc", id: row.id })}
                    className={GHOST_BTN}
                  >
                    {t("adminKycReject")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setRejectTarget(null)}
          />
          <div
            className={`${PANEL} relative w-full max-w-md p-5`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white">{t("adminReject")}</h3>
            <p className="mt-2 text-xs text-df-muted">{t("adminRejectReasonPrompt")}</p>
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("adminRejectReasonPlaceholder")}
              className="mt-3 w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm text-df focus:outline-none focus:ring-1 focus:ring-[#f0b90b]/40"
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setRejectTarget(null)} className={GHOST_BTN}>
                {t("adminCancel")}
              </button>
              <button type="button" onClick={confirmReject} className={GOLD_BTN}>
                {t("adminConfirmReject")}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewDoc(null)}
          />
          <div
            className={`${PANEL} relative max-h-[90vh] w-full max-w-lg overflow-auto p-5`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewDoc(null)}
              className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white"
            >
              <i className="fa-solid fa-xmark" aria-hidden />
            </button>
            <p className="text-sm font-bold text-[#f0b90b]">{previewDoc.label}</p>
            <p className="text-xs text-df-muted">{previewDoc.user}</p>
            <div className="mt-4 flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-[#1a2238] to-[#0a0e1a]">
              <i className="fa-solid fa-id-card text-6xl text-[#f0b90b]/50" aria-hidden />
            </div>
            <p className="mt-3 break-all text-sm text-df">{previewDoc.fileName}</p>
          </div>
        </div>
      )}
    </div>
  );
}
