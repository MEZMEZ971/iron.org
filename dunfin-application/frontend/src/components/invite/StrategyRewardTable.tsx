import { StrategyStarBadge } from "../StrategyStarBadge";
import { useLocale } from "../../i18n/LocaleContext";
import type { InviteRewardRow } from "../../api/client";
import { getStrategyTierName } from "../../lib/strategyTiers";

interface Props {
  rows: InviteRewardRow[];
}

export function StrategyRewardTable({ rows }: Props) {
  const { t, locale } = useLocale();

  return (
    <div className="df-table-shell overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-xs">
          <thead>
            <tr className="border-b border-df text-[10px] uppercase tracking-wide text-df-faint">
              <th className="px-3 py-3 text-start">{t("inviteProductType")}</th>
              <th className="px-3 py-3 text-center">{t("inviteTeamSize")}</th>
              <th className="px-3 py-3 text-end">{t("inviteReward")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.strategyId}
                className="border-b border-df transition hover:bg-df-hover"
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <StrategyStarBadge tierId={row.strategyId} size="md" />
                    <div className="min-w-0">
                      <span className="font-semibold text-[#f0b90b]">
                        {row.productName}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-df-faint">
                        {getStrategyTierName(row.strategyId, locale)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-center font-medium text-df">
                  {row.minTeam === 0
                    ? t("inviteTeamNone")
                    : `${row.minTeam}`}
                </td>
                <td className="px-3 py-3 text-end">
                  <div className="flex flex-col items-end gap-1">
                    <StrategyStarBadge tierId={row.strategyId} />
                    <span className="font-medium text-[#00d4aa]">
                      {row.rewardTier}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
