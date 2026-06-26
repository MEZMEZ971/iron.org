import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  fetchWheelStatus,
  spinLuckyWheel,
  type SpinWheelResult,
  type WheelStatusResult,
} from "../../api/client";
import {
  rotationForPrizeIndex,
  WHEEL_GRAND_SLICE_INDEX,
  WHEEL_PRIZE_KEYS,
  WHEEL_SLICE_COUNT,
  WHEEL_SLICE_DEG,
} from "../../config/luckyWheel";
import { useH5Portfolio } from "../../context/H5PortfolioContext";
import { useLocale } from "../../i18n/LocaleContext";
import { isRtlLocale } from "../../i18n/locales";
import { emitWalletRefresh } from "../../lib/walletSync";
import { useUser } from "../../context/UserContext";

const SPIN_MS = 5000;
const SPIN_EASING = "cubic-bezier(0.25, 0.1, 0.25, 1)";
const WHEEL_SIZE = 256;
const CX = 100;
const CY = 100;
const OUTER_R = 96;
const INNER_R = 28;

const SEGMENT_TEXT_COLORS = [
  "#e8ecf0",
  "#141820",
  "#f5e6c8",
  "#e8ecf0",
  "#141820",
  "#fef3c7",
  "#e8ecf0",
  "#fcd535",
] as const;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeWedge(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
) {
  const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LuckyWheelModal({ open, onClose }: Props) {
  const { t, locale } = useLocale();
  const { userId } = useUser();
  const h5Portfolio = useH5Portfolio();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [win, setWin] = useState<SpinWheelResult | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [wheelStatus, setWheelStatus] = useState<WheelStatusResult | null>(null);
  const wheelDiscRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const pendingWinRef = useRef<SpinWheelResult | null>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetMotion = useCallback(() => {
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    rotationRef.current = 0;
    setRotation(0);
    setSpinning(false);
    setAnimating(false);
    setShowWin(false);
    setWin(null);
    pendingWinRef.current = null;
    setError(null);
    setWheelStatus(null);
  }, []);

  useEffect(() => {
    if (!open) resetMotion();
  }, [open, resetMotion]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchWheelStatus()
      .then((status) => {
        if (!cancelled) setWheelStatus(status);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  function finishSpin(prize: SpinWheelResult) {
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    pendingWinRef.current = null;
    setSpinning(false);
    setAnimating(false);
    setWin(prize);
    setShowWin(true);
    setWheelStatus((prev) =>
      prev ? { ...prev, spinsRemaining: prize.spinsRemaining, canSpin: false } : prev
    );
    emitWalletRefresh({
      userId,
      walletBalance: prize.walletBalance,
    });
    void h5Portfolio.refresh({ skipChainSync: true });
  }

  function handleWheelTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== "transform") return;
    if (!animating || !pendingWinRef.current) return;
    finishSpin(pendingWinRef.current);
  }

  function startWheelAnimation(targetDegrees: number) {
    const disc = wheelDiscRef.current;
    const fromDegrees = rotationRef.current;

    if (disc) {
      disc.style.transition = "none";
      disc.style.transform = `rotate(${fromDegrees}deg)`;
    }
    setRotation(fromDegrees);
    void disc?.offsetHeight;

    setAnimating(true);
    setSpinning(true);

    requestAnimationFrame(() => {
      rotationRef.current = targetDegrees;
      if (disc) {
        disc.style.transition = `transform ${SPIN_MS}ms ${SPIN_EASING}`;
        disc.style.transform = `rotate(${targetDegrees}deg)`;
      }
      setRotation(targetDegrees);
    });

    spinTimerRef.current = setTimeout(() => {
      if (!pendingWinRef.current) return;
      finishSpin(pendingWinRef.current);
    }, SPIN_MS + 120);
  }

  async function handleSpin() {
    if (spinning || animating) return;
    if (wheelStatus && !wheelStatus.canSpin) return;

    setError(null);
    setShowWin(false);
    setWin(null);

    try {
      const result = await spinLuckyWheel();
      const targetDegrees = rotationForPrizeIndex(
        result.prizeIndex,
        rotationRef.current
      );
      pendingWinRef.current = result;
      startWheelAnimation(targetDegrees);
    } catch (e) {
      setSpinning(false);
      setAnimating(false);
      pendingWinRef.current = null;
      if (e instanceof ApiError) {
        if (e.code === "SPIN_ALREADY_USED") {
          setError(
            t(isRtlLocale(locale) ? "h5SpinLimitAr" : "h5SpinLimitEn")
          );
          setWheelStatus((prev) =>
            prev ? { ...prev, spinsRemaining: 0, canSpin: false } : prev
          );
        } else if (e.code === "NOT_FUNDED" || e.code === "DEPOSIT_REQUIRED_TO_SPIN") {
          setError(
            e.code === "DEPOSIT_REQUIRED_TO_SPIN" && e.errorAr && isRtlLocale(locale)
              ? e.errorAr
              : t(
                  e.code === "DEPOSIT_REQUIRED_TO_SPIN"
                    ? "h5SpinDepositRequired"
                    : "h5SpinNotFunded"
                )
          );
          setWheelStatus((prev) =>
            prev
              ? {
                  ...prev,
                  hasRealDeposit: false,
                  depositRequired: true,
                  canSpin: false,
                }
              : prev
          );
        } else {
          setError(e.message);
        }
      } else {
        setError(e instanceof Error ? e.message : t("h5SpinFailed"));
      }
    }
  }

  function spinsRemainingLabel() {
    const count = wheelStatus?.spinsRemaining ?? 1;
    if (count <= 0) return t("h5WheelSpinsRemainingZero");
    if (count === 1) return t("h5WheelSpinsRemainingOne");
    return t("h5WheelSpinsRemainingMany", { count: String(count) });
  }

  const spinBlocked =
    spinning ||
    animating ||
    (wheelStatus !== null && !wheelStatus.canSpin);

  const depositLocked = wheelStatus?.depositRequired === true;

  if (!open) return null;

  const winLabel = win?.label ?? (win ? `${win.amount} ${win.type}` : "");
  const rimDots = Array.from({ length: WHEEL_SLICE_COUNT * 3 }, (_, i) => i);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="lucky-wheel-title"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-[#3d4454]/80 bg-gradient-to-b from-[#0f131c] via-[#121824] to-[#080b12] p-5 text-white shadow-2xl shadow-black/50">
        <button
          type="button"
          onClick={onClose}
          disabled={spinning || animating}
          className="absolute end-3 top-3 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          aria-label={t("h5Close")}
        >
          <i className="fa-solid fa-xmark" aria-hidden />
        </button>

        <h2
          id="lucky-wheel-title"
          className="pe-8 text-center text-lg font-bold tracking-wide text-[#e8c547]"
        >
          {t("h5LuckyWheelTitle")}
        </h2>

        <div className="relative mx-auto mt-6 h-64 w-64">
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-0.5"
            aria-hidden
          >
            <div className="h-0 w-0 border-x-[12px] border-b-[20px] border-x-transparent border-b-[#d4af37] drop-shadow-[0_3px_10px_rgba(212,175,55,0.55)]" />
          </div>

          <div
            className="absolute inset-0 rounded-full border-[3px] border-[#4a5060] bg-[#1a1f2a] shadow-[0_0_28px_rgba(212,175,55,0.12),inset_0_0_20px_rgba(0,0,0,0.6)]"
            aria-hidden
          >
            {rimDots.map((i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 block h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f0b90b]/90 shadow-[0_0_6px_rgba(240,185,11,0.85)]"
                style={{
                  transform: `rotate(${(360 / rimDots.length) * i}deg) translateY(-${WHEEL_SIZE / 2 - 6}px)`,
                }}
              />
            ))}
          </div>

          <div
            ref={wheelDiscRef}
            className="absolute inset-[6px] rounded-full will-change-transform"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: animating
                ? `transform ${SPIN_MS}ms ${SPIN_EASING}`
                : "none",
            }}
            onTransitionEnd={handleWheelTransitionEnd}
          >
            <svg
              viewBox="0 0 200 200"
              className="h-full w-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
              aria-hidden
            >
              <defs>
                <linearGradient id="wheelCharcoal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#161b26" />
                  <stop offset="100%" stopColor="#0e121a" />
                </linearGradient>
                <linearGradient id="wheelSilver" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#b8bec8" />
                  <stop offset="50%" stopColor="#8f96a3" />
                  <stop offset="100%" stopColor="#6b7280" />
                </linearGradient>
                <linearGradient id="wheelBronze" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8a6a42" />
                  <stop offset="100%" stopColor="#5c4528" />
                </linearGradient>
                <linearGradient id="wheelGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fcd535" />
                  <stop offset="100%" stopColor="#b8860b" />
                </linearGradient>
                <radialGradient id="wheelGrandGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#2a2010" />
                  <stop offset="100%" stopColor="#121824" />
                </radialGradient>
              </defs>

              {WHEEL_PRIZE_KEYS.map((prizeKey, index) => {
                const start = index * WHEEL_SLICE_DEG;
                const end = start + WHEEL_SLICE_DEG;
                const isGrand = index === WHEEL_GRAND_SLICE_INDEX;
                const fillId =
                  index % 4 === 1
                    ? "wheelSilver"
                    : index % 4 === 2
                      ? "wheelBronze"
                      : index % 4 === 3
                        ? "wheelGold"
                        : isGrand
                          ? "wheelGrandGlow"
                          : "wheelCharcoal";
                const path = describeWedge(CX, CY, OUTER_R, INNER_R, start, end);
                const mid = start + WHEEL_SLICE_DEG / 2;
                const labelPos = polarToCartesian(CX, CY, 62, mid);
                const label = t(prizeKey);

                return (
                  <g key={prizeKey}>
                    <path
                      d={path}
                      fill={isGrand ? "url(#wheelGrandGlow)" : `url(#${fillId})`}
                      stroke={isGrand ? "#fcd535" : "rgba(0,0,0,0.35)"}
                      strokeWidth={isGrand ? 2.2 : 0.6}
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      fill={SEGMENT_TEXT_COLORS[index]}
                      fontSize={isGrand ? 7.5 : 8.5}
                      fontWeight={600}
                      letterSpacing="0.08em"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${mid}, ${labelPos.x}, ${labelPos.y})`}
                      style={{ fontFamily: "system-ui, sans-serif" }}
                    >
                      {isGrand ? (
                        <>
                          <tspan x={labelPos.x} dy="-0.35em">
                            GRAND
                          </tspan>
                          <tspan x={labelPos.x} dy="1.1em" fontSize={7}>
                            USDT 100
                          </tspan>
                        </>
                      ) : (
                        label
                      )}
                    </text>
                    {isGrand && (
                      <text
                        x={polarToCartesian(CX, CY, 48, mid).x}
                        y={polarToCartesian(CX, CY, 48, mid).y}
                        fill="#fcd535"
                        fontSize={10}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${mid}, ${polarToCartesian(CX, CY, 48, mid).x}, ${polarToCartesian(CX, CY, 48, mid).y})`}
                      >
                        $
                      </text>
                    )}
                  </g>
                );
              })}

              <circle
                cx={CX}
                cy={CY}
                r={INNER_R + 1}
                fill="none"
                stroke="rgba(212,175,55,0.35)"
                strokeWidth={1}
              />
            </svg>
          </div>

          <button
            type="button"
            onClick={handleSpin}
            disabled={spinBlocked}
            className={`absolute left-1/2 top-1/2 z-40 flex h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border text-[12px] font-bold tracking-wider transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-55 ${
              depositLocked
                ? "border-white/20 bg-slate-700/90 text-white"
                : "border-[#fef08a]/40 bg-[radial-gradient(circle_at_30%_25%,#fff7c2_0%,#fcd535_35%,#d4a017_70%,#8a6508_100%)] text-[#1a1208] shadow-[0_0_24px_rgba(252,213,53,0.55),0_4px_16px_rgba(0,0,0,0.45)]"
            }`}
          >
            {depositLocked ? (
              <i className="fa-solid fa-lock text-lg" aria-hidden />
            ) : spinning || animating ? (
              t("h5Spinning")
            ) : (
              t("h5Spin")
            )}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-[10px] leading-snug backdrop-blur-sm">
          <p className="shrink-0 font-medium text-slate-400">{spinsRemainingLabel()}</p>
          <p className="text-end text-slate-300">{t("h5WheelFooterPromo")}</p>
        </div>

        {depositLocked && (
          <div
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs text-slate-200"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <i className="fa-solid fa-lock text-sm text-white" aria-hidden />
            </span>
            <p className="leading-snug">{t("h5SpinDepositRequired")}</p>
          </div>
        )}

        {error && (
          <p className="mt-3 text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        )}

        {showWin && win && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
            <div className="text-center">
              <i
                className="fa-solid fa-coins mb-3 text-4xl text-[#fcd535] animate-bounce"
                aria-hidden
              />
              <p className="text-sm font-semibold tracking-wide text-amber-200/90">
                {t("h5Congratulations")}
              </p>
              <p className="mt-1 text-lg font-bold text-white">{t("h5YouWon")}</p>
              <p className="mt-2 text-2xl font-black tracking-wider text-[#fcd535]">
                {winLabel}
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowWin(false);
                  onClose();
                }}
                className="mt-6 rounded-full border border-[#fcd535]/40 bg-gradient-to-r from-[#b8860b] via-[#f0b90b] to-[#fcd535] px-8 py-2.5 text-sm font-bold tracking-wide text-[#0a0e1a] shadow-lg shadow-amber-500/20"
              >
                {t("h5ClaimReward")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
