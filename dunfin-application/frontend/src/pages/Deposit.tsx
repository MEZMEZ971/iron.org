import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CopyAddressBox } from "../components/deposit/CopyAddressBox";
import { DepositQrCode } from "../components/deposit/DepositQrCode";
import { useUser } from "../context/UserContext";
import { useDepositAddress } from "../hooks/useDepositAddress";
import { useUserProfile } from "../hooks/useUserProfile";
import { useLocale } from "../i18n/LocaleContext";
import {
  CURRENCY_OPTIONS,
  NETWORK_OPTIONS,
  QUICK_AMOUNTS,
  type DepositCurrency,
  type DepositNetwork,
} from "../types/deposit";

export default function Deposit() {
  const { t, dir } = useLocale();
  const navigate = useNavigate();
  const rtl = dir === "rtl";
  const { userId } = useUser();
  const { profile, refresh: refreshProfile } = useUserProfile(userId);

  const [currency, setCurrency] = useState<DepositCurrency>("USDT");
  const [network, setNetwork] = useState<DepositNetwork>("ERC20");
  const [networkOpen, setNetworkOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const { data: deposit, loading: addressLoading, error: addressError } =
    useDepositAddress(userId, network);

  const fund = profile?.fundAccount ?? 0;
  const trading = profile?.tradingAccount ?? 0;
  const total = fund + trading;

  const activeNetwork = NETWORK_OPTIONS.find((n) => n.id === network);

  const amountHint = useMemo(() => {
    if (!selectedAmount) return null;
    return `${selectedAmount} ${currency}`;
  }, [selectedAmount, currency]);

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
          {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
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

      <div className="relative">
        <label className="mb-1.5 block text-xs font-medium text-df-muted">
          {t("selectCurrency")}
        </label>
        <button
          type="button"
          onClick={() => {
            setCurrencyOpen((o) => !o);
            setNetworkOpen(false);
          }}
          className="glass-card flex w-full items-center justify-between rounded-xl px-4 py-3 text-start transition focus:border-[#f0b90b]/50 focus:ring-2 focus:ring-[#f0b90b]/20"
        >
          <span className="font-semibold text-df">{currency}</span>
          <span className="text-df-faint">▾</span>
        </button>
        {currencyOpen && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-df bg-df-dropdown shadow-xl">
            {CURRENCY_OPTIONS.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrency(c);
                    setCurrencyOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-start text-sm transition hover:bg-df-hover ${
                    currency === c ? "bg-[#f0b90b]/15 text-[#f0b90b]" : "text-df"
                  }`}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative">
        <label className="mb-1.5 block text-xs font-medium text-df-muted">
          {t("selectNetwork")}
        </label>
        <button
          type="button"
          onClick={() => {
            setNetworkOpen((o) => !o);
            setCurrencyOpen(false);
          }}
          className="glass-card flex w-full items-center justify-between rounded-xl px-4 py-3 text-start ring-1 ring-transparent transition focus:border-[#f0b90b]/50 focus:ring-[#f0b90b]/30"
        >
          <div>
            <p className="font-semibold text-df">
              {activeNetwork ? t(activeNetwork.titleKey) : network}
            </p>
            <p className="text-[10px] text-df-faint">
              {activeNetwork ? t(activeNetwork.subtitleKey) : ""}
            </p>
          </div>
          <span className="text-[#f0b90b]">▾</span>
        </button>
        {networkOpen && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[#f0b90b]/20 bg-df-dropdown shadow-xl backdrop-blur-md">
            {NETWORK_OPTIONS.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setNetwork(n.id);
                    setNetworkOpen(false);
                  }}
                  className={`w-full border-b border-df px-4 py-3 text-start last:border-0 transition hover:bg-[#f0b90b]/10 ${
                    network === n.id ? "bg-[#f0b90b]/15" : ""
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      network === n.id ? "text-[#f0b90b]" : "text-df"
                    }`}
                  >
                    {t(n.titleKey)}
                  </p>
                  <p className="text-[10px] text-df-muted">{t(n.subtitleKey)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-df-muted">{t("fastRecharge")}</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setSelectedAmount(amt)}
              className={`rounded-xl py-3 text-sm font-bold transition-all duration-300 ${
                selectedAmount === amt
                  ? "btn-golden-glow bg-gradient-to-b from-[#f0b90b] to-[#d4a008] text-[#0a0e1a] shadow-md shadow-[#f0b90b]/25"
                  : "glass-card text-df hover:border-[#f0b90b]/30 hover:shadow-[0_0_12px_rgba(240,185,11,0.25)]"
              }`}
            >
              {amt} USDT
            </button>
          ))}
        </div>
        {amountHint && (
          <p className="mt-2 text-center text-[10px] text-[#f0b90b]/80">
            {t("suggestedDeposit")}: {amountHint}
          </p>
        )}
      </div>

      <div className="glass-card space-y-4 rounded-2xl p-4">
        <p className="text-center text-xs text-df-muted">{t("scanToDeposit")}</p>

        <div className="flex flex-col items-center gap-4">
          <DepositQrCode
            value={deposit?.depositAddress ?? ""}
            loading={addressLoading}
          />
          <CopyAddressBox
            address={deposit?.depositAddress ?? ""}
            loading={addressLoading}
          />
        </div>

        {deposit?.new && (
          <p className="text-center text-[10px] text-[#00d4aa]">{t("forwarderCreated")}</p>
        )}
        {addressError && (
          <p className="text-center text-xs text-red-400" role="alert">
            {addressError}
          </p>
        )}
        <p className="text-center text-[10px] leading-relaxed text-df-faint">
          {t("depositWarning")} ({deposit?.networkLabel ?? network})
        </p>
      </div>
    </div>
  );
}
