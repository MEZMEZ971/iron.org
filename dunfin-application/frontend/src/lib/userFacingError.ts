import { ApiError, ApiNetworkError } from "../api/client";
import type { TranslationKey } from "../i18n/translations";

export type ResolveErrorOptions = {
  /** Primary fallback when the error cannot be shown safely. */
  fallbackKey?: TranslationKey;
  /** Shown for network / timeout / unreachable API. */
  networkKey?: TranslationKey;
  /** Shown for deposit / on-chain flows. */
  blockchainKey?: TranslationKey;
  locale?: string;
  /** Logged to console.error for engineers. */
  context?: string;
};

const TECHNICAL_PATTERNS = [
  /\bP\d{4}\b/i,
  /prisma/i,
  /npm run/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /fetch failed/i,
  /invalid json/i,
  /request failed \(\d+\)/i,
  /internal server error/i,
  /postgresql|postgres|sqlite|sqlstate/i,
  /unexpected token/i,
  /cannot connect to api/i,
  /vite_api_url/i,
  /node_modules/i,
  /stack trace/i,
];

/** Business-safe API codes mapped to curated copy (never raw server text). */
const CODE_TO_MESSAGE_KEY: Partial<Record<string, TranslationKey>> = {
  ACCOUNT_DEACTIVATED: "authAccountDeactivated",
  INVALID_CREDENTIALS: "authLoginFailed",
  INVALID_USERNAME: "authRegisterFailed",
  INVALID_EMAIL: "authRegisterFailed",
  INVALID_PHONE: "authRegisterFailed",
  INVALID_PASSWORD: "authRegisterFailed",
  USERNAME_TAKEN: "authRegisterFailed",
  EMAIL_TAKEN: "authRegisterFailed",
  PHONE_TAKEN: "authRegisterFailed",
  SPIN_ALREADY_USED: "h5SpinLimitEn",
  NOT_FUNDED: "h5SpinNotFunded",
  DEPOSIT_REQUIRED_TO_SPIN: "h5SpinDepositRequired",
  WRONG_PAYMENT_PASSWORD: "h5PaymentWrongPin",
  WRONG_PAYMENT_PIN: "h5PaymentWrongPin",
  PAYMENT_PASSWORD_NOT_SET: "h5PaymentPinNotSetup",
  PAYMENT_PASSWORD_REQUIRED: "h5PaymentVerifySubtitle",
  PAYMENT_PIN_REQUIRED: "h5PaymentVerifySubtitle",
  QUALIFICATION_DENIED: "tradeExecuteFailed",
  INSUFFICIENT_BALANCE: "insufficientBalance",
};

function isTechnicalMessage(message: string): boolean {
  const text = String(message || "").trim();
  if (!text) return true;
  if (text.length > 220) return true;
  if (/`/.test(text)) return true;
  if (/\bat\s+[\w./-]+:\d+/.test(text)) return true;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(text));
}

export function logApiError(error: unknown, context?: string): void {
  const label = context ? `[${context}]` : "[ui]";
  console.error(label, error);
}

/**
 * Maps any thrown API/runtime error to premium, user-safe copy.
 * Full detail is logged to the console only.
 */
export function resolveUserFacingError(
  error: unknown,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  options: ResolveErrorOptions = {}
): string {
  const {
    fallbackKey = "errorGeneric",
    networkKey = "errorNetworkBusy",
    blockchainKey = "errorSecuringConnection",
    locale,
    context,
  } = options;

  logApiError(error, context);

  if (error instanceof ApiNetworkError) {
    return t(networkKey);
  }

  if (error instanceof ApiError) {
    if (error.code && CODE_TO_MESSAGE_KEY[error.code]) {
      const key = CODE_TO_MESSAGE_KEY[error.code]!;
      if (
        error.code === "SPIN_ALREADY_USED" &&
        locale &&
        locale.startsWith("ar")
      ) {
        return t("h5SpinLimitAr");
      }
      if (
        (error.code === "WRONG_PAYMENT_PASSWORD" ||
          error.code === "WRONG_PAYMENT_PIN" ||
          error.code === "PAYMENT_PASSWORD_NOT_SET") &&
        locale?.startsWith("ar") &&
        error.errorAr
      ) {
        return error.errorAr;
      }
      return t(key);
    }

    const localized =
      locale?.startsWith("ar") && error.errorAr ? error.errorAr : error.message;

    if (localized && !isTechnicalMessage(localized)) {
      return localized;
    }

    if (error.status === 408 || error.status === 504 || error.status >= 500) {
      return t(networkKey);
    }

    if (
      context &&
      /deposit|chain|wallet|sync/i.test(context)
    ) {
      return t(blockchainKey);
    }

    return t(fallbackKey);
  }

  if (error instanceof Error && !isTechnicalMessage(error.message)) {
    return error.message;
  }

  return t(fallbackKey);
}
