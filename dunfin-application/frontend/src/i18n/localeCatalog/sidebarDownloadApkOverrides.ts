import type { Locale } from "../locales";

type NonBaseLocale = Exclude<Locale, "en" | "ar">;

/** Localized app download labels for non EN/AR locales. */
export const SIDEBAR_DOWNLOAD_OVERRIDES: Record<
  NonBaseLocale,
  { sidebarDownloadAndroid: string; sidebarDownloadIos: string }
> = {
  ru: {
    sidebarDownloadAndroid: "Скачать приложение Android",
    sidebarDownloadIos: "Скачать приложение iOS",
  },
  de: {
    sidebarDownloadAndroid: "Android-App herunterladen",
    sidebarDownloadIos: "iOS-App herunterladen",
  },
  pt: {
    sidebarDownloadAndroid: "Baixar app Android",
    sidebarDownloadIos: "Baixar app iOS",
  },
  es: {
    sidebarDownloadAndroid: "Descargar app Android",
    sidebarDownloadIos: "Descargar app iOS",
  },
  fr: {
    sidebarDownloadAndroid: "Télécharger l'app Android",
    sidebarDownloadIos: "Télécharger l'app iOS",
  },
  ja: {
    sidebarDownloadAndroid: "Androidアプリをダウンロード",
    sidebarDownloadIos: "iOSアプリをダウンロード",
  },
  ko: {
    sidebarDownloadAndroid: "Android 앱 다운로드",
    sidebarDownloadIos: "iOS 앱 다운로드",
  },
  vi: {
    sidebarDownloadAndroid: "Tải ứng dụng Android",
    sidebarDownloadIos: "Tải ứng dụng iOS",
  },
  fa: {
    sidebarDownloadAndroid: "دانلود اپلیکیشن اندروید",
    sidebarDownloadIos: "دانلود اپلیکیشن iOS",
  },
  id: {
    sidebarDownloadAndroid: "Unduh aplikasi Android",
    sidebarDownloadIos: "Unduh aplikasi iOS",
  },
  bn: {
    sidebarDownloadAndroid: "অ্যান্ড্রয়েড অ্যাপ ডাউনলোড করুন",
    sidebarDownloadIos: "iOS অ্যাপ ডাউনলোড করুন",
  },
  gn: {
    sidebarDownloadAndroid: "Embogue app Android",
    sidebarDownloadIos: "Embogue app iOS",
  },
  ay: {
    sidebarDownloadAndroid: "Android app apaqasiña",
    sidebarDownloadIos: "iOS app apaqasiña",
  },
  mi: {
    sidebarDownloadAndroid: "Tikiake taupānga Android",
    sidebarDownloadIos: "Tikiake taupānga iOS",
  },
  mn: {
    sidebarDownloadAndroid: "Android апп татах",
    sidebarDownloadIos: "iOS апп татах",
  },
};

/** @deprecated Use SIDEBAR_DOWNLOAD_OVERRIDES */
export const SIDEBAR_DOWNLOAD_APK_OVERRIDES = SIDEBAR_DOWNLOAD_OVERRIDES;
