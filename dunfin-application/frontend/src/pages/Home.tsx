import { AffiliatePromoBanner } from "../components/AffiliatePromoBanner";
import { FomoUsersBanner } from "../components/FomoUsersBanner";
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
      <div className="sticky top-0 z-30 -mx-3 px-3 pb-1 pt-0 sm:-mx-4 sm:px-4 md:static md:mx-0 md:px-0 md:pb-0">
        <FomoUsersBanner variant="hero" />
      </div>
      <MarqueeBanner />
      <QuickActionGrid />
      <RoiProfitSimulator />
      <AffiliatePromoBanner />
      <MiniWatchlist markets={markets} loading={loading && markets.length === 0} syncing={syncing} />
    </div>
  );
}
