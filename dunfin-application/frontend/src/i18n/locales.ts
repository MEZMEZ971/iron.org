/** Core platform locales — display order matches product language picker. */
export const CORE_LOCALES = [
  { code: "ru", label: "Русский", dir: "ltr" as const, lang: "ru" },
  { code: "de", label: "Deutsch", dir: "ltr" as const, lang: "de" },
  { code: "ar", label: "عربي", dir: "rtl" as const, lang: "ar" },
  { code: "pt", label: "Português", dir: "ltr" as const, lang: "pt" },
  { code: "es", label: "Español", dir: "ltr" as const, lang: "es" },
  { code: "fr", label: "Français", dir: "ltr" as const, lang: "fr" },
  { code: "en", label: "English", dir: "ltr" as const, lang: "en" },
  { code: "ja", label: "日本語", dir: "ltr" as const, lang: "ja" },
  { code: "ko", label: "한국어", dir: "ltr" as const, lang: "ko" },
  { code: "vi", label: "Tiếng Việt", dir: "ltr" as const, lang: "vi" },
  { code: "fa", label: "فارسى", dir: "rtl" as const, lang: "fa" },
  { code: "id", label: "Indonesian", dir: "ltr" as const, lang: "id" },
  { code: "bn", label: "বাংলা", dir: "ltr" as const, lang: "bn" },
  { code: "gn", label: "Guaraní", dir: "ltr" as const, lang: "gn" },
  { code: "ay", label: "Aymar aru", dir: "ltr" as const, lang: "ay" },
  { code: "mi", label: "Te Reo Māori", dir: "ltr" as const, lang: "mi" },
  { code: "mn", label: "Монгол хэл", dir: "ltr" as const, lang: "mn" },
] as const;

export type Locale = (typeof CORE_LOCALES)[number]["code"];

const localeCodes = new Set(CORE_LOCALES.map((l) => l.code));

export function isLocale(value: string | null): value is Locale {
  return value !== null && localeCodes.has(value as Locale);
}

export function getLocaleMeta(code: Locale) {
  return CORE_LOCALES.find((l) => l.code === code)!;
}

export function getTextDirection(code: Locale): "ltr" | "rtl" {
  return getLocaleMeta(code).dir;
}

export const RTL_LOCALES: readonly Locale[] = ["ar", "fa"];

export function isRtlLocale(code: Locale): boolean {
  return getTextDirection(code) === "rtl";
}
