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

export type BrokerTierRow = {
  rank: Exclude<BrokerRank, "NONE">;
  labelEn: string;
  labelAr: string;
  minTeamSize: number;
  badge: string;
  oneTimeBonus: number;
  salary15Day: number;
};

export const BROKER_TIERS: readonly BrokerTierRow[] = [
  {
    rank: "SILVER_1",
    labelEn: "Silver Broker",
    labelAr: "وسيط فضي",
    minTeamSize: 10,
    badge: "🌟 Silver Star",
    oneTimeBonus: 30,
    salary15Day: 15,
  },
  {
    rank: "GOLD_1",
    labelEn: "Golden Broker 1",
    labelAr: "وسيط ذهبي 1",
    minTeamSize: 30,
    badge: "👑 1 Golden Star",
    oneTimeBonus: 100,
    salary15Day: 30,
  },
  {
    rank: "GOLD_2",
    labelEn: "Golden Broker 2",
    labelAr: "وسيط ذهبي 2",
    minTeamSize: 100,
    badge: "👑👑 2 Golden Stars",
    oneTimeBonus: 300,
    salary15Day: 100,
  },
  {
    rank: "GOLD_3",
    labelEn: "Golden Broker 3",
    labelAr: "وسيط ذهبي 3",
    minTeamSize: 200,
    badge: "👑👑👑 3 Golden Stars",
    oneTimeBonus: 500,
    salary15Day: 200,
  },
  {
    rank: "PLATINUM_1",
    labelEn: "Platinum Broker 1",
    labelAr: "وسيط بلاتيني 1",
    minTeamSize: 400,
    badge: "💎 1 Platinum Star",
    oneTimeBonus: 1000,
    salary15Day: 300,
  },
  {
    rank: "PLATINUM_2",
    labelEn: "Platinum Broker 2",
    labelAr: "وسيط بلاتيني 2",
    minTeamSize: 600,
    badge: "💎💎 2 Platinum Stars",
    oneTimeBonus: 1500,
    salary15Day: 500,
  },
  {
    rank: "PLATINUM_3",
    labelEn: "Platinum Broker 3",
    labelAr: "وسيط بلاتيني 3",
    minTeamSize: 1000,
    badge: "💎💎💎 3 Platinum Stars",
    oneTimeBonus: 2000,
    salary15Day: 1000,
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

export function getTierLabel(
  tier: Pick<BrokerTierRow, "labelEn" | "labelAr">,
  locale: string
) {
  return locale === "ar" ? tier.labelAr : tier.labelEn;
}
