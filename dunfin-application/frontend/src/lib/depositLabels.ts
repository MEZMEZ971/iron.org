import type { TranslationKey } from "../i18n/translations";
import type { DepositCurrency, DepositNetwork } from "../types/deposit";
import { NETWORK_OPTIONS } from "../types/deposit";

export function getNetworkSubtitleKey(
  network: DepositNetwork
): TranslationKey {
  return (
    NETWORK_OPTIONS.find((option) => option.id === network)?.subtitleKey ??
    "networkErcSubTrc20"
  );
}

export function buildDepositAddressTitle(
  t: (key: TranslationKey, params?: Record<string, string>) => string,
  currency: DepositCurrency,
  network: DepositNetwork
) {
  return t("depositAddressTitle", { asset: currency, network });
}

export function buildDepositWarning(
  t: (key: TranslationKey, params?: Record<string, string>) => string,
  currency: DepositCurrency,
  networkLabel: string
) {
  return t("depositWarningDynamic", { asset: currency, networkLabel });
}
