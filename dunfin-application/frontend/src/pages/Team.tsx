import { useState } from "react";
import { BrokerProgramSection } from "../components/broker/BrokerProgramSection";
import { PageHeader } from "../components/PageHeader";
import { TeamPageSkeleton } from "../components/skeletons/TeamPageSkeleton";
import { ContributionLogs } from "../components/team/ContributionLogs";
import { DownlineTable } from "../components/team/DownlineTable";
import { GenRebateMatrix } from "../components/team/GenRebateMatrix";
import { GenTabSwitcher, type GenTab } from "../components/team/GenTabSwitcher";
import { TeamMetricsBar } from "../components/team/TeamMetricsBar";
import { useUser } from "../context/UserContext";
import { useTeamAnalytics } from "../hooks/useTeamAnalytics";
import { useLocale } from "../i18n/LocaleContext";

export default function Team() {
  const { t } = useLocale();
  const { userId } = useUser();
  const { data, loading, error } = useTeamAnalytics(userId);
  const [activeGen, setActiveGen] = useState<GenTab>("gen1");

  const activeMembers = data?.statsPerGen[activeGen].members ?? [];

  return (
    <div className="space-y-5 pb-8">
      <PageHeader title={t("h5TeamHubTitle")} />

      {loading && <TeamPageSkeleton />}

      {!loading && error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {!loading && data && (
        <div className="df-content-enter space-y-5">
          <TeamMetricsBar
            totalCommission={data.totalCommission}
            totalTurnover={data.totalTurnover}
            dailyVolume={data.dailyVolume}
            headcount={data.headcount}
            newRegistrationsToday={data.newRegistrationsToday}
          />

          <BrokerProgramSection broker={data.broker} />

          <GenRebateMatrix
            gen1={data.statsPerGen.gen1}
            gen2={data.statsPerGen.gen2}
            gen3={data.statsPerGen.gen3}
          />

          <div className="space-y-3">
            <GenTabSwitcher active={activeGen} onChange={setActiveGen} />
            <DownlineTable members={activeMembers} />
          </div>

          <ContributionLogs logs={data.contributionLogs} />
        </div>
      )}
    </div>
  );
}
