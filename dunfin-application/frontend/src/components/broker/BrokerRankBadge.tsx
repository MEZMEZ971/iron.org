import type { BrokerProfileSnapshot } from "../../config/brokerProgram";
import {
  BROKER_RANK_NONE,
  getTierBadge,
  getTierByRank,
  getTierLabel,
} from "../../config/brokerProgram";
import { useLocale } from "../../i18n/LocaleContext";

type Props = {
  broker?: BrokerProfileSnapshot | null;
  compact?: boolean;
};

export function BrokerRankBadge({ broker, compact }: Props) {
  const { locale } = useLocale();

  if (!broker || broker.rank === BROKER_RANK_NONE || !broker.badge) {
    return null;
  }

  const tierRow = getTierByRank(broker.rank);
  const label = tierRow
    ? getTierLabel(tierRow, locale)
    : locale === "ar"
      ? broker.labelAr ?? broker.labelEn
      : locale === "it"
        ? broker.labelEn
        : broker.labelEn ?? broker.labelAr;
  const badge = tierRow ? getTierBadge(tierRow, locale) : broker.badge;

  if (compact) {
    return (
      <span
        className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#fcd535]/35 bg-[#1a1408]/80 px-2 py-0.5 text-[10px] font-semibold text-[#fcd535] shadow-sm shadow-amber-500/10"
        title={label ?? undefined}
      >
        <span aria-hidden>{badge.split(" ").slice(0, 2).join(" ")}</span>
      </span>
    );
  }

  return (
    <div className="inline-flex max-w-full flex-col gap-1 rounded-xl border border-[#fcd535]/30 bg-gradient-to-r from-[#121824] via-[#1a1408] to-[#121824] px-3 py-2 shadow-lg shadow-amber-500/10">
      <span className="text-base leading-none" aria-hidden>
        {badge}
      </span>
      <span className="text-[11px] font-semibold tracking-wide text-[#fcd535]">
        {label}
      </span>
    </div>
  );
}
