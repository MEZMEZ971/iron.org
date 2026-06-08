/** Canonical tier matrix — keep in sync with backend strategies.cjs & strategyRoi.cjs */
export type StrategyDefinition = {
  id: number;
  name: string;
  dailyRoiPct: number;
  minCapital: number;
  maxCapital: number;
  minTeam: number;
  affiliationRequired: boolean;
};

export const STRATEGIES_MATRIX: readonly StrategyDefinition[] = [
  {
    id: 0,
    name: "Level 0",
    dailyRoiPct: 1.0,
    minCapital: 100,
    maxCapital: 299,
    minTeam: 0,
    affiliationRequired: false,
  },
  {
    id: 1,
    name: "Level 1",
    dailyRoiPct: 1.5,
    minCapital: 300,
    maxCapital: 499,
    minTeam: 5,
    affiliationRequired: false,
  },
  {
    id: 2,
    name: "Strategy 2",
    dailyRoiPct: 2.0,
    minCapital: 500,
    maxCapital: 1000,
    minTeam: 10,
    affiliationRequired: false,
  },
  {
    id: 3,
    name: "Strategy 3",
    dailyRoiPct: 2.5,
    minCapital: 1000,
    maxCapital: 2000,
    minTeam: 30,
    affiliationRequired: false,
  },
  {
    id: 4,
    name: "Strategy 4",
    dailyRoiPct: 3.0,
    minCapital: 2000,
    maxCapital: 3500,
    minTeam: 100,
    affiliationRequired: false,
  },
  {
    id: 5,
    name: "Strategy 5",
    dailyRoiPct: 4.5,
    minCapital: 5000,
    maxCapital: 10000,
    minTeam: 200,
    affiliationRequired: false,
  },
  {
    id: 6,
    name: "Strategy 6",
    dailyRoiPct: 5.0,
    minCapital: 10000,
    maxCapital: 999_999,
    minTeam: 400,
    affiliationRequired: false,
  },
] as const;

export function getStrategyDefinition(id: number): StrategyDefinition | undefined {
  return STRATEGIES_MATRIX.find((s) => s.id === id);
}

export function formatStrategyDailyRoi(id: number): string {
  const def = getStrategyDefinition(id);
  if (!def) return "—";
  const pct =
    def.dailyRoiPct % 1 === 0
      ? def.dailyRoiPct.toFixed(1)
      : def.dailyRoiPct.toFixed(1);
  return `${pct}%`;
}

export function formatStrategyCapitalRange(
  minCapital: number,
  maxCapital: number,
  strategyId?: number
): string {
  if (strategyId === 6 || maxCapital >= 999_999) {
    return `$${minCapital.toLocaleString()}+`;
  }
  return `$${minCapital.toLocaleString()} – $${maxCapital.toLocaleString()}`;
}

/** Suggested trade capital when user selects an unlocked tier. */
export function suggestedCapitalForStrategy(
  strategyId: number,
  walletBalance: number
): number {
  const def = getStrategyDefinition(strategyId);
  if (!def) return 0;
  const wallet = Math.max(0, Number(walletBalance) || 0);
  if (wallet < def.minCapital) return Math.min(wallet, def.minCapital);
  if (wallet <= def.maxCapital) return wallet;
  return def.maxCapital >= 999_999 ? Math.max(def.minCapital, wallet) : def.maxCapital;
}
