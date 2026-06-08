import type { Locale } from "../locales";
import type { helpEn } from "../helpTranslations";
import { HELP_AY } from "./helpLocales/ay";
import { HELP_BN } from "./helpLocales/bn";
import { HELP_DE } from "./helpLocales/de";
import { HELP_ES } from "./helpLocales/es";
import { HELP_FA } from "./helpLocales/fa";
import { HELP_FR } from "./helpLocales/fr";
import { HELP_GN } from "./helpLocales/gn";
import { HELP_ID } from "./helpLocales/id";
import { HELP_JA } from "./helpLocales/ja";
import { HELP_KO } from "./helpLocales/ko";
import { HELP_MI } from "./helpLocales/mi";
import { HELP_MN } from "./helpLocales/mn";
import { HELP_PT } from "./helpLocales/pt";
import { HELP_RU } from "./helpLocales/ru";
import { HELP_VI } from "./helpLocales/vi";

export type HelpKey = keyof typeof helpEn;
type NonBaseLocale = Exclude<Locale, "en" | "ar">;

export const HELP_OVERRIDES: Record<
  NonBaseLocale,
  Partial<Record<HelpKey, string>>
> = {
  ru: HELP_RU,
  de: HELP_DE,
  pt: HELP_PT,
  es: HELP_ES,
  fr: HELP_FR,
  ja: HELP_JA,
  ko: HELP_KO,
  vi: HELP_VI,
  fa: HELP_FA,
  id: HELP_ID,
  bn: HELP_BN,
  gn: HELP_GN,
  ay: HELP_AY,
  mi: HELP_MI,
  mn: HELP_MN,
};
