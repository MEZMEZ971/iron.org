import { useNavigate } from "react-router-dom";
import { useProfileMenu } from "../context/ProfileMenuContext";
import { useUser } from "../context/UserContext";
import { useLocale } from "../i18n/LocaleContext";

interface HeaderProps {
  compact?: boolean;
}

export function Header({ compact }: HeaderProps) {
  const { t } = useLocale();
  const { open } = useProfileMenu();
  const { displayName } = useUser();
  const navigate = useNavigate();

  const initials = displayName.slice(0, 1).toUpperCase();

  function openProfile() {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) {
      navigate("/my");
      return;
    }
    open();
  }

  return (
    <header className="glass-card flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={openProfile}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f0b90b] to-[#fcd535] text-sm font-bold text-[#0a0e1a] ring-2 ring-[#f0b90b]/20 transition hover:ring-[#f0b90b]/50"
          aria-label={t("profileMenu")}
        >
          {initials}
        </button>
        {!compact && (
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-df">{t("brand")}</h1>
            <p className="truncate text-[10px] text-df-faint">{t("tagline")}</p>
          </div>
        )}
        {compact && (
          <span className="truncate text-sm font-bold text-df">{t("brand")}</span>
        )}
      </div>
    </header>
  );
}
