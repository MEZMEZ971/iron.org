import type { TranslationKey } from "../i18n/translations";

type TranslateFn = (
  key: TranslationKey,
  vars?: Record<string, string | number>
) => string;

/** Format remaining trial time for banner display. */
export function formatTrialRemaining(
  expiresAt: string | null | undefined,
  t: TranslateFn
): string {
  if (!expiresAt) return t("trialRemainingDefault");

  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return t("trialRemainingLessThanHour");

  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours >= 48) {
    const days = Math.ceil(hours / 24);
    return t("trialRemainingDays", { days });
  }
  return t("trialRemainingHours", { hours });
}
