import { Link } from "react-router-dom";
import { IronLogo } from "../components/layout/IronLogo";
import { useLocale } from "../i18n/LocaleContext";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <div
      className="not-found-cosmic relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 py-12 text-center"
      role="alert"
      aria-live="polite"
    >
      <div className="not-found-stars pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute -top-24 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#f0b90b]/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 end-0 h-64 w-64 rounded-full bg-[#00d4aa]/8 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex max-w-lg flex-col items-center">
        <IronLogo size={52} className="mb-6 opacity-90" />

        <div className="not-found-orbit relative mb-8 flex h-36 w-36 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full border border-dashed border-[#f0b90b]/25"
            aria-hidden
          />
          <div
            className="absolute inset-3 rounded-full border border-[#00d4aa]/20"
            aria-hidden
          />
          <p className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-[#fcd535] via-[#f0b90b] to-[#00d4aa] drop-shadow-[0_0_24px_rgba(240,185,11,0.45)] sm:text-7xl">
            {t("notFoundCode")}
          </p>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          <span className="text-[#f0b90b]">{t("notFoundCode")}</span>
          <span className="text-white/80"> — </span>
          {t("notFoundTitle")}
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
          {t("notFoundSubtitle")}
        </p>

        <Link
          to="/"
          className="btn-golden-glow mt-10 inline-flex min-w-[240px] items-center justify-center rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] px-8 py-3.5 text-sm font-bold text-[#0a0e1a] shadow-lg shadow-[#f0b90b]/25 transition-all duration-300"
        >
          {t("notFoundCta")}
        </Link>
      </div>
    </div>
  );
}
