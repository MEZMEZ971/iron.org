import { AffiliatePromoBanner } from "../components/AffiliatePromoBanner";
import { RoiProfitSimulator } from "../components/h5/RoiProfitSimulator";
import { MarqueeBanner } from "../components/MarqueeBanner";
import { MiniWatchlist } from "../components/MiniWatchlist";
import { QuickActionGrid } from "../components/QuickActionGrid";
import { useMarketStream } from "../hooks/useMarketStream";

/** H5 dashboard home — quotes landing + gamification widgets */
export default function Home() {
  const { markets, loading, syncing } = useMarketStream();

  return (
    <div className="space-y-3 pb-4 sm:space-y-4">
      <MarqueeBanner />
      <QuickActionGrid />
      <RoiProfitSimulator />
      <AffiliatePromoBanner />
      <MiniWatchlist markets={markets} loading={loading && markets.length === 0} syncing={syncing} />
    </div>
  );
}
