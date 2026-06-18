import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ApiError,
  fetchWithdrawPreflight,
  fetchWithdrawalHistory,
  submitWithdrawal,
  type WithdrawalRecordRow,
  type WithdrawPreflight,
} from "../api/client";
import { PaymentPasswordModal } from "../components/h5/PaymentPasswordModal";
import { useSuccessFeedback } from "../context/SuccessFeedbackContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { useUser } from "../context/UserContext";
import { emitWalletRefresh } from "../lib/walletSync";
import { useLocale } from "../i18n/LocaleContext";
import type { TranslationKey } from "../i18n/translations";

const PANEL =
  "rounded-xl border border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-md transition-all duration-300 ease-in-out dark:border-white/[0.06] dark:bg-[rgba(26,31,46,0.65)] dark:shadow-none";

const LABEL =
  "text-xs font-medium text-slate-700 transition-all duration-300 ease-in-out dark:text-slate-400";

const INPUT =
  "min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 transition-all duration-300 ease-in-out focus:outline-none dark:text-white dark:placeholder:text-df-faint";

const SUMMARY_LABEL =
  "text-slate-800 transition-all duration-300 ease-in-out dark:text-slate-300";

const SUMMARY_VALUE =
  "text-slate-800 transition-all duration-300 ease-in-out dark:text-slate-300";

const GOLD_BTN =
  "btn-golden-glow w-full rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] py-4 text-base font-bold text-[#0a0e1a] shadow-lg shadow-[#f0b90b]/25 transition-all duration-300 ease-in-out disabled:opacity-50";

const CURRENCIES = ["USDT", "USDC"] as const;
const NETWORKS = ["ERC20", "TRC20", "BEP20"] as const;

type Currency = (typeof CURRENCIES)[number];
type Network = (typeof NETWORKS)[number];

const FEE_RATE = 0.1;

function formatAmount(n: number, digits = 6) {
  if (!Number.isFinite(n)) return "0";
  return Number(n.toFixed(digits)).toString();
}

function calcFee(amount: number) {
  return Number((amount * FEE_RATE).toFixed(6));
}

function calcNet(amount: number) {
  return Number((amount - calcFee(amount)).toFixed(6));
}

function savedAddressForNetwork(
  saved: WithdrawPreflight["savedWithdrawalAddresses"],
  net: Network
) {
  return saved?.[net]?.trim() || "";
}

