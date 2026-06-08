import { useMemo, useState } from "react";
import { INITIAL_MARKETS } from "../data/markets";
import { useOrderBook } from "../hooks/useOrderBook";
import { useUser } from "../context/UserContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { useLocale } from "../i18n/LocaleContext";

const LEVERAGE_OPTIONS = [1, 5, 10, 20, 50, 75, 100];
const ORDER_TYPES = ["limit", "market", "stop"] as const;

export default function Contract() {
  const { t } = useLocale();
  const { userId } = useUser();
  const { profile } = useUserProfile(userId);
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState(10);
  const [orderType, setOrderType] = useState<(typeof ORDER_TYPES)[number]>("limit");
  const [amount, setAmount] = useState("");

  const btc = INITIAL_MARKETS[0];
  const book = useOrderBook(btc.price);

  const available = profile?.walletBalance ?? 0;

  const maxSize = useMemo(
    () => (available * leverage).toFixed(2),
    [available, leverage]
  );

  return (
    <div className="space-y-3 pb-4">
      <h1 className="text-lg font-bold text-df">{t("contractTitle")}</h1>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="glass-card space-y-4 rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide("long")}
              className={`rounded-xl py-2.5 text-sm font-bold transition ${
                side === "long"
                  ? "bg-[#00d4aa] text-[#0a0e1a]"
                  : "bg-df-inset text-df-muted"
              }`}
            >
              {t("long")}
            </button>
            <button
              type="button"
              onClick={() => setSide("short")}
              className={`rounded-xl py-2.5 text-sm font-bold transition ${
                side === "short"
                  ? "bg-[#ef4444] text-white"
                  : "bg-df-inset text-df-muted"
              }`}
            >
              {t("short")}
            </button>
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wide text-df-faint">
              {t("leverage")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LEVERAGE_OPTIONS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setLeverage(lv)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    leverage === lv
                      ? "bg-[#f0b90b] text-[#0a0e1a]"
                      : "bg-df-inset text-df-muted"
                  }`}
                >
                  {lv}x
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wide text-df-faint">
              {t("orderType")}
            </p>
            <div className="flex gap-2">
              {ORDER_TYPES.map((ot) => (
                <button
                  key={ot}
                  type="button"
                  onClick={() => setOrderType(ot)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize ${
                    orderType === ot
                      ? "border border-[#f0b90b]/50 bg-[#f0b90b]/10 text-[#f0b90b]"
                      : "bg-df-inset text-df-muted"
                  }`}
                >
                  {t(ot)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-df-inset px-3 py-2 text-sm">
            <span className="text-df-muted">{t("availableBalance")}: </span>
            <span className="font-bold text-[#00d4aa]">
              ${available.toLocaleString()} USDT
            </span>
          </div>

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("contractAmount")}
            className="w-full rounded-xl border border-df bg-df-inset px-3 py-2.5 text-sm text-df focus:border-[#f0b90b]/40 focus:outline-none"
          />
          <p className="text-[10px] text-df-faint">
            {t("maxPosition")}: {maxSize} USDT
          </p>

          <button
            type="button"
            className={`w-full rounded-xl py-3 text-sm font-bold ${
              side === "long"
                ? "bg-[#00d4aa] text-[#0a0e1a]"
                : "bg-[#ef4444] text-white"
            }`}
          >
            {side === "long" ? t("openLong") : t("openShort")} BTC/USDT
          </button>
        </div>

        <div className="glass-card rounded-2xl p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-df-muted">BTC/USDT</span>
            <span className="font-mono font-bold text-[#f0b90b]">
              {book.midPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 px-1 pb-1 text-[9px] uppercase text-df-faint">
            <span>{t("price")}</span>
            <span className="text-end">{t("amount")}</span>
            <span className="text-end">{t("total")}</span>
          </div>

          <div className="max-h-36 space-y-0.5 overflow-hidden">
            {[...book.asks].reverse().map((row, i) => (
              <OrderRow key={`a-${i}`} row={row} variant="ask" />
            ))}
          </div>

          <div className="my-2 border-y border-df py-1.5 text-center text-xs font-bold text-df">
            ${book.midPrice.toFixed(2)}
          </div>

          <div className="max-h-36 space-y-0.5 overflow-hidden">
            {book.bids.map((row, i) => (
              <OrderRow key={`b-${i}`} row={row} variant="bid" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderRow({
  row,
  variant,
}: {
  row: { price: number; amount: number; total: number };
  variant: "bid" | "ask";
}) {
  const depth = Math.min(100, (row.total / 8) * 100);
  const bg =
    variant === "bid" ? "rgba(0, 212, 170, 0.12)" : "rgba(239, 68, 68, 0.12)";
  const color = variant === "bid" ? "text-[#00d4aa]" : "text-[#ef4444]";

  return (
    <div className="relative grid grid-cols-3 gap-1 px-1 py-0.5 text-[10px] font-mono">
      <div
        className="absolute inset-y-0 end-0"
        style={{ width: `${depth}%`, background: bg }}
      />
      <span className={`relative ${color}`}>{row.price.toFixed(2)}</span>
      <span className="relative text-end text-df-muted">{row.amount.toFixed(4)}</span>
      <span className="relative text-end text-df-faint">{row.total.toFixed(3)}</span>
    </div>
  );
}
