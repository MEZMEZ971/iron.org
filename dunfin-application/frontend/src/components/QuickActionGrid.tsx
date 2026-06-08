import { Link } from "react-router-dom";
import { useLocale } from "../i18n/LocaleContext";

const actions = [
  { key: "deposit" as const, icon: "⚡", to: "/deposit" as const },
  { key: "withdraw" as const, icon: "↗", to: "/withdraw" as const },
  { key: "detailed" as const, icon: "☰", to: "/assets" as const },
];

export function QuickActionGrid() {
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map(({ key, icon, to }) => (
        <Link
          key={key}
          to={to}
          className="glass-card flex flex-col items-center gap-1.5 rounded-xl py-3 transition-all duration-300 ease-in-out hover:border-[#f0b90b]/30 active:scale-95"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0b90b]/10 text-lg text-[#f0b90b]">
            {icon}
          </span>
          <span className="text-[10px] font-medium text-df">{t(key)}</span>
        </Link>
      ))}
    </div>
  );
}
