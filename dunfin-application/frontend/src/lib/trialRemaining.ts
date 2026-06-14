/** Format remaining trial time for banner display. */
export function formatTrialRemaining(
  expiresAt: string | null | undefined,
  locale: string
): string {
  if (!expiresAt) return locale === "ar" ? "3 أيام" : "3 days";

  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return locale === "ar" ? "أقل من ساعة" : "less than 1 hour";

  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours >= 48) {
    const days = Math.ceil(hours / 24);
    return locale === "ar" ? `${days} أيام` : `${days} days`;
  }
  return locale === "ar" ? `${hours} ساعة` : `${hours} hours`;
}
