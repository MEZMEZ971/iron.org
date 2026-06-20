import type { Locale } from "../i18n/locales";

export const STRATEGY_TIER_NAMES_EN: Record<number, string> = {
  0: "Level 0 Baseline",
  1: "Level 1",
  2: "Tier II Enhanced",
  3: "Tier III Premium",
  4: "Tier IV Elite",
  5: "Tier V Executive",
  6: "Tier VI Global Apex",
};

export const STRATEGY_TIER_NAMES_AR: Record<number, string> = {
  0: "الاستراتيجية الأساسية",
  1: "الاستراتيجية الأولى",
  2: "المستوى II المحسّن",
  3: "المستوى III المميز",
  4: "المستوى IV النخبة",
  5: "المستوى V التنفيذي",
  6: "المستوى VI القمة العالمية",
};

export const STRATEGY_TIER_NAMES_IT: Record<number, string> = {
  0: "Livello 0 base",
  1: "Livello 1",
  2: "Livello II potenziato",
  3: "Livello III premium",
  4: "Livello IV elite",
  5: "Livello V executive",
  6: "Livello VI apice globale",
};

export type StrategyTierId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function clampStrategyTierId(id: number | null | undefined): StrategyTierId {
  const n = Number(id);
  if (n >= 0 && n <= 6) return n as StrategyTierId;
  return 0;
}

export function getStrategyTierName(
  tierId: number | null | undefined,
  locale: Locale = "en"
): string {
  const id = clampStrategyTierId(tierId);
  const map =
    locale === "ar"
      ? STRATEGY_TIER_NAMES_AR
      : locale === "it"
        ? STRATEGY_TIER_NAMES_IT
        : STRATEGY_TIER_NAMES_EN;
  return map[id] ?? STRATEGY_TIER_NAMES_EN[id];
}

/** Baseline when no contract is active or the affiliate tree is empty. */
export function resolveActiveStrategyTier(params: {
  activeStrategy?: number | null;
  lockedCapital?: number;
  teamSize?: number;
}): StrategyTierId {
  const locked = Number(params.lockedCapital) || 0;
  const team = Number(params.teamSize) || 0;
  const raw = params.activeStrategy;

  if (raw != null && raw >= 0 && raw <= 6) {
    if (locked <= 0 && team <= 0 && raw === 0) return 0;
    if (locked <= 0 && team <= 0) return 0;
    return clampStrategyTierId(raw);
  }

  return 0;
}

export type StrategyStarConfig = {
  starCount: number;
  starClassName: string;
  showCrown: boolean;
  pulseStars: boolean;
};

export function getStrategyStarConfig(tierId: number): StrategyStarConfig {
  const id = clampStrategyTierId(tierId);
  switch (id) {
    case 0:
      return {
        starCount: 1,
        starClassName: "text-slate-300",
        showCrown: false,
        pulseStars: false,
      };
    case 1:
      return {
        starCount: 1,
        starClassName: "text-slate-400",
        showCrown: false,
        pulseStars: false,
      };
    case 2:
      return {
        starCount: 2,
        starClassName: "text-emerald-400",
        showCrown: false,
        pulseStars: false,
      };
    case 3:
      return {
        starCount: 3,
        starClassName: "text-cyan-400",
        showCrown: false,
        pulseStars: false,
      };
    case 4:
      return {
        starCount: 4,
        starClassName: "text-purple-500",
        showCrown: false,
        pulseStars: false,
      };
    case 5:
      return {
        starCount: 5,
        starClassName: "text-amber-500",
        showCrown: false,
        pulseStars: true,
      };
    case 6:
    default:
      return {
        starCount: 5,
        starClassName:
          "text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.6)]",
        showCrown: true,
        pulseStars: false,
      };
  }
}
