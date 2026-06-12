import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminFinanceUserSummary,
  type AdminFinanceUserRow,
} from "../../api/client";
import { useLocale } from "../../i18n/LocaleContext";
import { formatUsdt as formatUsdtSafe } from "../../lib/formatNumbers";

const PANEL =
  "rounded-xl border border-white/[0.06] bg-[rgba(26,31,46,0.65)] backdrop-blur-md transition-all duration-300 ease-in-out";

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
      onNotice(e instanceof Error ? e.message : t("adminAccessDenied"));
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
      <div className={`${PANEL} p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <i
                className="fa-solid fa-money-bill-transfer text-[#f0b90b]"
                aria-hidden
              />
              {t("adminTabFinanceAuditor")}
            </h2>
            <p className="mt-1 text-xs text-df-muted">{t("adminFinanceAuditorDesc")}</p>
          </div>
          <div className="relative w-full max-w-sm">
            <i
              className="fa-solid fa-magnifying-glass pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs text-df-faint"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("adminFinanceSearchPlaceholder")}
              className="w-full rounded-lg border border-white/10 bg-[#0a0e1a] py-2.5 ps-9 pe-3 text-sm text-df placeholder:text-df-faint focus:outline-none focus:ring-1 focus:ring-[#f0b90b]/40"
            />
          </div>
        </div>
      </div>

      <div className={`${PANEL} overflow-x-auto`}>
        {loading ? (
          <p className="p-8 text-center text-sm text-df-muted">
            {t("adminFinanceLoading")}
          </p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-df-muted">
            {t("adminFinanceEmpty")}
          </p>
        ) : (
          <table className="w-full min-w-[880px] text-start text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wide text-df-faint">
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
                      <p className="font-medium text-df">
                        {row.username || "—"}
                      </p>
                      <p className="font-mono text-xs text-df-faint">{row.uid}</p>
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
