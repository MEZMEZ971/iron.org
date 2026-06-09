import {
  IRON_APP_DOWNLOADS,
  type AppDownloadPlatform,
} from "../../config/apkDownload";
import { useLocale } from "../../i18n/LocaleContext";
import type { TranslationKey } from "../../i18n/translations";

type AppDownloadVariant = "sidebar" | "mobile-strip" | "drawer";

const platformLabelKey: Record<AppDownloadPlatform, TranslationKey> = {
  android: "sidebarDownloadAndroid",
  ios: "sidebarDownloadIos",
};

const platformIcon: Record<AppDownloadPlatform, string> = {
  android: "fa-brands fa-android",
  ios: "fa-brands fa-apple",
};

const buttonClass: Record<AppDownloadVariant, string> = {
  sidebar:
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-in-out text-slate-600 dark:text-slate-400 hover:bg-amber-500/5 hover:text-[#f0b90b] dark:hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b]/40",
  "mobile-strip":
    "flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#f0b90b]/20 bg-[#f0b90b]/5 px-2.5 py-2 text-[10px] font-semibold text-[#f0b90b] backdrop-blur-md transition-all duration-300 hover:border-[#f0b90b]/35 hover:bg-[#f0b90b]/10 hover:shadow-[0_0_14px_rgba(240,185,11,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b]/40",
  drawer:
    "flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-start transition-all duration-300 ease-in-out hover:bg-df-inset active:bg-[#f0b90b]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b]/40",
};

function NewBadge({ compact }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md bg-[#f0b90b]/15 font-bold uppercase tracking-wide text-[#f0b90b] shadow-[0_0_8px_rgba(240,185,11,0.35)] ${
        compact ? "px-1 py-0.5 text-[8px]" : "px-1.5 py-0.5 text-[9px]"
      }`}
    >
      <span
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f0b90b] shadow-[0_0_6px_#f0b90b]"
        aria-hidden
      />
      NEW
    </span>
  );
}

function AppDownloadButton({
  platform,
  variant,
}: {
  platform: AppDownloadPlatform;
  variant: AppDownloadVariant;
}) {
  const { t } = useLocale();
  const asset = IRON_APP_DOWNLOADS[platform];
  const compact = variant === "mobile-strip";

  if (variant === "drawer") {
    return (
      <a
        href={asset.path}
        download={asset.filename}
        className={buttonClass.drawer}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0b90b]/10 text-[#f0b90b]">
          <i className={`${platformIcon[platform]} text-lg`} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-df">
          <span className="truncate">{t(platformLabelKey[platform])}</span>
          <NewBadge />
        </span>
        <i className="fa-solid fa-download text-sm text-df-faint" aria-hidden />
      </a>
    );
  }

  return (
    <a
      href={asset.path}
      download={asset.filename}
      className={buttonClass[variant]}
    >
      <i
        className={`${platformIcon[platform]} shrink-0 text-center text-[#f0b90b] ${
          variant === "sidebar" ? "w-5 text-base" : "text-sm"
        }`}
        aria-hidden
      />
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate">{t(platformLabelKey[platform])}</span>
        <NewBadge compact={compact} />
      </span>
      <i
        className={`fa-solid fa-download shrink-0 opacity-60 ${
          variant === "sidebar" ? "text-sm" : "text-[10px]"
        }`}
        aria-hidden
      />
    </a>
  );
}

export function AppDownloadLinks({ variant }: { variant: AppDownloadVariant }) {
  if (variant === "mobile-strip") {
    return (
      <div className="flex gap-2">
        <AppDownloadButton platform="android" variant="mobile-strip" />
        <AppDownloadButton platform="ios" variant="mobile-strip" />
      </div>
    );
  }

  if (variant === "drawer") {
    return (
      <div className="grid gap-1">
        <AppDownloadButton platform="android" variant="drawer" />
        <AppDownloadButton platform="ios" variant="drawer" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <AppDownloadButton platform="android" variant="sidebar" />
      <AppDownloadButton platform="ios" variant="sidebar" />
    </div>
  );
}

/** @deprecated Use AppDownloadLinks */
export const ApkDownloadLink = AppDownloadLinks;

export function AppDownloadBadge(props: { compact?: boolean }) {
  return <NewBadge {...props} />;
}

/** @deprecated Use AppDownloadBadge */
export const ApkDownloadBadge = AppDownloadBadge;
