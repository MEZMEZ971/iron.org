import type { DepositCurrency, DepositNetwork } from "../../types/deposit";
import { DEPOSIT_CURRENCY_OPTIONS, DEPOSIT_NETWORK_OPTIONS } from "../../types/deposit";
import { useLocale } from "../../i18n/LocaleContext";

interface Props {
  currency: DepositCurrency;
  network: DepositNetwork;
  onCurrencyChange: (currency: DepositCurrency) => void;
  onNetworkChange: (network: DepositNetwork) => void;
  variant?: "default" | "h5";
}

function chipClass(active: boolean, variant: "default" | "h5") {
  if (variant === "h5") {
    return active
      ? "border-[#f0b90b] bg-[#f0b90b]/20 text-[#f0b90b] shadow-[0_0_16px_rgba(240,185,11,0.15)]"
      : "border-white/10 bg-white/5 text-slate-300 hover:border-[#f0b90b]/30 hover:text-white";
  }
  return active
    ? "border-[#f0b90b]/50 bg-[#f0b90b]/15 text-[#f0b90b] shadow-[inset_0_0_0_1px_rgba(240,185,11,0.2)]"
    : "border-df-strong bg-df-inset text-df-muted hover:border-[#f0b90b]/30 hover:text-df";
}

export function DepositSelectors({
  currency,
  network,
  onCurrencyChange,
  onNetworkChange,
  variant = "default",
}: Props) {
  const { t } = useLocale();
  const isH5 = variant === "h5";
  const panelClass = isH5
    ? "rounded-2xl border border-white/10 bg-white/5 p-4"
    : "glass-card rounded-2xl p-4";

  return (
    <div className={`${panelClass} space-y-4`}>
      <div>
        <p
          className={
            isH5
              ? "mb-2 text-xs font-medium text-slate-400"
              : "mb-2 text-xs font-medium text-df-muted"
          }
        >
          {t("selectCurrency")}
        </p>
        <div className="flex flex-wrap gap-2">
          {DEPOSIT_CURRENCY_OPTIONS.map((asset) => (
            <button
              key={asset}
              type="button"
              onClick={() => onCurrencyChange(asset)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition-all duration-300 ${chipClass(
                currency === asset,
                variant
              )}`}
            >
              {asset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p
          className={
            isH5
              ? "mb-2 text-xs font-medium text-slate-400"
              : "mb-2 text-xs font-medium text-df-muted"
          }
        >
          {t("selectNetwork")}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEPOSIT_NETWORK_OPTIONS.map((option) => {
            const active = network === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onNetworkChange(option.id)}
                className={`rounded-xl border px-3 py-3 text-start transition-all duration-300 ${chipClass(
                  active,
                  variant
                )}`}
              >
                <p className="text-sm font-bold">{t(option.titleKey)}</p>
                <p
                  className={
                    isH5
                      ? "mt-0.5 text-[10px] text-slate-400"
                      : "mt-0.5 text-[10px] text-df-faint"
                  }
                >
                  {t(option.subtitleKey)}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