export default function Withdrawal() {
  const { t, dir, locale } = useLocale();
  const rtl = dir === "rtl";
  const navigate = useNavigate();
  const { userId } = useUser();
  const { refresh: refreshProfile } = useUserProfile(userId);
  const { showSuccess } = useSuccessFeedback();

  const [view, setView] = useState<"form" | "history">("form");
  const [preflight, setPreflight] = useState<WithdrawPreflight | null>(null);
  const [history, setHistory] = useState<WithdrawalRecordRow[]>([]);

  const [currency, setCurrency] = useState<Currency>("USDT");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [network, setNetwork] = useState<Network>("ERC20");
  const [networkOpen, setNetworkOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = preflight?.walletBalance ?? 0;
  const amountNum = Number(quantity) || 0;
  const fee = calcFee(amountNum);
  const netReceived = calcNet(amountNum);

  const loadPreflight = useCallback(async () => {
    try {
      const data = await fetchWithdrawPreflight();
      setPreflight(data);
    } catch {
      setPreflight(null);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const { withdrawals } = await fetchWithdrawalHistory();
      setHistory(withdrawals);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    loadPreflight();
  }, [loadPreflight]);

  useEffect(() => {
    if (!preflight?.savedWithdrawalAddresses) return;
    setAddress(savedAddressForNetwork(preflight.savedWithdrawalAddresses, network));
  }, [preflight, network]);

  useEffect(() => {
    if (view === "history") loadHistory();
  }, [view, loadHistory]);

  const networkLabel = useMemo(() => {
    if (network === "ERC20") return t("networkErc20");
    if (network === "BEP20") return t("networkBep20");
    return t("networkTrc20");
  }, [network, t]);

  async function pasteAddress() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setAddress(text.trim());
    } catch {
      /* ignore */
    }
  }

  function fillAll() {
    setQuantity(String(balance));
  }

  function resolveWithdrawError(e: unknown): string {
    if (e instanceof ApiError) {
      if (e.code === "WRONG_PAYMENT_PASSWORD" || e.code === "WRONG_PAYMENT_PIN") {
        return locale === "ar"
          ? e.errorAr || t("h5PaymentWrongPinAr")
          : t("h5PaymentWrongPin");
      }
      if (e.code === "PAYMENT_PASSWORD_NOT_SET") {
        return locale === "ar"
          ? e.errorAr || t("h5PaymentPinNotSetupAr")
          : t("h5PaymentPinNotSetup");
      }
      if (
        e.code === "PAYMENT_PASSWORD_REQUIRED" ||
        e.code === "PAYMENT_PIN_REQUIRED"
      ) {
        return t("h5PaymentVerifySubtitle");
      }
      return e.message;
    }
    return e instanceof Error ? e.message : t("withdrawFailed");
  }

  async function executeWithdraw(paymentPassword: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await submitWithdrawal({
        amount: amountNum,
        currency,
        network,
        address: address.trim(),
        paymentPassword,
      });
      setIsPasswordModalOpen(false);
      setQuantity("");
      await loadPreflight();
      emitWalletRefresh({ userId, walletBalance: result.walletBalance });
      await refreshProfile();
      showSuccess({
        titleKey: "withdrawSuccess",
        messageKey: "successGenericMessage",
        detail: `${formatAmount(netReceived, 2)} ${currency}`,
      });
    } catch (e) {
      setError(resolveWithdrawError(e));
    } finally {
      setBusy(false);
    }
  }

  function handleConfirm() {
    setError(null);
    if (amountNum < 5) {
      setError(t("withdrawRuleMin"));
      return;
    }
    if (amountNum > 10000) {
      setError(t("withdrawRuleMax"));
      return;
    }
    if (amountNum > balance) {
      setError(t("insufficientBalance"));
      return;
    }
    if (!address.trim()) {
      setError(t("withdrawAddressPlaceholder"));
      return;
    }
    setIsPasswordModalOpen(true);
  }

  function statusLabel(status: string) {
    switch (status) {
      case "PENDING_REVIEW":
        return t("withdrawStatusPending");
      case "COMPLETED":
        return t("withdrawStatusCompleted");
      case "REJECTED":
        return t("withdrawStatusRejected");
      default:
        return t("withdrawStatusProcessing");
    }
  }

  if (view === "history") {
    return (
      <div className="mx-auto max-w-lg space-y-4 pb-8">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-df-page/95 px-1 py-3 backdrop-blur-xl transition-all duration-300 ease-in-out dark:border-white/[0.06] dark:bg-[#0a0e1a]/95">
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={() => setView("form")}
              className={`absolute flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300/80 text-slate-600 transition-all duration-300 ease-in-out hover:border-[#f0b90b]/30 dark:border-white/10 dark:text-df-muted ${
                rtl ? "right-0" : "left-0"
              }`}
              aria-label={t("back")}
            >
              <i
                className={`fa-solid fa-arrow-left text-sm transition-all duration-300 ease-in-out ${rtl ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            <h1 className="text-base font-semibold text-slate-900 transition-all duration-300 ease-in-out dark:text-white">
              {t("withdrawalHistory")}
            </h1>
          </div>
        </header>

        <div className="space-y-2">
          {history.length === 0 && (
            <p className="py-8 text-center text-sm text-df-muted">
              {t("withdrawNoHistory")}
            </p>
          )}
          {history.map((row) => (
            <div key={row.id} className={`${PANEL} p-3 sm:p-4`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-df">
                    {formatAmount(row.amount, 2)} {row.currency}
                  </p>
                  <p className="mt-0.5 text-xs text-df-faint">
                    {row.network} · {new Date(row.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-[#f0b90b]/15 px-2 py-0.5 text-[10px] font-bold text-[#f0b90b]">
                  {statusLabel(row.status)}
                </span>
              </div>
              <p className="mt-2 truncate text-xs text-df-muted">{row.address}</p>
              <p className="mt-1 text-xs text-[#f0b90b]">
                {t("withdrawAmountReceived")}: ${formatAmount(row.netAmount, 2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-3 pb-24 sm:space-y-4 sm:pb-28">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-df-page/95 py-3 backdrop-blur-xl transition-all duration-300 ease-in-out dark:border-white/[0.06] dark:bg-[#0a0e1a]/95">
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={`absolute flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300/80 text-slate-700 transition-all duration-300 ease-in-out hover:border-[#f0b90b]/30 dark:border-white/10 dark:text-white ${
              rtl ? "right-0" : "left-0"
            }`}
            aria-label={t("back")}
          >
            <i
              className={`fa-solid fa-arrow-left text-sm transition-all duration-300 ease-in-out ${rtl ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          <h1 className="text-base font-semibold tracking-wide text-slate-900 transition-all duration-300 ease-in-out dark:text-white">
            {t("withdrawalTitle")}
          </h1>
          <button
            type="button"
            onClick={() => setView("history")}
            className={`absolute flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300/80 text-[#c99400] transition-all duration-300 ease-in-out hover:bg-[#f0b90b]/10 dark:border-white/10 dark:text-[#f0b90b] ${
              rtl ? "left-0" : "right-0"
            }`}
            aria-label={t("withdrawalHistory")}
          >
            <i className="fa-solid fa-file-lines text-sm" aria-hidden />
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">
          {error}
        </p>
      )}

      <div className="space-y-3 px-1">
        <div className={`${PANEL} p-3 sm:p-4`}>
          <p className={LABEL}>{t("withdrawChooseCurrency")}</p>
          <button
            type="button"
            onClick={() => setCurrencyOpen((v) => !v)}
            className="mt-2 flex w-full items-center justify-between text-start transition-all duration-300 ease-in-out"
          >
            <span className="text-lg font-bold text-slate-900 transition-all duration-300 ease-in-out dark:text-df">
              {currency}
            </span>
            <i
              className={`fa-solid fa-chevron-down text-xs text-slate-500 transition-all duration-300 ease-in-out dark:text-df-faint ${
                currencyOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {currencyOpen && (
            <div className="mt-2 space-y-1 border-t border-slate-200/80 pt-2 transition-all duration-300 ease-in-out dark:border-white/[0.06]">
              {CURRENCIES.filter((c) => c !== currency).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCurrency(c);
                    setCurrencyOpen(false);
                  }}
                  className="w-full py-2 text-start text-sm text-[#f0b90b] hover:underline"
                >
                  {t("withdrawChooseAnotherCurrency")}: {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`${PANEL} p-3 sm:p-4`}>
          <p className={LABEL}>{t("withdrawPaymentChannels")}</p>
          <button
            type="button"
            onClick={() => setNetworkOpen((v) => !v)}
            className="mt-2 flex w-full items-center justify-between transition-all duration-300 ease-in-out"
          >
            <span className="text-sm font-semibold text-slate-900 transition-all duration-300 ease-in-out dark:text-df">
              {networkLabel}
            </span>
            <i className="fa-solid fa-chevron-down text-xs text-slate-500 transition-all duration-300 ease-in-out dark:text-df-faint" />
          </button>
          {networkOpen && (
            <ul className="mt-2 space-y-1 border-t border-slate-200/80 pt-2 transition-all duration-300 ease-in-out dark:border-white/[0.06]">
              {NETWORKS.map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => {
                      setNetwork(n);
                      setNetworkOpen(false);
                    }}
                    className={`w-full py-2 text-start text-sm transition-all duration-300 ease-in-out ${
                      network === n
                        ? "text-[#c99400] dark:text-[#f0b90b]"
                        : "text-slate-600 dark:text-df-muted"
                    }`}
                  >
                    {n === "ERC20"
                      ? t("networkErc20")
                      : n === "BEP20"
                        ? t("networkBep20")
                        : t("networkTrc20")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`${PANEL} p-3 sm:p-4`}>
          <p className={`mb-2 ${LABEL}`}>{t("withdrawAddress")}</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("withdrawAddressPlaceholder")}
              className={INPUT}
            />
            <button
              type="button"
              onClick={pasteAddress}
              className="shrink-0 text-[#f0b90b] hover:opacity-80"
              aria-label={t("withdrawPaste")}
            >
              <i className="fa-solid fa-copy text-sm" aria-hidden />
            </button>
          </div>
        </div>

        <div className={`${PANEL} p-3 sm:p-4`}>
          <p className={`mb-2 ${LABEL}`}>{t("withdrawQuantity")}</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={INPUT}
            />
            <button
              type="button"
              onClick={fillAll}
              className="shrink-0 text-xs font-bold uppercase text-[#f0b90b]"
            >
              {t("withdrawAll")}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#f0b90b]">
            *{t("withdrawBalanceLabel")}: {formatAmount(balance, 6)} USDT
          </p>
        </div>

        <div className={`${PANEL} px-4 py-3`}>
          <p className={LABEL}>{t("withdrawCommission")}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 transition-all duration-300 ease-in-out dark:text-df">
            {formatAmount(fee, 2)}
          </p>
        </div>

        <div className={`${PANEL} space-y-2 p-4 text-sm transition-all duration-300 ease-in-out`}>
          <div className={`flex justify-between gap-2 ${SUMMARY_LABEL}`}>
            <span>{t("withdrawSettlementAmount")}</span>
            <span className={SUMMARY_VALUE}>
              {formatAmount(amountNum, 6)} {currency}
            </span>
          </div>
          <div className={`flex justify-between gap-2 ${SUMMARY_LABEL}`}>
            <span>{t("withdrawFeeLabel")}</span>
            <span className={SUMMARY_VALUE}>{formatAmount(fee, 6)}</span>
          </div>
          <div className="flex justify-between gap-2 transition-all duration-300 ease-in-out">
            <span className={SUMMARY_LABEL}>{t("withdrawAmountReceived")}</span>
            <span className="font-bold text-[#c99400] transition-all duration-300 ease-in-out dark:text-[#f0b90b]">
              ${formatAmount(netReceived, 6)}
            </span>
          </div>
          <div className={`flex justify-between gap-2 ${SUMMARY_LABEL}`}>
            <span>{t("withdrawFeePercent")}</span>
            <span className={SUMMARY_VALUE}>10%</span>
          </div>
          <div className={`flex justify-between gap-2 text-xs ${SUMMARY_LABEL}`}>
            <span className="max-w-[70%]">{t("withdrawTurnoverShortfall")}</span>
            <span className={SUMMARY_VALUE}>{preflight?.turnoverShortfall ?? 0}</span>
          </div>

          <ul className="mt-4 space-y-2 border-t border-slate-200/80 pt-4 text-xs text-slate-600 transition-all duration-300 ease-in-out dark:border-white/[0.06] dark:text-df-faint">
            {(
              [
                "withdrawRuleMin",
                "withdrawRuleMax",
                "withdrawRuleHours",
                "withdrawRuleAuto",
              ] as TranslationKey[]
            ).map((key) => (
              <li key={key} className="flex items-start gap-2">
                <i className="fa-solid fa-circle-info mt-0.5 shrink-0 text-[#f0b90b]/80" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-df-page/95 p-4 backdrop-blur-xl transition-all duration-300 ease-in-out md:static md:border-0 md:bg-transparent md:p-0 md:pt-2 dark:border-white/[0.06] dark:bg-[#0a0e1a]/95">
        <button
          type="button"
          disabled={busy}
          onClick={handleConfirm}
          className={GOLD_BTN}
        >
          {t("withdrawConfirm")}
        </button>
      </div>

      <PaymentPasswordModal
        open={isPasswordModalOpen}
        busy={busy}
        requiresPaymentPin={preflight?.requiresPaymentPin ?? false}
        onClose={() => setIsPasswordModalOpen(false)}
        onVerify={(paymentPassword) => executeWithdraw(paymentPassword)}
        onOpenSettings={() => {
          setIsPasswordModalOpen(false);
          navigate("/settings");
        }}
      />
    </div>
  );
}
