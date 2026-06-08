import { useMemo, useState } from "react";
import { MarketListSkeleton } from "../components/skeletons/MarketListSkeleton";
import { formatPrice } from "../data/markets";
import { useMarketStream } from "../hooks/useMarketStream";
import { useLocale } from "../i18n/LocaleContext";

export default function Market() {
  const { t } = useLocale();
  const { markets, loading } = useMarketStream(1800);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return markets;
    return markets.filter(
      (m) =>
        m.pair.toLowerCase().includes(q) || m.base.toLowerCase().includes(q)
    );
  }, [markets, query]);

  return (
    <div className="space-y-3 pb-4">
      <h1 className="text-lg font-bold text-df">{t("marketTitle")}</h1>

      <div className="glass-card flex items-center gap-2 rounded-xl px-3 py-2.5">
        <svg className="h-4 w-4 shrink-0 text-df-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchMarket")}
          disabled={loading}
          className="w-full bg-transparent text-sm text-df placeholder:text-df-faint focus:outline-none disabled:opacity-60"
        />
      </div>

      {loading ? (
        <MarketListSkeleton />
      ) : (
        <div className="df-content-enter">
          <div className="df-table-shell glass-card overflow-hidden rounded-2xl">
            <div className="grid grid-cols-3 gap-2 border-b border-df bg-df-table-head px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-df-faint">
              <span>{t("quotationName")}</span>
              <span className="text-end">{t("latestPrice")}</span>
              <span className="text-end">{t("change24h")}</span>
            </div>
            <ul className="max-h-[calc(100vh-280px)] overflow-y-auto divide-y divide-[var(--df-border)]">
              {filtered.map((m) => (
                <li
                  key={m.id}
                  className="grid grid-cols-3 items-center gap-2 px-3 py-3 transition hover:bg-df-hover"
                >
                  <div>
                    <p className="text-sm font-semibold text-df">{m.base}</p>
                    <p className="text-[10px] text-df-faint">{m.pair}</p>
                  </div>
                  <p className="text-end text-sm font-medium text-df">
                    {formatPrice(m.base, m.price)}
                  </p>
                  <p className="text-end">
                    <span
                      className={`inline-block min-w-[4.5rem] rounded-md px-2 py-0.5 text-xs font-bold ${
                        m.change24h >= 0
                          ? "bg-[#00d4aa]/15 text-[#00d4aa]"
                          : "bg-[#ef4444]/15 text-[#ef4444]"
                      }`}
                    >
                      {m.change24h >= 0 ? "+" : ""}
                      {m.change24h}%
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
