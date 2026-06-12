import { useEffect, useState, type ReactNode } from "react";
import {
  sendProfileEmailOtp,
  updateUserProfileSettings,
} from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { useLocale } from "../i18n/LocaleContext";

type SettingsView = "hub" | "login-password" | "payment-password";

const PANEL =
  "rounded-xl border border-white/[0.06] bg-[rgba(26,31,46,0.65)] backdrop-blur-md";

const GOLD_BTN =
  "btn-golden-glow flex-1 rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] py-3 text-sm font-bold text-[#0a0e1a] shadow-lg shadow-[#f0b90b]/20";

const GHOST_BTN =
  "flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-df-muted transition hover:bg-white/[0.06]";

function ModalShell({
  title,
  onClose,
  children,
  footer,
  closeLabel,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label={closeLabel}
      />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e1a]/95 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-center text-base font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute end-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
          >
            <i className="fa-solid fa-xmark text-sm" aria-hidden />
          </button>
        </header>
        <div className="space-y-4 px-5 py-5">{children}</div>
        {footer && (
          <footer className="flex gap-3 border-t border-white/[0.06] px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  inputMode,
  maxLength,
  showPasswordLabel,
  hidePasswordLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  inputMode?: "numeric" | "text";
  maxLength?: number;
  showPasswordLabel: string;
  hidePasswordLabel: string;
}) {
  return (
    <div className={`${PANEL} flex items-center gap-3 px-4 py-3`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0b90b]/15 text-[#f0b90b]">
        <i className="fa-solid fa-lock text-sm" aria-hidden />
      </span>
      <input
        type={visible ? "text" : "password"}
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="min-w-0 flex-1 bg-transparent text-sm text-df placeholder:text-df-faint focus:outline-none"
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="shrink-0 text-df-faint hover:text-[#f0b90b]"
        aria-label={visible ? hidePasswordLabel : showPasswordLabel}
      >
        <i
          className={`fa-solid ${visible ? "fa-eye-slash" : "fa-eye"} text-sm`}
          aria-hidden
        />
      </button>
    </div>
  );
}

export default function Settings() {
  const { t, dir } = useLocale();
  const rtl = dir === "rtl";
  const { user, patchUser } = useAuth();
  const { userId, displayName, setDisplayName } = useUser();
  const { profile, refresh } = useUserProfile(userId);

  const [view, setView] = useState<SettingsView>("hub");
  const [emailOpen, setEmailOpen] = useState(false);
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [nickname, setNickname] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rowEmail = profile?.email || user?.email || "—";

  const activeNickname = profile?.displayName || displayName || "—";

  useEffect(() => {
    if (emailOpen) setEmail(profile?.email || user?.email || "");
  }, [emailOpen, profile?.email, user?.email]);

  useEffect(() => {
    if (nicknameOpen) setNickname(activeNickname === "—" ? "" : activeNickname);
  }, [nicknameOpen, activeNickname]);

  useEffect(() => {
    setOldPassword("");
    setNewPassword("");
    setShowOld(false);
    setShowNew(false);
  }, [view]);

  async function handleSendOtp() {
    setError(null);
    setBusy(true);
    try {
      await sendProfileEmailOtp(email.trim());
      setNotice(t("settingsOtpSent"));
      window.setTimeout(() => setNotice(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settingsUpdateFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailConfirm() {
    setError(null);
    setBusy(true);
    try {
      const result = await updateUserProfileSettings({
        email: email.trim(),
        verificationCode: otp.trim(),
      });
      patchUser({
        email: result.user.email ?? email.trim(),
        displayName: result.user.displayName,
      });
      await refresh();
      setEmailOpen(false);
      setNotice(t("settingsUpdateSuccess"));
      window.setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settingsUpdateFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleNicknameConfirm() {
    setError(null);
    setBusy(true);
    try {
      const result = await updateUserProfileSettings({
        displayName: nickname.trim(),
      });
      const name = result.user.displayName || nickname.trim();
      setDisplayName(name);
      patchUser({ displayName: name });
      await refresh();
      setNicknameOpen(false);
      setNotice(t("settingsUpdateSuccess"));
      window.setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settingsUpdateFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordSubmit(passwordType: "login" | "payment") {
    setError(null);
    setBusy(true);
    try {
      await updateUserProfileSettings({
        passwordType,
        oldPassword,
        newPassword,
      });
      setView("hub");
      setNotice(t("settingsUpdateSuccess"));
      window.setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settingsUpdateFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (view === "login-password" || view === "payment-password") {
    const isPayment = view === "payment-password";
    return (
      <div className="mx-auto min-h-[60vh] max-w-lg space-y-4 pb-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setView("hub")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-df-strong text-df-muted transition hover:border-[#f0b90b]/40"
            aria-label={t("back")}
          >
            {rtl ? "→" : "←"}
          </button>
          <h1 className="text-lg font-bold text-df">
            {isPayment
              ? t("settingsPaymentPasswordTitle")
              : t("settingsChangePasswordTitle")}
          </h1>
        </div>

        {notice && (
          <p className="rounded-lg bg-[#00d4aa]/10 px-3 py-2 text-center text-xs text-[#00d4aa]">
            {notice}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <PasswordField
            label={t("settingsOldPasswordPlaceholder")}
            value={oldPassword}
            onChange={setOldPassword}
            visible={showOld}
            onToggleVisible={() => setShowOld((v) => !v)}
            inputMode={isPayment ? "numeric" : "text"}
            maxLength={isPayment ? 6 : undefined}
            showPasswordLabel={t("settingsShowPassword")}
            hidePasswordLabel={t("settingsHidePassword")}
          />
          <PasswordField
            label={t("settingsNewPasswordPlaceholder")}
            value={newPassword}
            onChange={setNewPassword}
            visible={showNew}
            onToggleVisible={() => setShowNew((v) => !v)}
            inputMode={isPayment ? "numeric" : "text"}
            maxLength={isPayment ? 6 : undefined}
            showPasswordLabel={t("settingsShowPassword")}
            hidePasswordLabel={t("settingsHidePassword")}
          />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => handlePasswordSubmit(isPayment ? "payment" : "login")}
          className={`${GOLD_BTN} mt-6 w-full flex-none disabled:opacity-60`}
        >
          {isPayment ? t("settingsConfirm") : t("settingsSubmit")}
        </button>

      </div>
    );
  }

  const hubRows: {
    label: string;
    value?: string;
    onClick?: () => void;
    static?: boolean;
  }[] = [
    { label: t("settingsEmail"), value: rowEmail, onClick: () => setEmailOpen(true) },
    {
      label: t("settingsNickname"),
      value: activeNickname,
      onClick: () => setNicknameOpen(true),
    },
    {
      label: t("settingsLoginPassword"),
      onClick: () => setView("login-password"),
    },
    {
      label: t("settingsPaymentPassword"),
      onClick: () => setView("payment-password"),
    },
    { label: t("settingsContactUs"), onClick: () => setSupportOpen(true) },
    {
      label: t("settingsVersion"),
      value: t("settingsAppVersion"),
      static: true,
    },
  ];

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <PageHeader title={t("settingsHubTitle")} />

      {notice && (
        <p className="rounded-lg bg-[#00d4aa]/10 px-3 py-2 text-center text-xs text-[#00d4aa]">
          {notice}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0e1a]/80">
        <ul>
          {hubRows.map((row, index) => (
            <li
              key={row.label}
              className={
                index < hubRows.length - 1 ? "border-b border-white/[0.06]" : ""
              }
            >
              {row.static ? (
                <div className={`${PANEL} flex items-center gap-3 rounded-none border-0 px-4 py-4`}>
                  <span className="flex-1 text-sm font-medium text-df">
                    {row.label}
                  </span>
                  <span className="text-sm text-df-muted">{row.value}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={row.onClick}
                  className={`${PANEL} flex w-full items-center gap-3 rounded-none border-0 px-4 py-4 text-start transition hover:bg-white/[0.04] active:bg-[#f0b90b]/5`}
                >
                  <span className="flex-1 text-sm font-medium text-df">
                    {row.label}
                  </span>
                  {row.value && (
                    <span className="max-w-[50%] truncate text-sm text-df-muted">
                      {row.value}
                    </span>
                  )}
                  <i
                    className={`fa-solid fa-chevron-right shrink-0 text-xs text-df-faint ${
                      rtl ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {emailOpen && (
        <ModalShell
          title={t("settingsEmailModalTitle")}
          closeLabel={t("close")}
          onClose={() => {
            setEmailOpen(false);
            setError(null);
          }}
          footer={
            <>
              <button
                type="button"
                className={GHOST_BTN}
                onClick={() => setEmailOpen(false)}
              >
                {t("settingsCancel")}
              </button>
              <button
                type="button"
                className={GOLD_BTN}
                disabled={busy}
                onClick={handleEmailConfirm}
              >
                {t("settingsConfirm")}
              </button>
            </>
          }
        >
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <label className="text-xs font-medium text-df-faint">email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("settingsEmailPlaceholder")}
              className={`${PANEL} w-full px-4 py-3 text-sm text-df placeholder:text-df-faint focus:outline-none focus:ring-1 focus:ring-[#f0b90b]/40`}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-df-faint">
              {t("settingsVerificationCode")}
            </label>
            <div className={`${PANEL} flex items-center gap-2 px-3 py-2`}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder={t("settingsVerificationCode")}
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-df placeholder:text-df-faint focus:outline-none"
              />
              <button
                type="button"
                disabled={busy || !email.trim()}
                onClick={handleSendOtp}
                className="shrink-0 rounded-lg border border-[#f0b90b]/50 bg-[#f0b90b]/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#f0b90b] transition hover:bg-[#f0b90b]/20 disabled:opacity-50"
              >
                {t("settingsSendOtp")}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {nicknameOpen && (
        <ModalShell
          title={t("settingsNicknameModalTitle")}
          closeLabel={t("close")}
          onClose={() => {
            setNicknameOpen(false);
            setError(null);
          }}
          footer={
            <>
              <button
                type="button"
                className={GHOST_BTN}
                onClick={() => setNicknameOpen(false)}
              >
                {t("settingsCancel")}
              </button>
              <button
                type="button"
                className={GOLD_BTN}
                disabled={busy}
                onClick={handleNicknameConfirm}
              >
                {t("settingsConfirm")}
              </button>
            </>
          }
        >
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <label className="text-xs font-medium text-df-faint">
              {t("settingsNicknameLabel")}
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t("settingsNicknamePlaceholder")}
              className={`${PANEL} w-full px-4 py-3 text-sm text-df placeholder:text-df-faint focus:outline-none focus:ring-1 focus:ring-[#f0b90b]/40`}
            />
          </div>
        </ModalShell>
      )}

      {supportOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-card w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0a0e1a]/95 p-5">
            <h3 className="text-base font-bold text-df">
              {t("profileCustomerService")}
            </h3>
            <p className="mt-2 text-sm text-df-muted">{t("supportModalBody")}</p>
            <button
              type="button"
              onClick={() => setSupportOpen(false)}
              className="mt-4 w-full rounded-xl bg-[#f0b90b]/20 py-2.5 text-sm font-semibold text-[#f0b90b]"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
