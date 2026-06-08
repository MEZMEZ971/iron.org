import { useEffect } from "react";
import type { DepositCurrency, DepositNetwork } from "../../types/deposit";
import { useLocale } from "../../i18n/LocaleContext";

const NETWORK_META: Record<
  DepositNetwork,
  { arrivalMin: number; minTopUp: string; iconClass: string }
> = {
  TRC20: { arrivalMin: 1, minTopUp: "0", iconClass: "fa-bolt text-red-500" },
  BEP20: { arrivalMin: 0, minTopUp: "0", iconClass: "fa-cube text-[#f0b90b]" },
  ERC20: { arrivalMin: 3, minTopUp: "10", iconClass: "fa-ethereum text-indigo-400" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  currency: DepositCurrency;
  onCurrencyChange: (c: DepositCurrency) => void;
  network: DepositNetwork;
  onNetworkChange: (n: DepositNetwork) => void;
}

export function SelectMainnetSheet({
  open,
  onClose,
  currency,
  onCurrencyChange,
  network,
  onNetworkChange,
}: Props) {
  const { t } = useLocale();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col justify-end transition-opacity duration-300 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label={t("close")}
      />

      <div
        className={`relative mx-auto w-full max-w-md rounded-t-3xl bg-white px-4 pb-8 pt-4 text-slate-900 shadow-2xl transition-transform duration-300 ease-out dark:bg-[#1a1f2e] dark:text-white ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex-1 text-center text-base font-bold">
            {t("h5SelectMainnet")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label={t("close")}
          >
            ×
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          {(["USDC", "USDT"] as DepositCurrency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onCurrencyChange(c)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                currency === c
                  ? "bg-gradient-to-r from-[#f0b90b] to-[#d4a008] text-[#0a0e1a]"
                  : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto">
          {(["TRC20", "BEP20", "ERC20"] as DepositNetwork[]).map((n) => {
            const meta = NETWORK_META[n];
            const selected = network === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onNetworkChange(n)}
                className={`relative w-full rounded-2xl border-2 p-4 text-start transition ${
                  selected
                    ? "border-[#f0b90b] bg-[#f0b90b]/5"
                    : "border-slate-200 dark:border-white/10"
                }`}
              >
                {selected && (
                  <span className="absolute end-3 top-3 text-[#f0b90b]">
                    <i className="fa-solid fa-circle-check" aria-hidden />
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <i className={`fa-solid ${meta.iconClass} text-xl`} aria-hidden />
                  <div>
                    <p className="font-bold">
                      {t(
                        n === "TRC20"
                          ? "networkTrc20"
                          : n === "BEP20"
                            ? "networkBep20"
                            : "networkErc20"
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t("h5EstimatedArrival")} ≈ {meta.arrivalMin} {t("h5Minutes")}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("h5MinTopUp")} ≥ {meta.minTopUp} {currency}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-golden-glow mt-5 w-full rounded-full bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] py-3.5 text-sm font-bold text-[#0a0e1a]"
        >
          {t("h5Ok")}
        </button>
      </div>
    </div>
  );
}
