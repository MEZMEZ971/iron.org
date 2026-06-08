import { useNavigate } from "react-router-dom";
import { useLocale } from "../i18n/LocaleContext";

interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  const navigate = useNavigate();
  const { t, dir } = useLocale();
  const rtl = dir === "rtl";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-df-strong text-df-muted transition-all duration-300 ease-in-out hover:border-[#f0b90b]/40"
        aria-label={t("back")}
      >
        {rtl ? "→" : "←"}
      </button>
      <h1 className="text-lg font-bold text-df">{title}</h1>
    </div>
  );
}
