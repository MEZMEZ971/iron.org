import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useInviteCodeFromUrl } from "../hooks/useInviteCodeFromUrl";
import {
  clearStoredReferralCode,
  INVITE_CODE_LENGTH,
  normalizeReferralCode,
  setStoredReferralCode,
} from "../lib/referralStorage";
import { CountryCodeSelect } from "../components/auth/CountryCodeSelect";
import { AuthLayout } from "../layouts/AuthLayout";
import { useLocale } from "../i18n/LocaleContext";
import { resolveUserFacingError } from "../lib/userFacingError";

export default function Register() {
  const { t, dir, locale } = useLocale();
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { codeFromUrl, resolvedCode, hasUrlCode, hasReferralContext } =
    useInviteCodeFromUrl();

  const [username, setUsername] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+971");
  const [phoneCountryIso, setPhoneCountryIso] = useState("AE");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [lockInvite, setLockInvite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resolvedCode) return;
    setInvitationCode(resolvedCode);
    if (codeFromUrl) {
      setLockInvite(true);
    }
  }, [resolvedCode, codeFromUrl]);

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const referralCode =
        normalizeReferralCode(invitationCode) ||
        normalizeReferralCode(resolvedCode);

      await register({
        username: username.trim().toLowerCase(),
        email: email.trim(),
        phone: phone.replace(/\D/g, ""),
        phoneCountryCode,
        password,
        invitationCode: referralCode || undefined,
        referralCode: referralCode || undefined,
      });
      clearStoredReferralCode();
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        resolveUserFacingError(err, t, {
          fallbackKey: "authRegisterFailed",
          locale,
          context: "register",
        })
      );
    } finally {
      setLoading(false);
    }
  }

  const formDisabled = loading;
  const inputClass =
    "w-full rounded-xl border border-df-strong bg-df-inset px-3 py-2.5 text-base text-df placeholder:text-df-faint focus:border-[#f0b90b]/50 focus:outline-none transition-all duration-300 disabled:opacity-50";

  return (
    <AuthLayout title={t("authSignupTitle")} subtitle={t("authSignupSubtitle")}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-df-muted">
            {t("authUsername")}
          </label>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className={inputClass}
            pattern="[a-z0-9_]{3,}"
            disabled={formDisabled}
            required
          />
        </div>

        <div dir={dir}>
          <label className="mb-1.5 block text-xs font-medium text-df-muted">
            {t("authPhone")}
          </label>
          <div
            className={`flex gap-2 transition-all duration-300 ease-in-out ${
              dir === "rtl" ? "flex-row-reverse" : ""
            }`}
          >
            <CountryCodeSelect
              value={phoneCountryCode}
              selectedIso={phoneCountryIso}
              onChange={(code, country) => {
                setPhoneCountryCode(code);
                if (country) setPhoneCountryIso(country.iso2);
              }}
            />
            <input
              type="tel"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("authPhonePlaceholder")}
              className={`min-w-0 flex-1 ${inputClass}`}
              dir={dir}
              disabled={formDisabled}
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-df-muted">
            {t("authEmail")}
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            disabled={formDisabled}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-df-muted">
            {t("authPassword")}
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className={inputClass}
            disabled={formDisabled}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-df-muted">
            {t("authInvitationCode")}
          </label>
          <input
            type="text"
            value={invitationCode}
            onChange={(e) => {
              const next = normalizeReferralCode(e.target.value);
              setInvitationCode(next);
              if (next) setStoredReferralCode(next);
            }}
            disabled={formDisabled}
            readOnly={lockInvite && hasUrlCode}
            maxLength={INVITE_CODE_LENGTH}
            className={`${inputClass} ${lockInvite && hasUrlCode ? "border-[#f0b90b]/40 bg-[#f0b90b]/5" : ""}`}
            placeholder={t("authInvitationOptional")}
            autoCapitalize="characters"
            spellCheck={false}
          />
          {hasUrlCode && (
            <p className="mt-1 text-[10px] text-[#00d4aa]">{t("authInviteAutoFilled")}</p>
          )}
          {!hasUrlCode && hasReferralContext && (
            <p className="mt-1 text-[10px] text-[#00d4aa]">{t("authInviteAutoFilled")}</p>
          )}
          {lockInvite && hasUrlCode && (
            <button
              type="button"
              onClick={() => setLockInvite(false)}
              className="mt-1 text-[10px] text-[#f0b90b] underline"
            >
              {t("authInviteUnlock")}
            </button>
          )}
        </div>

        {error && (
          <p className="text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
            disabled={loading || isAuthenticated}
          className="w-full rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] py-3.5 text-sm font-bold text-[#0a0e1a] shadow-lg shadow-[#f0b90b]/25 transition-all duration-300 ease-in-out hover:brightness-110 disabled:opacity-50"
        >
          {loading ? t("authCreatingAccount") : t("authSignup")}
        </button>

        <p className="text-center text-xs text-df-muted">
          {t("authHaveAccount")}{" "}
          <Link to="/login" className="font-semibold text-[#f0b90b] hover:underline">
            {t("authLogin")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
