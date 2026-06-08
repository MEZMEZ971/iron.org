import { useId, useState, type ReactNode } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import type { TranslationKey } from "../../i18n/translations";

const PANEL =
  "border border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-md transition-all duration-300 ease-in-out dark:border-white/[0.06] dark:bg-[rgba(26,31,46,0.65)] dark:shadow-none";

export type HelpSectionDef = {
  id: string;
  titleKey: TranslationKey;
  render: (t: (key: TranslationKey) => string) => ReactNode;
};

function AccordionItem({
  section,
  open,
  onToggle,
}: {
  section: HelpSectionDef;
  open: boolean;
  onToggle: () => void;
}) {
  const { t, dir } = useLocale();
  const rtl = dir === "rtl";
  const panelId = useId();

  return (
    <div className={`overflow-hidden rounded-xl ${PANEL} transition-all duration-300 ease-in-out`}>
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-4 text-start transition-all duration-300 ease-in-out hover:bg-slate-100/80 active:bg-[#f0b90b]/10 dark:hover:bg-white/[0.03] dark:active:bg-[#f0b90b]/5"
      >
        <span className="flex-1 text-sm font-semibold text-slate-900 transition-all duration-300 ease-in-out dark:text-white">
          {t(section.titleKey)}
        </span>
        <i
          className={`fa-solid shrink-0 text-xs transition-all duration-300 ease-in-out ${
            open
              ? "fa-chevron-down text-[#f0b90b] dark:text-amber-500"
              : `fa-chevron-right text-slate-500 dark:text-amber-500 ${rtl ? "rotate-180" : ""}`
          }`}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        className={`grid transition-all duration-300 ease-in-out will-change-[grid-template-rows] ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-200/80 px-4 pb-4 pt-3 transition-all duration-300 ease-in-out dark:border-white/[0.06]">
            {section.render(t)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HelpAccordion({ sections }: { sections: HelpSectionDef[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <AccordionItem
          key={section.id}
          section={section}
          open={openId === section.id}
          onToggle={() =>
            setOpenId((prev) => (prev === section.id ? null : section.id))
          }
        />
      ))}
    </div>
  );
}

export function HelpSubBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="mb-2 text-sm font-bold text-[#2563eb] transition-all duration-300 ease-in-out dark:text-[#5b8def]">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-slate-600 transition-all duration-300 ease-in-out dark:text-df-muted">
        {children}
      </div>
    </div>
  );
}

export function HelpParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-slate-600 transition-all duration-300 ease-in-out dark:text-df-muted">
      {children}
    </p>
  );
}

export function HelpClause({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="mb-4 border-b border-slate-200/60 pb-4 transition-all duration-300 ease-in-out last:mb-0 last:border-0 last:pb-0 dark:border-white/[0.04]">
      <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#c99400] transition-all duration-300 ease-in-out dark:text-[#f0b90b]">
        {title}
      </h4>
      <p className="text-sm leading-relaxed text-slate-600 transition-all duration-300 ease-in-out dark:text-df-muted">
        {body}
      </p>
    </div>
  );
}
