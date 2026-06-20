import { useCallback, useEffect, useState } from "react";
import {
  adminWakeUpSleepers,
  fetchAdminActivityAnalytics,
  type AdminActivityAnalytics,
  type UserActivityStatus,
} from "../../api/client";
import { useLocale } from "../../i18n/LocaleContext";
import type { TranslationKey } from "../../i18n/translations";
import { ADMIN_LABEL, ADMIN_MUTED, ADMIN_PANEL } from "./adminUi";

const GOLD_BTN =
  "rounded-lg bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] px-3 py-2 text-xs font-bold text-[#0a0e1a] transition-all duration-300 ease-in-out hover:shadow-[0_0_12px_rgba(240,185,11,0.35)] disabled:opacity-50";

const STATUS_LABEL: Record<UserActivityStatus, TranslationKey> = {
  ACTIVE: "adminUserActivityActive",
  INACTIVE: "adminUserActivityInactive",
  SLEEP: "adminUserActivitySleep",
};

const STATUS_BADGE: Record<UserActivityStatus, string> = {
  ACTIVE:
    "bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]",
  INACTIVE:
    "bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
  SLEEP:
    "bg-purple-500/15 text-purple-300 shadow-[0_0_16px_rgba(168,85,247,0.35)]",
};

type Props = {
  onNotice: (message: string) => void;
};

export function ActivitySleepTracker({ onNotice }: Props) {
  const { t, locale } = useLocale();
  const [data, setData] = useState<AdminActivityAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminActivityAnalytics();
      setData(res);
    } catch (e) {
      onNotice(e instanceof Error ? e.message : t("adminAccessDenied"));
    } finally {
      setLoading(false);
    }
  }, [onNotice, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleWakeUp() {
    setWaking(true);
    try {
      const res = await adminWakeUpSleepers();
      if (res.sent > 0) {
        onNotice(
          t("adminWakeUpSuccess").replace("{count}", String(res.sent)),
        );
      } else {
        onNotice(t("adminWakeUpNone"));
      }
      await load();
    } catch (e) {
      onNotice(e instanceof Error ? e.message : t("errorGeneric"));
    } finally {
      setWaking(false);
    }
  }

  function formatLastActivity(iso: string) {
    try {
      return new Date(iso).toLocaleString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  if (loading && !data) {
    return (
      <p className={`text-center ${ADMIN_MUTED}`}>{t("adminLoading")}</p>
    );
  }

  const counts = data?.counts ?? { active: 0, inactive: 0, sleep: 0, total: 0 };
  const users = data?.users ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div
          className={`${ADMIN_PANEL} p-5 shadow-[0_0_24px_rgba(16,185,129,0.12)]`}
        >
          <p className="text-xs uppercase tracking-widest text-emerald-400/80">
            {t("adminActivityActiveTotal")}
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {counts.active}
          </p>
        </div>

        <div
          className={`${ADMIN_PANEL} p-5 shadow-[0_0_24px_rgba(245,158,11,0.12)]`}
        >
          <p className="text-xs uppercase tracking-widest text-amber-400/80">
            {t("adminActivityInactiveTotal")}
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-400">
            {counts.inactive}
          </p>
        </div>

        <div
          className={`${ADMIN_PANEL} animate-pulse p-5 shadow-[0_0_28px_rgba(168,85,247,0.2)]`}
          style={{ animationDuration: "3s" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-purple-300/90">
                {t("adminActivitySleepTotal")} 💤
              </p>
              <p className="mt-2 text-3xl font-bold text-purple-300">
                {counts.sleep}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                {t("adminActivitySleepPulse")}
              </p>
            </div>
            <button
              type="button"
              disabled={waking || counts.sleep === 0}
              onClick={handleWakeUp}
              className={GOLD_BTN}
            >
              <i className="fa-solid fa-bell me-1.5" aria-hidden />
              {t("adminWakeUpBtn")}
            </button>
          </div>
        </div>
      </div>

      <div className={`${ADMIN_PANEL} overflow-x-auto`}>
        <table className="w-full min-w-[720px] text-start text-sm">
          <thead>
            <tr className={`border-b border-white/[0.06] ${ADMIN_LABEL}`}>
              <th className="px-4 py-3">{t("adminColUid")}</th>
              <th className="px-4 py-3">{t("adminColUser")}</th>
              <th className="px-4 py-3">{t("adminFieldBalance")}</th>
              <th className="px-4 py-3">{t("adminColLastActivity")}</th>
              <th className="px-4 py-3">{t("adminColActivityStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((row) => (
              <tr
                key={row.uid}
                className="border-b border-white/[0.04] transition-all duration-300 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                  {row.uid}
                </td>
                <td className="px-4 py-3 font-medium text-white">
                  {row.username || "—"}
                </td>
                <td className="px-4 py-3 text-[#f0b90b]">
                  {row.walletBalance.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })}{" "}
                  USDT
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {formatLastActivity(row.lastActivityAt)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[row.status]}`}
                  >
                    {t(STATUS_LABEL[row.status])}
                    {row.status === "SLEEP" ? " 💤" : ""}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className={`p-8 text-center ${ADMIN_MUTED}`}>
            {t("adminLoading")}
          </p>
        )}
      </div>
    </div>
  );
}
