import { useLocale } from "../../i18n/LocaleContext";

export type GenTab = "gen1" | "gen2" | "gen3";

interface Props {
  active: GenTab;
  onChange: (tab: GenTab) => void;
}

const TABS: { id: GenTab; labelKey: "teamGen1Tab" | "teamGen2Tab" | "teamGen3Tab" }[] = [
  { id: "gen1", labelKey: "teamGen1Tab" },
  { id: "gen2", labelKey: "teamGen2Tab" },
  { id: "gen3", labelKey: "teamGen3Tab" },
];

export function GenTabSwitcher({ active, onChange }: Props) {
  const { t } = useLocale();

  return (
    <div
      className="glass-card flex gap-1 rounded-xl border border-df p-1"
      role="tablist"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 rounded-lg px-2 py-2.5 text-xs font-semibold transition ${
            active === tab.id
              ? "bg-gradient-to-r from-[#f0b90b]/25 to-[#fcd535]/15 text-[#f0b90b] shadow-inner"
              : "text-df-muted hover:text-df"
          }`}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </div>
  );
}
