import type { Locale } from "./locales";
import type { TranslationKey } from "./translations";
import { ADMIN_ACTIVITY_OVERRIDES } from "./localeCatalog/adminActivityOverrides";
import { ADMIN_FINANCE_OVERRIDES } from "./localeCatalog/adminFinanceOverrides";
import { CORE_OVERRIDES } from "./localeCatalog/coreOverrides";
import { HELP_OVERRIDES } from "./localeCatalog/helpOverrides";
import { H5_OVERRIDES } from "./localeCatalog/h5Overrides";
import { H5_DEPOSIT_OVERRIDES } from "./localeCatalog/h5DepositOverrides";
import { H5_NEW_KEY_OVERRIDES } from "./localeCatalog/h5OverridesNewKeys";
import { itTable } from "./italian/itTable";

type NonBaseLocale = Exclude<Locale, "en" | "ar" | "it">;

export function buildLocaleTable(
  code: Locale,
  en: Record<TranslationKey, string>,
  ar: Record<TranslationKey, string>,
): Record<TranslationKey, string> {
  if (code === "en") {
    return { ...en };
  }
  if (code === "ar") {
    return { ...ar };
  }
  if (code === "it") {
    return { ...itTable } as Record<TranslationKey, string>;
  }
  const locale = code as NonBaseLocale;
  const h5 = {
    ...(H5_OVERRIDES[locale] ?? {}),
    ...(H5_NEW_KEY_OVERRIDES[locale] ?? {}),
    ...(H5_DEPOSIT_OVERRIDES[locale] ?? {}),
  };
  const core = CORE_OVERRIDES[locale] ?? {};
  const help = HELP_OVERRIDES[locale] ?? {};
  const adminActivity = ADMIN_ACTIVITY_OVERRIDES[locale] ?? {};
  const adminFinance = ADMIN_FINANCE_OVERRIDES[locale] ?? {};
  return {
    ...en,
    ...h5,
    ...core,
    ...help,
    ...adminActivity,
    ...adminFinance,
  } as Record<TranslationKey, string>;
}
