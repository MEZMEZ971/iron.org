import { useLocale } from "../../i18n/LocaleContext";
import type { TranslationKey } from "../../i18n/translations";

const MANAGERS = [
  {
    name: "Naomi",
    labelKey: "supportContactNaomi" as TranslationKey,
    href: "https://t.me/+447988962109",
  },
  {
    name: "Sabrina",
    labelKey: "supportContactSabrina" as TranslationKey,
    href: "https://t.me/+447846747809",
  },
  {
    name: "Sophia",
    labelKey: "supportContactSophia" as TranslationKey,
    href: "https://t.me/+447988971025",
  },
] as const;

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

type CustomerManagerContactsProps = {
  title?: string;
  subtitle?: string;
  className?: string;
};

export function CustomerManagerContacts({
  title = "Customer Support",
  subtitle = "Reach our dedicated managers on Telegram for account assistance.",
  className = "",
}: CustomerManagerContactsProps) {
  const { t } = useLocale();

  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition-all duration-300 dark:border-white/[0.08] dark:bg-[rgba(26,31,46,0.85)] ${className}`}
    >
      <div className="mb-4 text-center sm:text-start">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-df-muted">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-4">
        {MANAGERS.map((manager) => (
          <a
            key={manager.name}
            href={manager.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-2.5 rounded-xl bg-[#26A5E4] px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#26A5E4]/25 transition-all duration-200 hover:bg-[#1e8ec5] hover:shadow-lg hover:shadow-[#26A5E4]/30 active:scale-[0.98]"
          >
            <TelegramIcon className="h-5 w-5 shrink-0 opacity-95 group-hover:opacity-100" />
            <span className="text-center leading-snug">{t(manager.labelKey)}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
