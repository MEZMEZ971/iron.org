import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { postDepositIntent } from "../api/client";
import { CopyAddressBox } from "../components/deposit/CopyAddressBox";
import { DepositQrCode } from "../components/deposit/DepositQrCode";
import { SelectMainnetSheet } from "../components/h5/SelectMainnetSheet";
import { useUser } from "../context/UserContext";
import { useDepositAddress } from "../hooks/useDepositAddress";
import { useH5Portfolio } from "../context/H5PortfolioContext";
import { useLocale } from "../i18n/LocaleContext";
import {
  MIN_DEPOSIT_USDT,
  QUICK_AMOUNTS,
  type DepositCurrency,
  type DepositNetwork,
} from "../types/deposit";

function depositCurrencyTag(currency: DepositCurrency, network: DepositNetwork) {
  return `${currency}_${network}`;
}

export default function H5Deposit() {
  const { t, dir } = useLocale();
  const navigate = useNavigate();
  const rtl = dir === "rtl";
  const { userId } = useUser();
  const { earningsView, refresh } = useH5Portfolio();

  const [currency, setCurrency] = useState<DepositCurrency>("USDT");
  const [network, setNetwork] = useState<DepositNetwork>("TRC20");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [isAddressGenerated, setIsAddressGenerated] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  const { data: deposit, loading: addressLoading, error: addressError } =
    useDepositAddress(userId, network, isAddressGenerated);

  useEffect(() => {
    setIsAddressGenerated(false);
    setAmountError(null);
  }, [network, currency]);

  const parsedAmount = parseFloat(depositAmount);
  const selectedQuick =
    Number.isFinite(parsedAmount) &&
    QUICK_AMOUNTS.includes(parsedAmount as (typeof QUICK_AMOUNTS)[number])
      ? parsedAmount
      : null;

  function handleConfirmGenerate() {
    const amount = parseFloat(depositAmount);
    if (!Number.isFinite(amount) || amount < MIN_DEPOSIT_USDT) {
      setAmountError(t("h5DepositMinError"));
      return;
    }
    setAmountError(null);
    setIsAddressGenerated(true);

    postDepositIntent({
      amount,
      currency: depositCurrencyTag(currency, network),
    }).catch(() => {
      /* non-blocking audit log */
    });
  }

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

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-start"
      >
        <div>
          <p className="text-[10px] text-slate-400">{t("h5SelectProduct")}</p>
          <p className="font-semibold">
            {currency} ·{" "}
            {t(
              network === "TRC20"
                ? "networkTrc20"
                : network === "BEP20"
                  ? "networkBep20"
                  : "networkErc20",
            )}
          </p>
        </div>
        <span className="text-[#f0b90b]">▾</span>
      </button>

      <div className="rounded-2xl bg-[#fdfcf0] p-4 text-center text-amber-950">
        <p className="text-xs text-amber-900/70">{t("totalBalance")}</p>
        <p className="mt-1 font-mono text-2xl font-bold">
          {earningsView.accountBalance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          USDT
        </p>
        <button
          type="button"
          onClick={() => refresh()}
          className="mt-2 text-[10px] text-amber-800/70"
        >
          {t("refreshBalance")}
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs text-slate-400">{t("h5FastRecharge")}</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                setDepositAmount(String(amt));
                setAmountError(null);
              }}
              className={`rounded-xl border py-3 text-sm font-bold transition-colors ${
                selectedQuick === amt
                  ? "border-[#f0b90b] bg-[#f0b90b]/25 text-[#f0b90b]"
                  : "border-[#f0b90b]/30 bg-[#f0b90b]/10 text-[#f0b90b]"
              }`}
            >
              {amt} USDT
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <label
          htmlFor="deposit-amount"
          className="mb-2 block text-xs font-medium text-slate-300"
        >
          {t("h5DepositAmountLabel")}
        </label>
        <input
          id="deposit-amount"
          type="number"
          inputMode="decimal"
          min={MIN_DEPOSIT_USDT}
          step="any"
          value={depositAmount}
          onChange={(e) => {
            setDepositAmount(e.target.value);
            setAmountError(null);
          }}
          placeholder={t("h5DepositAmountPlaceholder")}
          className="w-full rounded-xl border border-[#f0b90b]/25 bg-black/20 px-4 py-3 font-mono text-lg text-white outline-none ring-[#f0b90b]/40 placeholder:text-slate-500 focus:border-[#f0b90b]/60 focus:ring-2"
        />
        {amountError && (
          <p className="mt-2 text-xs text-red-400">{amountError}</p>
        )}

        <button
          type="button"
          onClick={handleConfirmGenerate}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f0b90b] to-[#fcd535] px-4 py-3.5 text-sm font-bold text-amber-950 shadow-[0_0_24px_rgba(240,185,11,0.35)] transition-transform active:scale-[0.98]"
        >
          <i className="fa-solid fa-qrcode" aria-hidden />
          {t("h5DepositConfirmGenerate")}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        {isAddressGenerated ? (
          <>
            <p className="text-center text-xs text-slate-400">
              {t("h5ScanOrCopyAddress")}
            </p>
            <div className="mt-4 flex flex-col items-center gap-4">
              <DepositQrCode
                value={deposit?.depositAddress ?? ""}
                loading={addressLoading}
              />
              <CopyAddressBox
                address={deposit?.depositAddress ?? ""}
                loading={addressLoading}
              />
            </div>
            {addressError && (
              <p className="mt-2 text-center text-xs text-red-400">
                {addressError}
              </p>
            )}
            <p className="mt-3 text-center text-[10px] text-slate-500">
              {t("depositWarning")} ({deposit?.networkLabel ?? network})
            </p>
          </>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/25 px-4 py-10 text-center backdrop-blur-sm">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#f0b90b]/5 to-transparent"
              aria-hidden
            />
            <span className="relative inline-flex items-center gap-2 rounded-full border border-[#f0b90b]/30 bg-[#f0b90b]/10 px-4 py-2 text-xs leading-relaxed text-slate-300">
              <i
                className="fa-solid fa-lock text-[#f0b90b]"
                aria-hidden
              />
              {t("h5DepositGateNotice")}
            </span>
          </div>
        )}
      </div>

      <SelectMainnetSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        currency={currency}
        onCurrencyChange={setCurrency}
        network={network}
        onNetworkChange={setNetwork}
      />
    </div>
  );
}
