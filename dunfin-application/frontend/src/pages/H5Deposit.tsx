import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DepositSelectors } from "../components/deposit/DepositSelectors";
import { DepositWalletCard } from "../components/deposit/DepositWalletCard";
import { useH5Portfolio } from "../context/H5PortfolioContext";
import { useDepositAddress } from "../hooks/useDepositAddress";
import { useLocale } from "../i18n/LocaleContext";
import type { DepositCurrency, DepositNetwork } from "../types/deposit";

export default function H5Deposit() {
  const { t, dir } = useLocale();
  const navigate = useNavigate();
  const rtl = dir === "rtl";
  const {
    refresh,
    totalBalance,
    availableBalance,
    lockedBalance,
    loading,
  } = useH5Portfolio();

  const [currency, setCurrency] = useState<DepositCurrency>("USDT");
  const [network, setNetwork] = useState<DepositNetwork>("BEP20");

  const { data: deposit, loading: addressLoading, error: addressError } =
    useDepositAddress(currency, network);

  return (
    <div className="space-y-4 pb-4 text-white">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 text-slate-300"
          aria-label={t("back")}
        >
          {rtl ? "→" : "←"}
        </button>
        <h1 className="text-lg font-bold">{t("deposit")}</h1>
      </div>

      <div className="rounded-2xl bg-[#fdfcf0] p-4 text-center text-amber-950 dark:bg-white/5 dark:text-white">
        <p className="text-xs text-amber-900/70 dark:text-slate-400">
          {t("totalBalance")}
        </p>
        <p className="mt-1 font-mono text-2xl font-bold dark:text-[#fcd535]">
          {loading && totalBalance <= 0 && lockedBalance <= 0
            ? "—"
            : totalBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
          USDT
        </p>
        {!loading && lockedBalance > 0 && (
          <p className="mt-2 text-[10px] text-amber-800/80 dark:text-amber-300/90">
            {t("h5AvailableBalance")}:{" "}
            {availableBalance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            · {t("h5LockedStrategyCapital")}:{" "}
            {lockedBalance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        )}
        <button
          type="button"
          onClick={() => refresh()}
          className="mt-2 text-[10px] text-amber-800/70 dark:text-slate-500"
        >
          {t("refreshBalance")}
        </button>
      </div>

      <DepositSelectors
        variant="h5"
        currency={currency}
        network={network}
        onCurrencyChange={setCurrency}
        onNetworkChange={setNetwork}
      />

      <DepositWalletCard
        variant="h5"
        currency={currency}
        network={network}
        address={deposit?.depositAddress ?? ""}
        loading={addressLoading}
        error={addressError}
        networkLabel={deposit?.networkLabel ?? network}
      />
    </div>
  );
}
