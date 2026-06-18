import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuckyWheelModal } from "../components/h5/LuckyWheelModal";
import { StrategyStarBadge } from "../components/StrategyStarBadge";
import { useAuth } from "../context/AuthContext";
import { useH5Portfolio } from "../context/H5PortfolioContext";
import { useUser } from "../context/UserContext";
import { useLocale } from "../i18n/LocaleContext";
import type { TranslationKey } from "../i18n/translations";
import {
  getStrategyTierName,
  resolveActiveStrategyTier,
} from "../lib/strategyTiers";
import { CustomerManagerContacts } from "../components/support/CustomerManagerContacts";

type GridItem = {
  key: TranslationKey;
  icon: string;
  path: string;
};

const FINANCE: GridItem[] = [
  { key: "h5InviteFriends", icon: "fa-envelope-open-text", path: "/invite" },
  { key: "h5MyTeam", icon: "fa-users", path: "/team" },
  { key: "h5MyEarnings", icon: "fa-piggy-bank", path: "/trade" },
];

const SECURITY: GridItem[] = [
  { key: "h5Authenticator", icon: "fa-shield-halved", path: "/certification" },
  { key: "h5TransactionPassword", icon: "fa-lock", path: "/settings" },
  { key: "h5LoginPassword", icon: "fa-key", path: "/settings" },
  { key: "h5Mail", icon: "fa-envelope", path: "/settings" },
];

export default function H5MyProfile() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { displayName, uid } = useUser();
  const { profile, tradeStatus, activeStrategyLabel } = useH5Portfolio();
  const [copied, setCopied] = useState<"uid" | "code" | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);

  const invitationCode = user?.referralCode ?? "—";

  const activeTierId = useMemo(
    () =>
      resolveActiveStrategyTier({
        activeStrategy:
          tradeStatus?.activeStrategy ?? profile?.activeStrategy,
        lockedCapital: profile?.lockedCapital,
        teamSize: profile?.affiliate?.totalActiveMembers,
      }),
    [profile, tradeStatus]
  );

  const tierDisplayName =
    activeStrategyLabel || getStrategyTierName(activeTierId, locale);

  async function copyText(text: string, kind: "uid" | "code") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="pb-4 text-slate-900 dark:text-white">
      <div className="-mx-4 mb-4 border-b border-slate-200/80 bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 pb-6 pt-2 dark:border-white/10 dark:from-[#1a1510] dark:via-[#121820] dark:to-[#0a0e1a]">
        <h1 className="text-center text-lg font-bold text-slate-900 dark:text-white">
          {t("navMy")}
        </h1>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f0b90b]/40 to-slate-400 text-lg font-bold text-slate-900 dark:to-slate-600 dark:text-white">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                {displayName}
              </span>
              <span className="rounded bg-[#f0b90b]/20 px-2 py-0.5 text-[10px] font-bold text-[#b8860b] dark:text-[#f0b90b]">
                {t("h5ValidUser")}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
              <span>UID: {uid}</span>
              <button
                type="button"
                onClick={() => copyText(uid, "uid")}
                className="text-[#c99400] dark:text-[#f0b90b]"
                aria-label={t("copy")}
              >
                <i className="fa-regular fa-copy" aria-hidden />
              </button>
              {copied === "uid" && (
                <span className="text-[10px] text-emerald-600 dark:text-[#00d4aa]">
                  {t("copied")}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
              <span>
                {t("h5InvitationCode")}: {invitationCode}
              </span>
              <button
                type="button"
                onClick={() => copyText(invitationCode, "code")}
                className="text-[#c99400] dark:text-[#f0b90b]"
                aria-label={t("copy")}
              >
                <i className="fa-regular fa-copy" aria-hidden />
              </button>
              {copied === "code" && (
                <span className="text-[10px] text-emerald-600 dark:text-[#00d4aa]">
                  {t("copied")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-slate-900 shadow-sm dark:border-white/10 dark:bg-gradient-to-r dark:from-slate-200/90 dark:to-slate-300/80 dark:text-amber-950">
          <div className="flex items-center gap-2">
            <StrategyStarBadge tierId={activeTierId} size="md" />
            <div>
              <p className="text-[10px] text-slate-600 dark:text-amber-900/80">
                {t("h5CurrentStrategy")}
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-amber-950">
                {tierDisplayName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/trade")}
            className="rounded-full bg-slate-800 px-4 py-1.5 text-xs font-bold text-white dark:bg-[#3d2914]"
          >
            {t("h5UpgradeNow")}
          </button>
        </div>
      </div>

      <div className="-mt-2 rounded-t-3xl border border-slate-200/80 bg-white px-4 pb-6 pt-5 text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white">
        <CustomerManagerContacts
          title={t("supportManagersTitle")}
          subtitle={t("supportManagersSubtitle")}
          className="mb-5 border-slate-200/80 bg-slate-50/90 dark:border-white/10 dark:bg-white/[0.04]"
        />

        <button
          type="button"
          onClick={() => setWheelOpen(true)}
          className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-[#f0b90b]/10 to-orange-500/10 px-4 py-3.5 text-start shadow-sm transition active:scale-[0.98] dark:from-amber-500/20 dark:via-[#f0b90b]/15 dark:to-orange-600/10"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f0b90b]/30 to-amber-700/40 text-[#c99400] dark:text-[#f0b90b]">
            <i
              className="fa-solid fa-gift animate-bounce text-xl"
              aria-hidden
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900 dark:text-white">
              {t("h5DailyLuckyWheel")}
            </span>
            <span className="mt-0.5 block text-[10px] text-slate-600 dark:text-slate-400">
              {t("h5DailyLuckyWheelSub")}
            </span>
          </span>
          <i
            className="fa-solid fa-chevron-right shrink-0 text-xs text-amber-700/80 dark:text-[#f0b90b]/80"
            aria-hidden
          />
        </button>

        <LuckyWheelModal open={wheelOpen} onClose={() => setWheelOpen(false)} />

        <Section title={t("h5Finance")} items={FINANCE} onNavigate={navigate} t={t} />
        <Section
          title={t("h5Security")}
          items={SECURITY}
          onNavigate={navigate}
          t={t}
          cols={4}
        />
      </div>

      <div className="mt-8 px-1">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3.5 text-sm font-bold text-red-400 transition duration-200 hover:bg-red-500/20 active:scale-[0.98] dark:text-red-400"
        >
          <i className="fa-solid fa-power-off text-base" aria-hidden />
          {t("profileLogout")}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  onNavigate,
  t,
  cols = 3,
}: {
  title: string;
  items: GridItem[];
  onNavigate: (path: string) => void;
  t: (k: TranslationKey) => string;
  cols?: 3 | 4;
}) {
  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
        {title}
      </h2>
      <div
        className={`grid gap-4 ${cols === 4 ? "grid-cols-4" : "grid-cols-3"}`}
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.path)}
            className="flex flex-col items-center gap-2 text-center transition active:scale-95"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-amber-900 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-[#f0b90b]">
              <i className={`fa-solid ${item.icon} text-lg`} aria-hidden />
            </span>
            <span className="text-[10px] font-medium leading-tight text-slate-800 dark:text-slate-200">
              {t(item.key)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
