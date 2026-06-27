import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminFinanceUserSummary,
  type AdminFinanceUserRow,
} from "../../api/client";
import { useLocale } from "../../i18n/LocaleContext";
import { formatUsdt as formatUsdtSafe } from "../../lib/formatNumbers";
import { resolveUserFacingError } from "../../lib/userFacingError";
import {
  ADMIN_DESC,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_MUTED,
  ADMIN_PANEL,
} from "./adminUi";

function formatUsdt(value: number, locale: string) {
  return formatUsdtSafe(value, locale, 6);
}

type Props = {
  onNotice: (message: string) => void;
};

export function UserWalletsAuditor({ onNotice }: Props) {
  const { t, locale } = useLocale();
  const [rows, setRows] = useState<AdminFinanceUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminFinanceUserSummary({
        search: debouncedSearch || undefined,
        limit: 100,
      });
      setRows(res.users);
    } catch (e) {
      onNotice(
        resolveUserFacingError(e, t, {
          fallbackKey: "adminAccessDenied",
          context: "admin-finance",
        })
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, onNotice, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className={`${ADMIN_PANEL} p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <i
                className="fa-solid fa-money-bill-transfer text-[#f0b90b]"
                aria-hidden
              />
              {t("adminTabFinanceAuditor")}
            </h2>
            <p className={`mt-1 ${ADMIN_DESC}`}>{t("adminFinanceAuditorDesc")}</p>
          </div>
          <div className="relative w-full max-w-sm">
            <i
              className="fa-solid fa-magnifying-glass pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("adminFinanceSearchPlaceholder")}
              className={`w-full rounded-lg py-2.5 ps-9 pe-3 ${ADMIN_INPUT}`}
            />
          </div>
        </div>
      </div>

      <div className={`${ADMIN_PANEL} overflow-x-auto`}>
        {loading ? (
          <p className={`p-8 text-center ${ADMIN_MUTED}`}>
            {t("adminFinanceLoading")}
          </p>
        ) : rows.length === 0 ? (
          <p className={`p-8 text-center ${ADMIN_MUTED}`}>
            {t("adminFinanceEmpty")}
          </p>
        ) : (
          <table className="w-full min-w-[880px] text-start text-sm">
            <thead>
              <tr className={`border-b border-white/[0.06] ${ADMIN_LABEL}`}>
                <th className="px-4 py-3">{t("adminFinanceColUser")}</th>
                <th className="px-4 py-3">{t("adminFinanceColBalance")}</th>
                <th className="px-4 py-3">{t("adminFinanceColDeposited")}</th>
                <th className="px-4 py-3">{t("adminFinanceColWithdrawn")}</th>
                <th className="px-4 py-3">{t("adminFinanceColNetFlow")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const negativeFlow = row.netCapitalFlow < 0;
                return (
                  <tr
                    key={row.uid}
                    className="border-b border-white/[0.04] transition-all duration-300 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {row.username || "—"}
                      </p>
                      <p className="font-mono text-xs text-slate-400">{row.uid}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      {formatUsdt(row.walletBalance, locale)} USDT
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-400">
                      {formatUsdt(row.totalDeposited, locale)} USDT
                    </td>
                    <td className="px-4 py-3 font-bold text-rose-400">
                      {formatUsdt(row.totalWithdrawn, locale)} USDT
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 font-bold ${
                          negativeFlow
                            ? "text-rose-400"
                            : "text-amber-400"
                        }`}
                      >
                        {negativeFlow && (
                          <i
                            className="fa-solid fa-triangle-exclamation text-[10px]"
                            aria-hidden
                          />
                        )}
                        {formatUsdt(row.netCapitalFlow, locale)} USDT
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
