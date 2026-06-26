/** ROI simulator — derives tiers from the canonical trading level matrix. */
import {
  getTierByRank,
  type BrokerRank,
} from "../config/brokerProgram";
import {
  TRADING_LEVELS,
  getDailyYield,
  resolveTradingLevelByCapital,
  formatYieldDisplay,
} from "./tradingLevels";

export const ROI_MIN_AMOUNT = 100;
export const ROI_MAX_AMOUNT = 50_000;

export type RoiStrategyId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type RoiTier = {
  strategyId: RoiStrategyId;
  min: number;
  max: number;
  dailyYield: number;
  teamMembersRequired: number;
  teamRequirementEn: string;
  teamRequirementAr: string;
};

function teamRequirementLabels(minTeam: number) {
  if (minTeam <= 0) {
    return {
      teamRequirementEn: "No requirements",
      teamRequirementAr: "لا يوجد متطلبات",
    };
  }
  return {
    teamRequirementEn: `Minimum ${minTeam} Active Members`,
    teamRequirementAr: `الحد الأدنى ${minTeam} عضواً نشطاً`,
  };
}

export const ROI_TIERS: readonly RoiTier[] = TRADING_LEVELS.map((level) => {
  const teamLabels = teamRequirementLabels(level.minTeam);
  return {
    strategyId: level.id as RoiStrategyId,
    min: level.minCapital,
    max: level.maxCapital >= 999_999 ? ROI_MAX_AMOUNT : level.maxCapital,
    dailyYield: level.dailyYield,
    teamMembersRequired: level.minTeam,
    ...teamLabels,
  };
});

export function getTeamRequirementLabel(
  tier: Pick<RoiTier, "teamRequirementEn" | "teamRequirementAr">,
  locale: "en" | "ar"
): string {
  return locale === "ar" ? tier.teamRequirementAr : tier.teamRequirementEn;
}

export function clampRoiAmount(raw: number): number {
  if (!Number.isFinite(raw)) return ROI_MIN_AMOUNT;
  return Math.min(ROI_MAX_AMOUNT, Math.max(ROI_MIN_AMOUNT, Math.round(raw)));
}

export function resolveRoiTier(amount: number): RoiTier & { amount: number } {
  const clamped = clampRoiAmount(amount);
  const level = resolveTradingLevelByCapital(clamped);
  const tier =
    ROI_TIERS.find((row) => row.strategyId === level.id) ?? ROI_TIERS[0];
  return { ...tier, amount: clamped };
}

export function getRoiTierByStrategyId(strategyId: number): RoiTier {
  const tier = ROI_TIERS.find((row) => row.strategyId === strategyId);
  return tier ?? ROI_TIERS[0];
}

export function formatYieldPercent(dailyYield: number): string {
  const pct = dailyYield * 100;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1).replace(/\.0$/, "");
}

export function computeRoiProjections(amount: number) {
  const { dailyYield, ...tier } = resolveRoiTier(amount);
  const dailyProfit = tier.amount * dailyYield;
  return {
    ...tier,
    dailyYield,
    dailyProfit,
    monthlyIncome: dailyProfit * 30,
    annualRevenue: dailyProfit * 365,
    yieldPercentLabel: formatYieldDisplay(tier.strategyId),
  };
}

export type GoalOrientedBrokerRank = BrokerRank;

export function computeGoalOrientedProjections(params: {
  amount: number;
  strategyId: RoiStrategyId;
  brokerRank: GoalOrientedBrokerRank;
}) {
  const strategyTier = getRoiTierByStrategyId(params.strategyId);
  const amount = clampRoiAmount(params.amount);
  const dailyProfit = amount * strategyTier.dailyYield;

  const brokerTier =
    params.brokerRank === "NONE" ? null : getTierByRank(params.brokerRank);

  const salary15Day = brokerTier?.salary15Day ?? 0;
  const totalMonthlyProfit = dailyProfit * 30 + salary15Day * 2;
  const strategyTeamRequired = strategyTier.teamMembersRequired;
  const brokerTeamRequired = brokerTier?.minTeamSize ?? 0;
  const teamRequired = Math.max(strategyTeamRequired, brokerTeamRequired);
  const capitalShortfall = Math.max(0, strategyTier.min - amount);

  return {
    amount,
    strategyId: strategyTier.strategyId,
    strategyTier,
    brokerRank: params.brokerRank,
    brokerTier,
    dailyYield: strategyTier.dailyYield,
    dailyProfit,
    salary15Day,
    totalMonthlyProfit,
    yieldPercentLabel: formatYieldDisplay(strategyTier.strategyId),
    strategyMinCapital: strategyTier.min,
    strategyMaxCapital: strategyTier.max,
    strategyTeamRequired,
    brokerTeamRequired,
    teamRequired,
    capitalShortfall,
    meetsCapitalRequirement: capitalShortfall <= 0,
    brokerOneTimeBonus: brokerTier?.oneTimeBonus ?? 0,
  };
}
