import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DepositSelectors } from "../components/deposit/DepositSelectors";
import { DepositWalletCard } from "../components/deposit/DepositWalletCard";
import { useUser } from "../context/UserContext";
import { useDepositAddress } from "../hooks/useDepositAddress";
import { useUserProfile } from "../hooks/useUserProfile";
import { useLocale } from "../i18n/LocaleContext";
import type { DepositCurrency, DepositNetwork } from "../types/deposit";

export default function Deposit() {
  const { t, dir } = useLocale();
  const navigate = useNavigate();
  const rtl = dir === "rtl";
  const { userId } = useUser();
  const { profile, refresh: refreshProfile } = useUserProfile(userId);

  const [currency, setCurrency] = useState<DepositCurrency>("USDT");
  const [network, setNetwork] = useState<DepositNetwork>("TRC20");

  const { data: deposit, loading: addressLoading, error: addressError } =
    useDepositAddress(currency, network);

  const fund = profile?.fundAccount ?? 0;
  const trading = profile?.tradingAccount ?? 0;
  const total = fund + trading;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-df-strong text-df-muted transition-all duration-300 hover:border-[#f0b90b]/40"
          aria-label={t("back")}
        >
          {rtl ? "→" : "←"}
        </button>
        <h1 className="text-lg font-bold text-df">{t("deposit")}</h1>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <p className="text-center text-[10px] uppercase tracking-widest text-df-faint">
          {t("totalBalance")}
        </p>
        <p className="mt-1 text-center text-2xl font-bold text-[#f0b90b]">
          {total.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          <span className="text-sm text-df-muted">USDT</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-xl bg-df-inset py-2.5">
            <p className="text-df-faint">{t("fundAccount")}</p>
            <p className="mt-0.5 font-semibold text-[#00d4aa]">
              ${fund.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl bg-df-inset py-2.5">
            <p className="text-df-faint">{t("tradingAccount")}</p>
            <p className="mt-0.5 font-semibold text-[#f0b90b]">
              ${trading.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refreshProfile()}
          className="mt-3 w-full text-[10px] text-df-faint hover:text-[#f0b90b]"
        >
          {t("refreshBalance")}
        </button>
      </div>

      <DepositSelectors
        currency={currency}
        network={network}
        onCurrencyChange={setCurrency}
        onNetworkChange={setNetwork}
      />

      <DepositWalletCard
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
