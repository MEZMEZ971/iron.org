/** Production web origin used by the iOS WebClip profile. */
export const IRON_WEB_APP_URL = "https://iron-org.vercel.app";

export const IRON_APP_DOWNLOADS = {
  android: {
    path: "/downloads/iron-platform.apk",
    filename: "iron-platform.apk",
  },
  ios: {
    path: "/downloads/iron-platform.mobileconfig",
    filename: "iron-platform.mobileconfig",
  },
} as const;

export type AppDownloadPlatform = keyof typeof IRON_APP_DOWNLOADS;

/** @deprecated Use IRON_APP_DOWNLOADS.android.path */
export const IRON_APK_PATH = IRON_APP_DOWNLOADS.android.path;

/** @deprecated Use IRON_APP_DOWNLOADS.android.filename */
export const IRON_APK_FILENAME = IRON_APP_DOWNLOADS.android.filename;
