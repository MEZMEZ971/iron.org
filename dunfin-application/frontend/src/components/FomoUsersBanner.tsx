import { useEffect, useMemo, useRef } from "react";
import { useFomoUserCount } from "../context/FomoUserCountContext";
import { FOMO_BASELINE } from "../lib/fomoUserCount";
import { useLocale } from "../i18n/LocaleContext";
import { resolveTranslation } from "../i18n/translations";

type FomoUsersBannerVariant = "auth" | "hero";

const FOMO_FALLBACK_TEMPLATE = "{count} ACTIVE USERS TRADING LIVE NOW";

function LiveBeacon() {
  return (
    <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
    </span>
  );
}

function AnimatedCount({ value }: { value: number }) {
  const display = value.toLocaleString();
  const prevRef = useRef(display);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prevRef.current === display) return;
    prevRef.current = display;
    const node = nodeRef.current;
    if (!node) return;
    node.classList.remove("fomo-count-flip");
    void node.offsetWidth;
    node.classList.add("fomo-count-flip");
  }, [display]);

  return (
    <span
      ref={nodeRef}
      className="mx-1 inline-block min-w-[3.5ch] tabular-nums font-extrabold tracking-tight text-[#f0b90b]"
    >
      {display}
    </span>
  );
}

export function FomoUsersBanner({ variant = "auth" }: { variant?: FomoUsersBannerVariant }) {
  const { count } = useFomoUserCount();
  const { locale } = useLocale();

  const safeCount =
    Number.isFinite(count) && count >= FOMO_BASELINE ? count : FOMO_BASELINE;

  const template = useMemo(() => {
    const resolved = resolveTranslation(locale, "fomoBannerActiveUsers");
    if (resolved && resolved.includes("{count}") && resolved !== "fomoBannerActiveUsers") {
      return resolved;
    }
    return FOMO_FALLBACK_TEMPLATE;
  }, [locale]);

  const [before = "", after = ""] = template.split("{count}");
  const isHero = variant === "hero";

  return (
    <div
      data-testid="fomo-users-banner"
      className={`relative isolate block w-full overflow-visible opacity-100 visible ${
        isHero
          ? "rounded-2xl px-4 py-3.5"
          : "mb-5 rounded-xl px-3 py-3"
      } border border-[#f0b90b]/40 bg-[#0a0e1a] shadow-[0_0_15px_rgba(245,158,11,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md`}
      style={{ zIndex: 20 }}
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-r from-[#f0b90b]/10 via-transparent to-emerald-500/10"
        aria-hidden
      />
      <div
        className={`relative z-10 flex items-center gap-2.5 ${
          isHero ? "justify-center text-center" : "text-start"
        }`}
      >
        <LiveBeacon />
        <p
          className={`min-w-0 flex-1 font-semibold uppercase leading-snug tracking-wide text-white ${
            isHero ? "text-xs sm:text-sm" : "text-[11px] sm:text-xs"
          }`}
        >
          <span>{before}</span>
          <AnimatedCount value={safeCount} />
          <span>{after}</span>
        </p>
        <LiveBeacon />
      </div>
    </div>
  );
}
