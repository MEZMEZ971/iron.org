import { useLocale } from "../i18n/LocaleContext";

export function MarqueeBanner() {
  const { t } = useLocale();
  const text = t("msbNotice");

  return (
    <div className="glass-card overflow-hidden rounded-xl border border-[#f0b90b]/20 py-2">
      <div className="flex animate-marquee whitespace-nowrap">
        {[0, 1].map((i) => (
          <span
            key={i}
            className="mx-8 inline-flex items-center gap-2 text-xs text-[#f0b90b]/90"
          >
            <span className="rounded bg-[#f0b90b]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase">
              {t("news")}
            </span>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
