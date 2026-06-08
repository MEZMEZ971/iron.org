import { useEffect, useState } from "react";

type Props = {
  /** Intensify halo / shake when parent card is hovered or pressed */
  active?: boolean;
  className?: string;
};

/**
 * Premium CSS 3D cyber vault — lockbox ledger visual (no external SVGA).
 */
export function AnimatedSafeBox({ active = false, className = "" }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center ${className}`}
      aria-hidden
    >
      <div
        className={`lockbox-safe-gleam relative h-[4.5rem] w-[4.5rem] rounded-xl ${
          mounted || active ? "lockbox-safe-mount" : ""
        } ${active ? "lockbox-safe-active" : ""}`}
        style={{
          boxShadow: "0 0 15px rgba(245, 158, 11, 0.2)",
        }}
      >
        {/* Vault body */}
        <div
          className="absolute inset-0 rounded-xl border-2 border-amber-600/50"
          style={{
            background:
              "linear-gradient(145deg, #1e293b 0%, #334155 35%, #475569 50%, #1e293b 100%)",
          }}
        />
        {/* Door frame */}
        <div className="absolute inset-[6px] rounded-lg border border-amber-500/40 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-inner">
          {/* Handle */}
          <div className="absolute left-1/2 top-[38%] h-5 w-5 -translate-x-1/2 rounded-full border-2 border-amber-400/80 bg-gradient-to-br from-amber-300 to-amber-700 shadow-[0_2px_6px_rgba(0,0,0,0.5)]" />
          {/* Dial */}
          <div className="absolute bottom-[18%] left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-teal-400/60 bg-slate-950">
            <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(0,212,170,0.8)]" />
          </div>
          {/* Hinge accents */}
          <div className="absolute left-1 top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-amber-500/50" />
          <div className="absolute right-1 top-1/3 h-2 w-0.5 rounded-full bg-amber-500/40" />
          <div className="absolute right-1 bottom-1/3 h-2 w-0.5 rounded-full bg-amber-500/40" />
        </div>
        {/* Top status LED */}
        <div className="absolute -top-1 left-1/2 flex -translate-x-1/2 gap-0.5">
          <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_4px_#00d4aa]" />
          <span className="h-1 w-1 rounded-full bg-amber-400 shadow-[0_0_4px_#f59e0b]" />
        </div>
      </div>
    </div>
  );
}
