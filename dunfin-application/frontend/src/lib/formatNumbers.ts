/** Coerce API / form values to a finite number for display and math. */
export function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatAmount(
  value: unknown,
  locale?: string,
  options?: Intl.NumberFormatOptions
): string {
  return safeNumber(value).toLocaleString(locale, options);
}

export function formatUsdt(
  value: unknown,
  locale?: string,
  maximumFractionDigits = 6
): string {
  return formatAmount(value, locale, { maximumFractionDigits });
}
