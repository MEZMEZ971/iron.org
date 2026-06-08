import { useRef, type RefObject } from "react";
import type { StrategyCard } from "../api/client";
import { StrategyTierCard } from "../components/StrategyTierCard";
import { useSuccessFeedback } from "../context/SuccessFeedbackContext";
import { useLocale } from "../i18n/LocaleContext";

export interface StrategiesPanelProps {
  strategies: StrategyCard[];
  activeStrategyId: number | null;
  walletBalance: number;
  executeSectionRef?: RefObject<HTMLDivElement | null>;
}

/**
 * Dynamic 6-tier strategy matrix (read-only eligibility preview).
 */
export default function Strategies({
  strategies,
  activeStrategyId,
  executeSectionRef,
}: StrategiesPanelProps) {
  const { t } = useLocale();
  const { showStrategyLockedNotice } = useSuccessFeedback();
  const localExecuteRef = useRef<HTMLDivElement | null>(null);

  function handleSelect(strategy: StrategyCard) {
    if (!strategy.unlocked) {
      showStrategyLockedNotice();
      return;
    }

    const scrollTarget = executeSectionRef?.current ?? localExecuteRef.current;
    scrollTarget?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-bold text-df">{t("strategyTiers")}</h2>
        <p className="mt-0.5 text-[10px] text-df-faint">{t("strategyTiersDesc")}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {strategies.map((s) => (
          <StrategyTierCard
            key={s.id}
            strategy={s}
            isActive={activeStrategyId === s.id}
            onSelect={() => handleSelect(s)}
          />
        ))}
      </div>
      <div ref={localExecuteRef} className="sr-only" aria-hidden />
    </section>
  );
}
