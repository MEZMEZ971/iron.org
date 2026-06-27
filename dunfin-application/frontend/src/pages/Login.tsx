import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ForgotPasswordSupportModal } from "../components/auth/ForgotPasswordSupportModal";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "../layouts/AuthLayout";
import { useLocale } from "../i18n/LocaleContext";
import { resolveUserFacingError } from "../lib/userFacingError";

export default function Login() {
  const { t, locale } = useLocale();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from || "/";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, from, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await login(identifier.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        resolveUserFacingError(err, t, {
          fallbackKey: "authLoginFailed",
          locale,
          context: "login",
        })
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title={t("authLoginTitle")} subtitle={t("authLoginSubtitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-df-muted">
            {t("authIdentifier")}
          </label>
          <input
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={t("authIdentifierPlaceholder")}
            className="w-full rounded-xl border border-df-strong bg-df-inset px-3 py-2.5 text-base text-df placeholder:text-df-faint focus:border-[#f0b90b]/50 focus:outline-none transition-all duration-300"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-df-muted">
            {t("authPassword")}
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-df-strong bg-df-inset px-3 py-2.5 text-base text-df focus:border-[#f0b90b]/50 focus:outline-none transition-all duration-300 disabled:opacity-50"
            disabled={loading}
            required
          />
        </div>

        <div className="mb-5 flex items-center justify-between px-1">
          <label className="group flex cursor-pointer select-none items-center space-x-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-1 focus:ring-amber-500 focus:ring-offset-slate-900 disabled:opacity-50"
            />
            <span className="text-sm text-slate-300 transition-colors duration-200 group-hover:text-white">
              {t("authRememberMe")}
            </span>
          </label>
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="text-sm font-medium text-[#f0b90b] transition hover:text-[#fcd535] hover:underline"
          >
            {t("authForgotPassword")}
          </button>
        </div>

        {error && (
          <p className="text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] py-3.5 text-sm font-bold text-[#0a0e1a] shadow-lg shadow-[#f0b90b]/25 transition-all duration-300 ease-in-out hover:brightness-110 disabled:opacity-50"
        >
          {loading ? t("authSigningIn") : t("authLogin")}
        </button>

        <p className="text-center text-xs text-df-muted">
          {t("authNoAccount")}{" "}
          <Link to="/register" className="font-semibold text-[#f0b90b] hover:underline">
            {t("authSignup")}
          </Link>
        </p>
      </form>

      <ForgotPasswordSupportModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
      />
    </AuthLayout>
  );
}
