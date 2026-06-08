import {
  clampStrategyTierId,
  getStrategyStarConfig,
  getStrategyTierName,
} from "../lib/strategyTiers";
import { useLocale } from "../i18n/LocaleContext";

type Size = "sm" | "md";

interface Props {
  tierId: number | null | undefined;
  size?: Size;
  showLabel?: boolean;
  className?: string;
}

export function StrategyStarBadge({
  tierId,
  size = "sm",
  showLabel = false,
  className = "",
}: Props) {
  const { locale } = useLocale();
  const id = clampStrategyTierId(tierId);
  const config = getStrategyStarConfig(id);
  const iconSize = size === "md" ? "text-sm" : "text-[10px]";
  const crownSize = size === "md" ? "text-xs" : "text-[10px]";

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={getStrategyTierName(id, locale)}
      aria-label={getStrategyTierName(id, locale)}
    >
      <span className={`inline-flex items-center gap-px ${iconSize}`}>
        {Array.from({ length: config.starCount }).map((_, i) => (
          <i
            key={i}
            className={`fa-solid fa-star ${config.starClassName} ${
              config.pulseStars ? "animate-pulse" : ""
            }`}
            aria-hidden
          />
        ))}
        {config.showCrown && (
          <i
            className={`fa-solid fa-crown ms-0.5 ${config.starClassName} ${crownSize}`}
            aria-hidden
          />
        )}
      </span>
      {showLabel && (
        <span className="text-[10px] font-semibold text-df-muted">
          {getStrategyTierName(id, locale)}
        </span>
      )}
    </span>
  );
}
