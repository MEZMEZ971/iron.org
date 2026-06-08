interface StatWidgetProps {
  label: string;
  value: string;
  accent?: "gold" | "emerald" | "default";
  mono?: boolean;
}

export function StatWidget({
  label,
  value,
  accent = "default",
  mono,
}: StatWidgetProps) {
  const valueClass =
    accent === "gold"
      ? "text-[#f0b90b]"
      : accent === "emerald"
        ? "text-[#00d4aa]"
        : "text-df";

  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-widest text-df-muted font-medium">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-bold ${valueClass} ${mono ? "text-sm font-mono break-all" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
