import { useEffect, useState } from "react";

export interface OrderBookRow {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBookSnapshot {
  bids: OrderBookRow[];
  asks: OrderBookRow[];
  midPrice: number;
}

function buildSide(
  mid: number,
  direction: "bid" | "ask",
  levels: number
): OrderBookRow[] {
  const rows: OrderBookRow[] = [];
  let total = 0;
  for (let i = 0; i < levels; i++) {
    const offset = (i + 1) * (mid * 0.00012);
    const price =
      direction === "bid" ? mid - offset : mid + offset;
    const amount = Number((Math.random() * 2.4 + 0.05).toFixed(4));
    total += amount;
    rows.push({ price, amount, total });
  }
  return rows;
}

export function useOrderBook(basePrice: number, levels = 12) {
  const [book, setBook] = useState<OrderBookSnapshot>(() => ({
    midPrice: basePrice,
    bids: buildSide(basePrice, "bid", levels),
    asks: buildSide(basePrice, "ask", levels),
  }));

  useEffect(() => {
    setBook({
      midPrice: basePrice,
      bids: buildSide(basePrice, "bid", levels),
      asks: buildSide(basePrice, "ask", levels),
    });
  }, [basePrice, levels]);

  useEffect(() => {
    const id = setInterval(() => {
      const jitter = basePrice * (1 + (Math.random() - 0.5) * 0.0008);
      setBook({
        midPrice: jitter,
        bids: buildSide(jitter, "bid", levels),
        asks: buildSide(jitter, "ask", levels),
      });
    }, 1400);
    return () => clearInterval(id);
  }, [basePrice, levels]);

  return book;
}
