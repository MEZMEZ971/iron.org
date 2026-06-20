export const BROKER_RANK_NONE = "NONE";

export type BrokerRank =
  | typeof BROKER_RANK_NONE
  | "SILVER_1"
  | "GOLD_1"
  | "GOLD_2"
  | "GOLD_3"
  | "PLATINUM_1"
  | "PLATINUM_2"
  | "PLATINUM_3";

export type BrokerTierFamily = "SILVER" | "GOLD" | "PLATINUM";

export type BrokerTierRow = {
  rank: Exclude<BrokerRank, "NONE">;
  labelEn: string;
  labelAr: string;
  labelIt: string;
  minTeamSize: number;
  maxTeamSize: number;
  badge: string;
  badgeAr: string;
  badgeIt: string;
  oneTimeBonus: number;
  salary15Day: number;
  family: BrokerTierFamily;
};

export const BROKER_TIERS: readonly BrokerTierRow[] = [
  {
    rank: "SILVER_1",
    labelEn: "Silver Broker",
    labelAr: "وسيط فضي",
    labelIt: "Stella d'argento",
    minTeamSize: 10,
    maxTeamSize: 29,
    badge: "🌟 Silver Star",
    badgeAr: "🌟 نجمة فضية",
    badgeIt: "🌟 Stella d'argento",
    oneTimeBonus: 30,
    salary15Day: 15,
    family: "SILVER",
  },
  {
    rank: "GOLD_1",
    labelEn: "Golden Broker 1",
    labelAr: "وسيط ذهبي 1",
    labelIt: "1 Stella d'oro",
    minTeamSize: 30,
    maxTeamSize: 99,
    badge: "👑 1 Golden Star",
    badgeAr: "👑 نجمة ذهبية واحدة",
    badgeIt: "👑 1 Stella d'oro",
    oneTimeBonus: 100,
    salary15Day: 30,
    family: "GOLD",
  },
  {
    rank: "GOLD_2",
    labelEn: "Golden Broker 2",
    labelAr: "وسيط ذهبي 2",
    labelIt: "2 Stelle d'oro",
    minTeamSize: 100,
    maxTeamSize: 199,
    badge: "👑👑 2 Golden Stars",
    badgeAr: "👑👑 نجمتان ذهبيتان",
    badgeIt: "👑👑 2 Stelle d'oro",
    oneTimeBonus: 300,
    salary15Day: 100,
    family: "GOLD",
  },
  {
    rank: "GOLD_3",
    labelEn: "Golden Broker 3",
    labelAr: "وسيط ذهبي 3",
    labelIt: "3 Stelle d'oro",
    minTeamSize: 200,
    maxTeamSize: 399,
    badge: "👑👑👑 3 Golden Stars",
    badgeAr: "👑👑👑 3 نجوم ذهبية",
    badgeIt: "👑👑👑 3 Stelle d'oro",
    oneTimeBonus: 500,
    salary15Day: 200,
    family: "GOLD",
  },
  {
    rank: "PLATINUM_1",
    labelEn: "Platinum Broker 1",
    labelAr: "وسيط بلاتيني 1",
    labelIt: "1 Stella di platino",
    minTeamSize: 400,
    maxTeamSize: 599,
    badge: "💎 1 Platinum Star",
    badgeAr: "💎 نجمة بلاتينية واحدة",
    badgeIt: "💎 1 Stella di platino",
    oneTimeBonus: 1000,
    salary15Day: 300,
    family: "PLATINUM",
  },
  {
    rank: "PLATINUM_2",
    labelEn: "Platinum Broker 2",
    labelAr: "وسيط بلاتيني 2",
    labelIt: "2 Stelle di platino",
    minTeamSize: 600,
    maxTeamSize: 999,
    badge: "💎💎 2 Platinum Stars",
    badgeAr: "💎💎 نجمتان بلاتينيتان",
    badgeIt: "💎💎 2 Stelle di platino",
    oneTimeBonus: 1500,
    salary15Day: 500,
    family: "PLATINUM",
  },
  {
    rank: "PLATINUM_3",
    labelEn: "Platinum Broker 3",
    labelAr: "وسيط بلاتيني 3",
    labelIt: "3 Stelle di platino",
    minTeamSize: 1000,
    maxTeamSize: Number.MAX_SAFE_INTEGER,
    badge: "💎💎💎 3 Platinum Stars",
    badgeAr: "💎💎💎 3 نجوم بلاتينية",
    badgeIt: "💎💎💎 3 Stelle di platino",
    oneTimeBonus: 2000,
    salary15Day: 1000,
    family: "PLATINUM",
  },
] as const;

export type BrokerProfileSnapshot = {
  rank: BrokerRank;
  teamSize: number;
  badge: string | null;
  labelEn: string | null;
  labelAr: string | null;
  oneTimeBonus: number;
  salary15Day: number;
  nextTier: {
    rank: BrokerRank;
    minTeamSize: number;
    labelEn: string;
    labelAr: string;
    membersToNext: number;
  } | null;
  lastSalaryPayoutAt: string | null;
  tiers: Array<
    BrokerTierRow & {
      achieved: boolean;
      current: boolean;
    }
  >;
};

export function resolveRankFromTeamSize(teamSize: number): BrokerRank {
  if (teamSize < 10) return BROKER_RANK_NONE;
  for (const tier of BROKER_TIERS) {
    if (teamSize >= tier.minTeamSize && teamSize <= tier.maxTeamSize) {
      return tier.rank;
    }
  }
  return BROKER_RANK_NONE;
}

export function getTierByRank(rank: BrokerRank) {
  return BROKER_TIERS.find((t) => t.rank === rank) ?? null;
}

export function getTierBadge(
  tier: Pick<BrokerTierRow, "badge" | "badgeAr" | "badgeIt">,
  locale: string
) {
  if (locale === "ar") return tier.badgeAr;
  if (locale === "it") return tier.badgeIt;
  return tier.badge;
}

export function getTierLabel(
  tier: Pick<BrokerTierRow, "labelEn" | "labelAr" | "labelIt">,
  locale: string
) {
  if (locale === "ar") return tier.labelAr;
  if (locale === "it") return tier.labelIt;
  return tier.labelEn;
}
