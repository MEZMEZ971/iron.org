import { formatPrice, WATCHLIST_PAIRS, type MarketTicker } from "../data/markets";
import { useLocale } from "../i18n/LocaleContext";
import { GlassSkeleton, GlassSkeletonLine } from "./ui/GlassSkeleton";

interface Props {
  markets: MarketTicker[];
  loading?: boolean;
  syncing?: boolean;
}

export function MiniWatchlist({ markets, loading }: Props) {
  const { t } = useLocale();
  const watch = markets.filter((m) =>
    WATCHLIST_PAIRS.includes(m.pair as (typeof WATCHLIST_PAIRS)[number])
  );

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-df">{t("h5MarketsTitle")}</h2>
      {loading ? (
        <div className="grid grid-cols-2 gap-2" aria-busy="true">
          {WATCHLIST_PAIRS.map((pair) => (
            <GlassSkeleton key={pair} className="p-3">
              <GlassSkeletonLine className="h-3 w-16" />
              <GlassSkeletonLine className="mt-2 h-4 w-20" />
              <GlassSkeletonLine className="mt-2 h-3 w-12" />
            </GlassSkeleton>
          ))}
        </div>
      ) : (
        <div className="df-content-enter grid grid-cols-2 gap-2">
          {watch.map((m) => (
            <div key={m.id} className="glass-card rounded-xl p-3">
              <p className="text-xs text-df-muted">{m.pair}</p>
              <p className="mt-0.5 text-sm font-bold text-df">
                ${formatPrice(m.base, m.price)}
              </p>
              <p
                className={`mt-1 text-xs font-semibold ${
                  m.change24h >= 0 ? "text-[#00d4aa]" : "text-[#ef4444]"
                }`}
              >
                {m.change24h >= 0 ? "+" : ""}
                {m.change24h}%
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
