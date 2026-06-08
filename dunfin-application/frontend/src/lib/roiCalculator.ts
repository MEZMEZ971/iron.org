/** ROI simulator tiers — capital brackets and daily yield (Feature #3). */
export const ROI_MIN_AMOUNT = 100;
export const ROI_MAX_AMOUNT = 50_000;

export type RoiTier = {
  strategyId: 1 | 2 | 3 | 4 | 5 | 6;
  min: number;
  max: number;
  /** Decimal daily rate, e.g. 0.015 = 1.5% */
  dailyYield: number;
  /** Active downline members required to activate this strategy tier */
  teamMembersRequired: number;
  teamRequirementEn: string;
  teamRequirementAr: string;
};

export const ROI_TIERS: readonly RoiTier[] = [
  {
    strategyId: 1,
    min: 100,
    max: 300,
    dailyYield: 0.015,
    teamMembersRequired: 0,
    teamRequirementEn: "No requirements",
    teamRequirementAr: "لا يوجد متطلبات",
  },
  {
    strategyId: 2,
    min: 301,
    max: 1_000,
    dailyYield: 0.02,
    teamMembersRequired: 5,
    teamRequirementEn: "Minimum 5 Active Members",
    teamRequirementAr: "الحد الأدنى 5 أعضاء نشطين",
  },
  {
    strategyId: 3,
    min: 1_001,
    max: 2_000,
    dailyYield: 0.025,
    teamMembersRequired: 30,
    teamRequirementEn: "Minimum 30 Active Members",
    teamRequirementAr: "الحد الأدنى 30 عضواً نشطاً",
  },
  {
    strategyId: 4,
    min: 2_001,
    max: 3_500,
    dailyYield: 0.03,
    teamMembersRequired: 100,
    teamRequirementEn: "Minimum 100 Active Members",
    teamRequirementAr: "الحد الأدنى 100 عضو نشط",
  },
  {
    strategyId: 5,
    min: 3_501,
    max: 10_000,
    dailyYield: 0.045,
    teamMembersRequired: 200,
    teamRequirementEn: "Minimum 200 Active Members",
    teamRequirementAr: "الحد الأدنى 200 عضو نشط",
  },
  {
    strategyId: 6,
    min: 10_001,
    max: 50_000,
    dailyYield: 0.05,
    teamMembersRequired: 400,
    teamRequirementEn: "Minimum 400 Active Members",
    teamRequirementAr: "الحد الأدنى 400 عضو نشط",
  },
] as const;

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
  const tier =
    ROI_TIERS.find((t) => clamped >= t.min && clamped <= t.max) ??
    ROI_TIERS[ROI_TIERS.length - 1];
  return { ...tier, amount: clamped };
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
    yieldPercentLabel: formatYieldPercent(dailyYield),
  };
}
