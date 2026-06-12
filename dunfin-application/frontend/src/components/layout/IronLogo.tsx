import { useLocale } from "../../i18n/LocaleContext";

interface IronLogoProps {
  className?: string;
  size?: number;
}

/** IRON brand mark */
export function IronLogo({ className = "", size = 40 }: IronLogoProps) {
  return (
    <img
      src="/iron-logo.png"
      alt="IRON"
      width={size}
      height={size}
      className={`shrink-0 rounded-xl object-contain ${className}`}
      draggable={false}
    />
  );
}

interface IronBrandLockupProps {
  layout?: "row" | "stack";
  logoSize?: number;
  className?: string;
}

/** Official IRON logo + wordmark used in sidebar and auth screens */
export function IronBrandLockup({
  layout = "row",
  logoSize,
  className = "",
}: IronBrandLockupProps) {
  const { t } = useLocale();
  const size = logoSize ?? (layout === "stack" ? 72 : 58);

  const titleClass =
    layout === "stack"
      ? "text-xl font-bold tracking-tight text-df sm:text-2xl"
      : "text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl";

  const taglineClass =
    layout === "stack"
      ? "text-[11px] leading-tight text-df-muted sm:text-xs"
      : "text-[10px] leading-tight text-slate-500 dark:text-slate-400 sm:text-[11px]";

  const textBlock = (
    <div className={layout === "stack" ? "mt-3" : "min-w-0"}>
      <p className={titleClass}>{t("brand")}</p>
      <p className={taglineClass}>{t("tagline")}</p>
    </div>
  );

  if (layout === "stack") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <IronLogo
          size={size}
          className="h-[4.5rem] w-[4.5rem] sm:h-[5rem] sm:w-[5rem]"
        />
        {textBlock}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      <IronLogo size={size} className="h-14 w-14 sm:h-[3.75rem] sm:w-[3.75rem]" />
      {textBlock}
    </div>
  );
}
