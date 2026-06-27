import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminPayoutBrokerSalaries,
  fetchAdminBrokers,
  type AdminBrokerRow,
  type AdminBrokersSummary,
} from "../../api/client";
import { useLocale } from "../../i18n/LocaleContext";
import type { TranslationKey } from "../../i18n/translations";
import { formatAmount, formatUsdt, safeNumber } from "../../lib/formatNumbers";
import { resolveUserFacingError } from "../../lib/userFacingError";
import {
  ADMIN_DESC,
  ADMIN_GHOST_BTN,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_MUTED,
  ADMIN_PANEL,
} from "./adminUi";

type RankFilter = "ALL" | "SILVER" | "GOLD" | "PLATINUM";

type Props = {
  onNotice: (message: string) => void;
};

const GOLD_PAYOUT_BTN =
  "rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] px-4 py-2.5 text-sm font-bold text-[#0a0e1a] shadow-[0_0_20px_rgba(240,185,11,0.35)] transition-all duration-300 hover:shadow-[0_0_28px_rgba(240,185,11,0.5)] disabled:opacity-50";

function rankBadgeClass(family: string | null) {
  if (family === "SILVER") {
    return "bg-slate-400/15 text-slate-200 ring-1 ring-slate-400/30";
  }
  if (family === "GOLD") {
    return "bg-[#f0b90b]/15 text-[#fcd535] ring-1 ring-[#f0b90b]/35";
  }
  if (family === "PLATINUM") {
    return "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/35";
  }
  return "bg-white/10 text-slate-300 ring-1 ring-white/10";
}

function formatPayoutDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BrokerManager({ onNotice }: Props) {
  const { t, locale } = useLocale();
  const [brokers, setBrokers] = useState<AdminBrokerRow[]>([]);
  const [summary, setSummary] = useState<AdminBrokersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rankFilter, setRankFilter] = useState<RankFilter>("ALL");
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutBusy, setPayoutBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminBrokers();
      setBrokers(res.brokers);
      setSummary(res.summary);
    } catch (e) {
      onNotice(
        resolveUserFacingError(e, t, {
          fallbackKey: "adminAccessDenied",
          context: "admin-brokers",
        })
      );
      setBrokers([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [onNotice, t]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredBrokers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return brokers.filter((row) => {
      if (rankFilter !== "ALL" && row.family !== rankFilter) return false;
      if (!q) return true;
      const uid = String(row.uid ?? "").toLowerCase();
      const username = String(row.username ?? "").toLowerCase();
      return uid.includes(q) || username.includes(q);
    });
  }, [brokers, rankFilter, search]);

  const estimatedPayout = safeNumber(summary?.estimatedPayoutUsdt);
  const eligibleCount = safeNumber(summary?.eligibleForPayout);

  async function confirmPayout() {
    setPayoutBusy(true);
    try {
      const result = await adminPayoutBrokerSalaries();
      const amount = formatUsdt(result.totalUsdtPaid, locale, 2);
      const count = formatAmount(result.brokersPaid, locale);
      onNotice(
        t("adminBrokerPayoutSuccess")
          .replace("{amount}", amount)
          .replace("{count}", count)
      );
      setPayoutModalOpen(false);
      await load();
    } catch (e) {
      onNotice(
        resolveUserFacingError(e, t, {
          fallbackKey: "errorGeneric",
          context: "admin-broker-payout",
        })
      );
    } finally {
      setPayoutBusy(false);
    }
  }

  const rankFilters: { id: RankFilter; labelKey: TranslationKey }[] = [
    { id: "ALL", labelKey: "adminBrokerFilterAll" },
    { id: "SILVER", labelKey: "adminBrokerFilterSilver" },
    { id: "GOLD", labelKey: "adminBrokerFilterGold" },
    { id: "PLATINUM", labelKey: "adminBrokerFilterPlatinum" },
  ];

  return (
    <div className="space-y-4">
      <div className={`${ADMIN_PANEL} p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <i className="fa-solid fa-users-gear text-[#f0b90b]" aria-hidden />
              {t("adminBrokerTitle")}
            </h2>
            <p className={`mt-1 ${ADMIN_DESC}`}>{t("adminBrokerDesc")}</p>
            {summary && (
              <p className={`mt-2 text-xs ${ADMIN_MUTED}`}>
                {t("adminBrokerSummary")
                  .replace("{total}", formatAmount(summary.totalBrokers, locale))
                  .replace("{eligible}", formatAmount(eligibleCount, locale))}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPayoutModalOpen(true)}
            disabled={loading || eligibleCount === 0}
            className={GOLD_PAYOUT_BTN}
          >
            <i className="fa-solid fa-money-bill-wave me-1.5" aria-hidden />
            {t("adminBrokerPayoutBtn")}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <i
              className="fa-solid fa-magnifying-glass pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("adminBrokerSearchPlaceholder")}
              className={`w-full rounded-lg py-2.5 ps-9 pe-3 ${ADMIN_INPUT}`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {rankFilters.map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRankFilter(id)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300 ${
                  rankFilter === id
                    ? "bg-[#f0b90b]/15 text-[#f0b90b] ring-1 ring-[#f0b90b]/30"
                    : `${ADMIN_GHOST_BTN} px-3 py-2`
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${ADMIN_PANEL} overflow-x-auto`}>
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10">
            <i
              className="fa-solid fa-spinner fa-spin text-[#f0b90b]"
              aria-hidden
            />
            <p className={ADMIN_MUTED}>{t("adminBrokerLoading")}</p>
          </div>
        ) : filteredBrokers.length === 0 ? (
          <p className={`p-8 text-center ${ADMIN_MUTED}`}>{t("adminBrokerEmpty")}</p>
        ) : (
          <table className="w-full min-w-[920px] text-start text-sm">
            <thead>
              <tr className={`border-b border-white/[0.06] ${ADMIN_LABEL}`}>
                <th className="px-4 py-3">{t("adminBrokerColUser")}</th>
                <th className="px-4 py-3">{t("adminBrokerColRank")}</th>
                <th className="px-4 py-3">{t("adminBrokerColTeam")}</th>
                <th className="px-4 py-3">{t("adminBrokerColSalary")}</th>
                <th className="px-4 py-3">{t("adminBrokerColLastPayout")}</th>
                <th className="px-4 py-3">{t("adminBrokerColStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredBrokers.map((row) => {
                const label =
                  locale === "ar"
                    ? row.labelAr ?? row.brokerRank
                    : row.labelEn ?? row.brokerRank;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-white/[0.04] transition-all duration-300 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {row.username || "—"}
                      </p>
                      <p className="font-mono text-xs text-slate-400">{row.uid}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${rankBadgeClass(row.family)}`}
                      >
                        {row.badge ?? label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      {formatAmount(row.totalTeamCount, locale)}
                      <span className={`ms-1 text-[10px] ${ADMIN_MUTED}`}>
                        {t("adminBrokerGenLabel")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#f0b90b]">
                      {formatUsdt(row.calculatedSalary, locale, 2)} USDT
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatPayoutDate(row.lastSalaryPayoutAt, locale)}
                    </td>
                    <td className="px-4 py-3">
                      {row.salaryEligible ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                          <i className="fa-solid fa-circle-check" aria-hidden />
                          {t("adminBrokerStatusDue")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {t("adminBrokerStatusPaid")}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {payoutModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="broker-payout-title"
        >
          <div
            className={`${ADMIN_PANEL} w-full max-w-md p-6 shadow-[0_0_40px_rgba(240,185,11,0.12)]`}
          >
            <h3
              id="broker-payout-title"
              className="text-lg font-bold text-white"
            >
              {t("adminBrokerPayoutConfirmTitle")}
            </h3>
            <p className={`mt-2 ${ADMIN_DESC}`}>
              {t("adminBrokerPayoutConfirmDesc")}
            </p>
            <div className="mt-4 rounded-xl border border-[#f0b90b]/25 bg-[#f0b90b]/5 p-4">
              <p className={`text-xs ${ADMIN_LABEL}`}>
                {t("adminBrokerPayoutEstimate")}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#fcd535]">
                {formatUsdt(estimatedPayout, locale, 2)} USDT
              </p>
              <p className={`mt-1 text-xs ${ADMIN_MUTED}`}>
                {t("adminBrokerPayoutEligible")
                  .replace("{count}", formatAmount(eligibleCount, locale))}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                disabled={payoutBusy}
                className={`${ADMIN_GHOST_BTN} px-4 py-2`}
              >
                {t("adminCancel")}
              </button>
              <button
                type="button"
                onClick={confirmPayout}
                disabled={payoutBusy || eligibleCount === 0}
                className={GOLD_PAYOUT_BTN}
              >
                {payoutBusy ? (
                  <>
                    <i
                      className="fa-solid fa-spinner fa-spin me-1.5"
                      aria-hidden
                    />
                    {t("adminBrokerPayoutProcessing")}
                  </>
                ) : (
                  t("adminBrokerPayoutConfirmBtn")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrokerManager;
