import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, spinLuckyWheel, type SpinWheelResult } from "../../api/client";
import { useH5Portfolio } from "../../context/H5PortfolioContext";
import { useLocale } from "../../i18n/LocaleContext";
import { emitWalletRefresh } from "../../lib/walletSync";
import { useUser } from "../../context/UserContext";

const WEDGE_PRIZE_KEYS = [
  "h5WheelPrize0",
  "h5WheelPrize1",
  "h5WheelPrize2",
  "h5WheelPrize3",
  "h5WheelPrize4",
  "h5WheelPrize5",
] as const;

const WEDGE_GRADIENTS = [
  "from-rose-500 to-orange-500",
  "from-violet-500 to-fuchsia-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-400 to-yellow-500",
  "from-[#f0b90b] to-amber-700",
];

const SPIN_MS = 5000;

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
  const [error, setError] = useState<string | null>(null);
  const [win, setWin] = useState<SpinWheelResult | null>(null);
  const [showWin, setShowWin] = useState(false);
  const pendingWinRef = useRef<SpinWheelResult | null>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetMotion = useCallback(() => {
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    setRotation(0);
    setSpinning(false);
    setShowWin(false);
    setWin(null);
    pendingWinRef.current = null;
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) resetMotion();
  }, [open, resetMotion]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  function handleWheelTransitionEnd() {
    if (!spinning || !pendingWinRef.current) return;
    const prize = pendingWinRef.current;
    pendingWinRef.current = null;
    setSpinning(false);
    setWin(prize);
    setShowWin(true);
    emitWalletRefresh({
      userId,
      walletBalance: prize.walletBalance,
    });
    void h5Portfolio.refresh({ skipChainSync: true });
  }

  async function handleSpin() {
    if (spinning) return;
    setError(null);
    setShowWin(false);
    setWin(null);
    setSpinning(true);

    try {
      const result = await spinLuckyWheel();
      const degrees = 3600 + result.prizeIndex * 60;
      pendingWinRef.current = result;
      setRotation(degrees);

      spinTimerRef.current = setTimeout(() => {
        if (!pendingWinRef.current) return;
        const prize = pendingWinRef.current;
        pendingWinRef.current = null;
        setSpinning(false);
        setWin(prize);
        setShowWin(true);
        emitWalletRefresh({
          userId,
          walletBalance: prize.walletBalance,
        });
        void h5Portfolio.refresh({ skipChainSync: true });
      }, SPIN_MS + 80);
    } catch (e) {
      setSpinning(false);
      pendingWinRef.current = null;
      if (e instanceof ApiError) {
        if (e.code === "SPIN_ALREADY_USED") {
          setError(
            locale === "ar" ? t("h5SpinLimitAr") : t("h5SpinLimitEn")
          );
        } else if (e.code === "NOT_FUNDED") {
          setError(t("h5SpinNotFunded"));
        } else {
          setError(e.message);
        }
      } else {
        setError(e instanceof Error ? e.message : "Spin failed");
      }
    }
  }

  if (!open) return null;

  const winLabel =
    win?.label ??
    (win
      ? `${win.amount} ${win.type}`
      : "");

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="lucky-wheel-title"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-b from-slate-900 via-[#121820] to-[#0a0e1a] p-5 text-white shadow-2xl shadow-amber-500/10">
        <button
          type="button"
          onClick={onClose}
          disabled={spinning}
          className="absolute end-3 top-3 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          aria-label={t("h5Close")}
        >
          <i className="fa-solid fa-xmark" aria-hidden />
        </button>

        <h2
          id="lucky-wheel-title"
          className="pe-8 text-center text-lg font-bold text-[#f0b90b]"
        >
          {t("h5LuckyWheelTitle")}
        </h2>

        <div className="relative mx-auto mt-6 h-64 w-64">
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1"
            aria-hidden
          >
            <div className="h-0 w-0 border-x-[14px] border-b-[22px] border-x-transparent border-b-[#f0b90b] drop-shadow-[0_2px_8px_rgba(240,185,11,0.6)]" />
          </div>

          <div
            className="relative h-full w-full rounded-full border-4 border-[#f0b90b]/50 shadow-[inset_0_0_24px_rgba(0,0,0,0.45)]"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? `transform ${SPIN_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`
                : "none",
            }}
            onTransitionEnd={handleWheelTransitionEnd}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(
                  #f43f5e 0deg 60deg,
                  #8b5cf6 60deg 120deg,
                  #06b6d4 120deg 180deg,
                  #10b981 180deg 240deg,
                  #f59e0b 240deg 300deg,
                  #d97706 300deg 360deg
                )`,
              }}
            />
            {WEDGE_PRIZE_KEYS.map((prizeKey, i) => (
              <div
                key={prizeKey}
                className="pointer-events-none absolute left-1/2 top-1/2 h-1/2 w-[42%] origin-bottom -translate-x-1/2"
                style={{ transform: `rotate(${i * 60 + 30}deg)` }}
              >
                <span
                  className={`absolute left-1/2 top-3 w-full -translate-x-1/2 bg-gradient-to-r ${WEDGE_GRADIENTS[i]} bg-clip-text text-center text-[9px] font-extrabold leading-tight text-transparent drop-shadow-sm`}
                  style={{ transform: "rotate(-90deg)" }}
                >
                  {t(prizeKey)}
                </span>
              </div>
            ))}
            <div className="absolute inset-[18%] rounded-full bg-[#0a0e1a]/90 ring-2 ring-[#f0b90b]/30" />
          </div>

          <button
            type="button"
            onClick={handleSpin}
            disabled={spinning}
            className="absolute left-1/2 top-1/2 z-30 flex h-[4.25rem] w-[4.25rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#fcd535] via-[#f0b90b] to-[#c99400] text-[11px] font-black text-[#1a1208] shadow-lg shadow-amber-500/40 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {spinning ? t("h5Spinning") : t("h5Spin")}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        )}

        {showWin && win && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/75 p-6 backdrop-blur-sm">
            <div className="text-center">
              <i
                className="fa-solid fa-gift mb-3 text-4xl text-[#f0b90b] animate-bounce"
                aria-hidden
              />
              <p className="text-sm font-semibold text-amber-200/90">
                {t("h5Congratulations")}
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {t("h5YouWon")}
              </p>
              <p className="mt-2 text-2xl font-black text-[#fcd535]">
                {winLabel}
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowWin(false);
                  onClose();
                }}
                className="mt-6 rounded-full bg-gradient-to-r from-[#f0b90b] to-[#fcd535] px-8 py-2.5 text-sm font-bold text-[#0a0e1a]"
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
