import { FormEvent, useCallback, useState, type ReactNode } from "react";
import {
  adminLookupUser,
  adminMutateBalance,
  adminToggleUserStatus,
  type AdminControlledUser,
} from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useH5Portfolio } from "../../context/H5PortfolioContext";
import { useLocale } from "../../i18n/LocaleContext";
import { emitWalletRefresh } from "../../lib/walletSync";
import { useUser } from "../../context/UserContext";

const PANEL =
  "rounded-xl border border-white/[0.06] bg-[rgba(26,31,46,0.65)] backdrop-blur-md transition-all duration-300 ease-in-out";

const GOLD_BTN =
  "rounded-lg bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] px-4 py-2 text-xs font-bold text-[#0a0e1a] transition-all duration-300 hover:shadow-[0_0_12px_rgba(240,185,11,0.35)] disabled:opacity-50";

const GHOST_BTN =
  "rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-df-muted transition-all duration-300 hover:border-red-400/40 hover:text-red-400 disabled:opacity-50";

interface Props {
  onNotice: (msg: string) => void;
}

function parseMutationAmount(raw: string): number | null {
  const cleaned = String(raw).trim().replace(/,/g, "");
  if (!cleaned) return null;
  const amount = parseFloat(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function UserControlHub({ onNotice }: Props) {
  const { t, dir } = useLocale();
  const rtl = dir === "rtl";
  const { user: authUser } = useAuth();
  const { userId: sessionUserId, uid: sessionUid } = useUser();
  const h5Portfolio = useH5Portfolio();

  const [uidQuery, setUidQuery] = useState("");
  const [user, setUser] = useState<AdminControlledUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [debitAmount, setDebitAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const fetchTargetUserAdminLookup = useCallback(async (uid: string) => {
    const result = await adminLookupUser(uid);
    return result.user;
  }, []);

  const syncWalletAcrossApp = useCallback(
    (target: AdminControlledUser) => {
      emitWalletRefresh({
        userId: target.userId,
        uid: target.uid,
        walletBalance: target.walletBalance,
      });

      const isSelf =
        target.userId === sessionUserId ||
        target.uid === sessionUid ||
        target.userId === authUser?.id ||
        target.uid === authUser?.uid;

      if (isSelf) {
        void h5Portfolio.refresh({ skipChainSync: true });
      }
    },
    [authUser?.id, authUser?.uid, h5Portfolio.refresh, sessionUid, sessionUserId]
  );

  const applyUserFromServer = useCallback(
    (target: AdminControlledUser) => {
      setUser(target);
      syncWalletAcrossApp(target);
    },
    [syncWalletAcrossApp]
  );

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    const uid = uidQuery.replace(/\D/g, "").slice(0, 8);
    if (uid.length !== 8) {
      onNotice(t("adminUidInvalid"));
      return;
    }
    setSearching(true);
    setUser(null);
    try {
      const lookedUp = await fetchTargetUserAdminLookup(uid);
      setUser(lookedUp);
      setUidQuery(lookedUp.uid);
    } catch (err) {
      onNotice(err instanceof Error ? err.message : t("adminUserNotFound"));
    } finally {
      setSearching(false);
    }
  }

  async function handleCredit() {
    if (!user) return;

    const amount = parseMutationAmount(creditAmount);
    if (amount === null) {
      onNotice(t("adminAmountInvalid"));
      return;
    }

    setBusy("credit");
    try {
      const response = await adminMutateBalance(user.uid, {
        action: "CREDIT",
        amount,
      });

      const refreshed = await fetchTargetUserAdminLookup(user.uid);
      const merged: AdminControlledUser = {
        ...refreshed,
        walletBalance: response.walletBalance ?? response.user.walletBalance,
      };

      applyUserFromServer(merged);
      setCreditAmount("");
      onNotice(t("adminCreditSuccess"));
    } catch (error) {
      console.error("Balance adjustment pipeline failure:", error);
      onNotice(
        error instanceof Error
          ? error.message
          : "Failed to commit balance adjustment on backend server."
      );
      try {
        const rollback = await fetchTargetUserAdminLookup(user.uid);
        setUser(rollback);
      } catch {
        /* lookup card will stay on last known state */
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleDebit() {
    if (!user) return;

    const amount = parseMutationAmount(debitAmount);
    if (amount === null) {
      onNotice(t("adminAmountInvalid"));
      return;
    }

    setBusy("debit");
    try {
      const response = await adminMutateBalance(user.uid, {
        action: "DEBIT",
        amount,
      });

      const refreshed = await fetchTargetUserAdminLookup(user.uid);
      const merged: AdminControlledUser = {
        ...refreshed,
        walletBalance: response.walletBalance ?? response.user.walletBalance,
      };

      applyUserFromServer(merged);
      setDebitAmount("");
      onNotice(t("adminDebitSuccess"));
    } catch (error) {
      console.error("Balance adjustment pipeline failure:", error);
      onNotice(
        error instanceof Error
          ? error.message
          : "Failed to commit balance adjustment on backend server."
      );
      try {
        const rollback = await fetchTargetUserAdminLookup(user.uid);
        setUser(rollback);
      } catch {
        /* lookup card will stay on last known state */
      }
    } finally {
      setBusy(null);
    }
  }

  async function setAccountActive(nextActive: boolean) {
    if (!user) return;
    setBusy("status");
    try {
      const result = await adminToggleUserStatus(user.uid, {
        status: nextActive ? "ACTIVE" : "SUSPENDED",
      });
      setUser(result.user);
      onNotice(
        nextActive ? t("adminAccountActivated") : t("adminAccountSuspended")
      );
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  const isActive = user?.accountActive !== false;
  const balanceDisplay = user
    ? `${user.walletBalance.toLocaleString(undefined, {
        maximumFractionDigits: 6,
      })} USDT`
    : "";

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className={`${PANEL} p-4`}>
        <h2 className="text-sm font-bold text-white">{t("adminUserControlTitle")}</h2>
        <p className="mt-1 text-xs text-df-muted">{t("adminUserControlDesc")}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={uidQuery}
              onChange={(e) => setUidQuery(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder={t("adminUidSearchPlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-[#0a0e1a] py-3 pe-12 ps-4 font-mono text-sm text-df placeholder:text-df-faint focus:outline-none focus:ring-1 focus:ring-[#f0b90b]/40"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className={`${GOLD_BTN} inline-flex shrink-0 items-center justify-center gap-2 px-5`}
          >
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            {searching ? t("adminSearching") : t("adminUidSearch")}
          </button>
        </div>
      </form>

      {user && (
        <div className={`${PANEL} space-y-5 p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-df-faint">
                {t("adminProfileCardTitle")}
              </p>
              <p className="mt-1 text-lg font-bold text-white">{user.displayName}</p>
              <p className="font-mono text-sm text-[#f0b90b]">{user.uid}</p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                isActive
                  ? "bg-[#00d4aa]/15 text-[#00d4aa] ring-1 ring-[#00d4aa]/30"
                  : "bg-red-500/15 text-red-400 ring-1 ring-red-400/30"
              }`}
            >
              {isActive ? t("adminStatusActive") : t("adminStatusSuspended")}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileStat label={t("adminFieldEmail")} value={user.email || "—"} />
            <ProfileStat
              label={t("adminFieldBalance")}
              value={balanceDisplay}
              accent
              highlight
              key={`balance-${user.uid}-${user.walletBalance}`}
            />
            <ProfileStat
              label={t("adminFieldRegistered")}
              value={new Date(user.registrationDate).toLocaleDateString()}
            />
            <ProfileStat label={t("adminFieldRole")} value={user.role} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ActionBlock title={t("adminGiveReward")}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  inputMode="decimal"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder={t("adminAmountPlaceholder")}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm text-df focus:outline-none focus:ring-1 focus:ring-[#f0b90b]/40"
                  dir="ltr"
                />
                <button
                  type="button"
                  disabled={busy === "credit" || !creditAmount.trim()}
                  onClick={() => void handleCredit()}
                  className={GOLD_BTN}
                >
                  {busy === "credit" ? "…" : t("adminGiveRewardBtn")}
                </button>
              </div>
            </ActionBlock>

            <ActionBlock title={t("adminDeductFunds")}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  inputMode="decimal"
                  value={debitAmount}
                  onChange={(e) => setDebitAmount(e.target.value)}
                  placeholder={t("adminAmountPlaceholder")}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm text-df focus:outline-none focus:ring-1 focus:ring-[#f0b90b]/40"
                  dir="ltr"
                />
                <button
                  type="button"
                  disabled={busy === "debit" || !debitAmount.trim()}
                  onClick={() => void handleDebit()}
                  className={GHOST_BTN}
                >
                  {busy === "debit" ? "…" : t("adminDeductFundsBtn")}
                </button>
              </div>
            </ActionBlock>
          </div>

          <div className={`${PANEL} border-white/[0.04] bg-[#0a0e1a]/40 p-4`}>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-df-faint">
              {t("adminAccountStatusToggle")}
            </p>
            <div
              className={`flex flex-wrap items-center justify-between gap-4 ${
                rtl ? "flex-row-reverse" : ""
              }`}
            >
              <div className="flex gap-4 text-sm">
                <span className={isActive ? "font-bold text-[#00d4aa]" : "text-df-faint"}>
                  {t("adminStatusActive")}
                </span>
                <span
                  className={!isActive ? "font-bold text-red-400" : "text-df-faint"}
                >
                  {t("adminStatusSuspended")}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                disabled={busy === "status"}
                onClick={() => setAccountActive(!isActive)}
                className={`relative h-9 w-[4.5rem] shrink-0 rounded-full transition-all duration-300 ${
                  isActive ? "bg-[#00d4aa]/30" : "bg-red-500/25"
                }`}
              >
                <span
                  className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-md transition-all duration-300 ${
                    isActive
                      ? rtl
                        ? "start-1"
                        : "end-1"
                      : rtl
                        ? "end-1"
                        : "start-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileStat({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        highlight
          ? "border-[#f0b90b]/30 bg-[#f0b90b]/5 ring-1 ring-[#f0b90b]/15"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-df-faint">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold tabular-nums transition-all duration-300 ${
          accent ? "text-[#f0b90b]" : "text-df"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ActionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="mb-3 text-xs font-bold text-[#f0b90b]">{title}</p>
      {children}
    </div>
  );
}
