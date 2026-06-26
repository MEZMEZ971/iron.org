/** Canonical tier matrix — capital/team gates; yields in tradingLevels.ts */
import {
  TRADING_LEVELS,
  formatYieldDisplay,
  getDailyYield,
} from "./tradingLevels";

export type StrategyDefinition = {
  id: number;
  name: string;
  minCapital: number;
  maxCapital: number;
  minTeam: number;
  affiliationRequired: boolean;
};

export const STRATEGIES_MATRIX: readonly StrategyDefinition[] = TRADING_LEVELS.map(
  (level) => ({
    id: level.id,
    name: level.name,
    minCapital: level.minCapital,
    maxCapital: level.maxCapital,
    minTeam: level.minTeam,
    affiliationRequired: false,
  })
);

export function getStrategyDefinition(id: number): StrategyDefinition | undefined {
  return STRATEGIES_MATRIX.find((s) => s.id === id);
}

export function formatStrategyDailyRoi(
  id: number,
  strategy?: { dailyYieldLabel?: string }
): string {
  if (strategy?.dailyYieldLabel) return strategy.dailyYieldLabel;
  return formatYieldDisplay(id);
}

export function getStrategyDailyRoiDecimal(id: number): number {
  return getDailyYield(id);
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
