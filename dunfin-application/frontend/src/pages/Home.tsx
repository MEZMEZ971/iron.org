import { AffiliatePromoBanner } from "../components/AffiliatePromoBanner";
import { FomoUsersBanner } from "../components/FomoUsersBanner";
import { RoiProfitSimulator } from "../components/h5/RoiProfitSimulator";
import { MarqueeBanner } from "../components/MarqueeBanner";
import { MiniWatchlist } from "../components/MiniWatchlist";
import { QuickActionGrid } from "../components/QuickActionGrid";
import { TaxHolidayStatusBanner } from "../components/TaxHolidayStatusBanner";
import { useMarketStream } from "../hooks/useMarketStream";

/** H5 dashboard home — quotes landing + gamification widgets */
export default function Home() {
  const { markets, loading } = useMarketStream();

  return (
    <div className="space-y-4 pb-4">
      <div className="sticky top-0 z-30 -mx-4 px-4 pb-1 pt-0 md:static md:mx-0 md:px-0 md:pb-0">
        <FomoUsersBanner variant="hero" />
      </div>
      <MarqueeBanner />
      <TaxHolidayStatusBanner />
      <QuickActionGrid />
      <RoiProfitSimulator />
      <AffiliatePromoBanner />
      <MiniWatchlist markets={markets} loading={loading} />
    </div>
  );
}
