/**
 * Definitive 6-tier strategy matrix — keep in sync with backend/lib/tradingLevels.cjs
 */
export type TradingLevel = {
  id: number;
  name: string;
  /** Decimal daily rate, e.g. 0.01 = 1.0% */
  dailyYield: number;
  minCapital: number;
  maxCapital: number;
  minTeam: number;
};

export const TRADING_LEVELS: readonly TradingLevel[] = [
  {
    id: 0,
    name: "Level 0 Baseline",
    dailyYield: 0.01,
    minCapital: 100,
    maxCapital: 299,
    minTeam: 0,
  },
  {
    id: 1,
    name: "Level 1",
    dailyYield: 0.015,
    minCapital: 300,
    maxCapital: 499,
    minTeam: 5,
  },
  {
    id: 2,
    name: "Strategy 2",
    dailyYield: 0.02,
    minCapital: 500,
    maxCapital: 1000,
    minTeam: 10,
  },
  {
    id: 3,
    name: "Strategy 3",
    dailyYield: 0.025,
    minCapital: 1000,
    maxCapital: 2000,
    minTeam: 30,
  },
  {
    id: 4,
    name: "Strategy 4",
    dailyYield: 0.03,
    minCapital: 2000,
    maxCapital: 3500,
    minTeam: 100,
  },
  {
    id: 5,
    name: "Strategy 5",
    dailyYield: 0.045,
    minCapital: 5000,
    maxCapital: 10000,
    minTeam: 200,
  },
  {
    id: 6,
    name: "Strategy 6",
    dailyYield: 0.05,
    minCapital: 10000,
    maxCapital: 999_999,
    minTeam: 400,
  },
] as const;

export function getTradingLevel(strategyId: number | null | undefined): TradingLevel {
  const id = Number(strategyId);
  if (Number.isFinite(id)) {
    const level = TRADING_LEVELS.find((row) => row.id === id);
    if (level) return level;
  }
  return TRADING_LEVELS[0];
}

export function getDailyYield(strategyId: number | null | undefined): number {
  return getTradingLevel(strategyId).dailyYield;
}

export function getDailyYieldPercent(strategyId: number | null | undefined): number {
  return Number((getDailyYield(strategyId) * 100).toFixed(2));
}

export function formatYieldDisplay(strategyId: number | null | undefined): string {
  const pct = getDailyYield(strategyId) * 100;
  return `${pct.toFixed(1)}%`;
}

export function computeEstimatedProceeds(
  tradableFunds: number,
  strategyId: number | null | undefined
): number {
  const funds = Number(tradableFunds) || 0;
  if (funds <= 0) return 0;
  return Number((funds * getDailyYield(strategyId)).toFixed(2));
}

/** Highest tier whose minimum capital is met by the amount (simulator / previews). */
export function resolveTradingLevelByCapital(amount: number): TradingLevel {
  const value = Number(amount) || 0;
  let matched = TRADING_LEVELS[0];
  for (const level of TRADING_LEVELS) {
    if (value >= level.minCapital) matched = level;
  }
  return matched;
}
