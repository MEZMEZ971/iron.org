import type { TransactionRow } from "../../api/client";
import type { TranslationKey } from "../../i18n/translations";
import { formatAmount } from "../../lib/formatNumbers";

export function txStatusLabel(
  status: string,
  t: (key: TranslationKey) => string
) {
  switch (status.toUpperCase()) {
    case "COMPLETED":
    case "SUCCESS":
      return t("txStatusCompleted");
    case "PENDING":
    case "PROCESSING":
      return t("txStatusPending");
    case "REJECTED":
    case "FAILED":
      return t("txStatusRejected");
    case "LOCKED":
      return t("txStatusLocked");
    default:
      return status;
  }
}

export function txStatusClass(status: string, category?: string) {
  const normalized = status.toUpperCase();
  if (normalized === "LOCKED" || category === "TRADE_LOCK") {
    return "rounded-md bg-[#f0b90b]/20 px-1.5 py-0.5 font-semibold text-[#f0b90b]";
  }
  if (normalized === "COMPLETED" || normalized === "SUCCESS") {
    if (category === "COMMISSION" || category === "REWARD") {
      return "rounded-md bg-[#fcd535]/15 px-1.5 py-0.5 font-semibold text-[#fcd535]";
    }
    return "rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-[#00d4aa]";
  }
  if (normalized === "PENDING" || normalized === "PROCESSING") {
    return "rounded-md bg-[#f0b90b]/15 px-1.5 py-0.5 font-semibold text-[#f0b90b]";
  }
  if (normalized === "REJECTED" || normalized === "FAILED") {
    return "rounded-md bg-red-500/10 px-1.5 py-0.5 font-semibold text-red-400";
  }
  return "text-[#f0b90b]";
}

export function formatTxAmount(tx: TransactionRow) {
  const value = formatAmount(Math.abs(tx.amount), undefined, {
    maximumFractionDigits: 6,
  });
  if (tx.category === "WITHDRAWAL" || tx.amount < 0) return `-${value}`;
  return `+${value}`;
}

export function txAmountClass(tx: TransactionRow) {
  if (tx.category === "WITHDRAWAL" || tx.amount < 0) return "text-red-400";
  if (tx.category === "COMMISSION" || tx.category === "REWARD") {
    return "text-[#fcd535]";
  }
  if (tx.category === "TRADE_LOCK" || tx.status === "LOCKED") {
    return "text-[#f0b90b]";
  }
  if (tx.category === "DEPOSIT" || tx.category === "TRADE_PROFIT") {
    return "text-[#00d4aa]";
  }
  return "text-df";
}

type TransactionLedgerListProps = {
  transactions: TransactionRow[];
  loading?: boolean;
  emptyLabel: string;
  t: (key: TranslationKey) => string;
  variant?: "card" | "h5";
  className?: string;
};

export function TransactionLedgerList({
  transactions,
  loading = false,
  emptyLabel,
  t,
  variant = "card",
  className = "",
}: TransactionLedgerListProps) {
  const list = transactions ?? [];

  if (loading && list.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-xl bg-white/5"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (!list.length) {
    return (
      <p
        className={`text-center text-xs ${
          variant === "h5" ? "py-6 text-slate-400" : "py-4 text-df-faint"
        } ${className}`}
      >
        {emptyLabel}
      </p>
    );
  }

  const itemClass =
    variant === "h5"
      ? "flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
      : "flex items-start justify-between gap-2 rounded-xl bg-df-inset px-3 py-2.5";

  return (
    <ul className={`max-h-72 space-y-2 overflow-y-auto ${className}`}>
      {list.map((tx) => (
        <li key={tx.id} className={itemClass}>
          <div className="min-w-0">
            <p
              className={`text-xs font-semibold ${
                variant === "h5" ? "text-white" : "text-df"
              }`}
            >
              {tx.type}
            </p>
            <p
              className={`text-[10px] ${
                variant === "h5" ? "text-slate-400" : "text-df-faint"
              }`}
            >
              {new Date(tx.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="shrink-0 text-end">
            <p className={`text-xs font-bold ${txAmountClass(tx)}`}>
              {formatTxAmount(tx)} {tx.currency}
            </p>
            <span className={`text-[10px] ${txStatusClass(tx.status, tx.category)}`}>
              {txStatusLabel(tx.status, t)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
