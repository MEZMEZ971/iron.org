import { useNavigate } from "react-router-dom";
import {
  HelpAccordion,
  HelpClause,
  HelpParagraph,
  HelpSubBlock,
  type HelpSectionDef,
} from "../components/help/HelpAccordion";
import { useLocale } from "../i18n/LocaleContext";
import type { TranslationKey } from "../i18n/translations";

const PRIVACY_CLAUSES: { titleKey: TranslationKey; bodyKey: TranslationKey }[] =
  [
    { titleKey: "helpPrivacy1Title", bodyKey: "helpPrivacy1Body" },
    { titleKey: "helpPrivacy2Title", bodyKey: "helpPrivacy2Body" },
    { titleKey: "helpPrivacy3Title", bodyKey: "helpPrivacy3Body" },
    { titleKey: "helpPrivacy4Title", bodyKey: "helpPrivacy4Body" },
    { titleKey: "helpPrivacy5Title", bodyKey: "helpPrivacy5Body" },
    { titleKey: "helpPrivacy6Title", bodyKey: "helpPrivacy6Body" },
    { titleKey: "helpPrivacy7Title", bodyKey: "helpPrivacy7Body" },
    { titleKey: "helpPrivacy8Title", bodyKey: "helpPrivacy8Body" },
    { titleKey: "helpPrivacy9Title", bodyKey: "helpPrivacy9Body" },
    { titleKey: "helpPrivacy10Title", bodyKey: "helpPrivacy10Body" },
    { titleKey: "helpPrivacy11Title", bodyKey: "helpPrivacy11Body" },
  ];

const ABOUT_BLOCKS: { titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { titleKey: "helpAboutOverviewTitle", bodyKey: "helpAboutOverviewBody" },
  { titleKey: "helpAboutHistoryTitle", bodyKey: "helpAboutHistoryBody" },
  { titleKey: "helpAboutServicesTitle", bodyKey: "helpAboutServicesBody" },
  { titleKey: "helpAboutInnovationTitle", bodyKey: "helpAboutInnovationBody" },
  { titleKey: "helpAboutOutlookTitle", bodyKey: "helpAboutOutlookBody" },
];

const AFFILIATE_BLOCKS: { titleKey: TranslationKey; bodyKey: TranslationKey }[] =
  [
    { titleKey: "helpAffiliateWhyTitle", bodyKey: "helpAffiliateWhyBody" },
    { titleKey: "helpAffiliateHowTitle", bodyKey: "helpAffiliateHowBody" },
    { titleKey: "helpAffiliateRulesTitle", bodyKey: "helpAffiliateRulesBody" },
    { titleKey: "helpAffiliateRewardsTitle", bodyKey: "helpAffiliateRewardsBody" },
    { titleKey: "helpAffiliateFaqTitle", bodyKey: "helpAffiliateFaqBody" },
  ];

const LICENSE_CARDS: { titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { titleKey: "helpLicenseCard1Title", bodyKey: "helpLicenseCard1Body" },
  { titleKey: "helpLicenseCard2Title", bodyKey: "helpLicenseCard2Body" },
  { titleKey: "helpLicenseCard3Title", bodyKey: "helpLicenseCard3Body" },
];

const HELP_SECTIONS: HelpSectionDef[] = [
  {
    id: "digital-currency",
    titleKey: "helpSection1Title",
    render: (t) => <HelpParagraph>{t("helpSection1Body")}</HelpParagraph>,
  },
  {
    id: "about",
    titleKey: "helpSection2Title",
    render: (t) => (
      <div className="rounded-lg border border-slate-200/80 bg-slate-50/90 p-3 transition-all duration-300 ease-in-out dark:border-[#1e3a5f]/40 dark:bg-[#0d1528]/80">
        {ABOUT_BLOCKS.map(({ titleKey, bodyKey }) => (
          <HelpSubBlock key={titleKey} title={t(titleKey)}>
            {t(bodyKey)}
          </HelpSubBlock>
        ))}
      </div>
    ),
  },
  {
    id: "privacy",
    titleKey: "helpSection3Title",
    render: (t) => (
      <>
        {PRIVACY_CLAUSES.map(({ titleKey, bodyKey }) => (
          <HelpClause key={titleKey} title={t(titleKey)} body={t(bodyKey)} />
        ))}
      </>
    ),
  },
  {
    id: "affiliate",
    titleKey: "helpSection4Title",
    render: (t) => (
      <>
        <p className="mb-4 text-sm font-medium leading-relaxed text-slate-800 transition-all duration-300 ease-in-out dark:text-white">
          {t("helpAffiliateIntro").split("5%").map((part, i, arr) =>
            i < arr.length - 1 ? (
              <span key={i}>
                {part}
                <strong className="text-[#f0b90b]">5%</strong>
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
        {AFFILIATE_BLOCKS.map(({ titleKey, bodyKey }) => (
          <HelpSubBlock key={titleKey} title={t(titleKey)}>
            {t(bodyKey)}
          </HelpSubBlock>
        ))}
      </>
    ),
  },
  {
    id: "license",
    titleKey: "helpSection5Title",
    render: (t) => (
      <>
        <div className="mb-4 rounded-xl bg-gradient-to-r from-[#1e40af] to-[#2563eb] px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-blue-900/30">
          {t("helpLicenseBanner")}
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          {LICENSE_CARDS.map(({ titleKey, bodyKey }) => (
            <div
              key={titleKey}
              className="rounded-xl border border-slate-200/80 bg-white/90 p-3 text-center shadow-sm transition-all duration-300 ease-in-out hover:border-[#f0b90b]/30 dark:border-white/[0.08] dark:bg-[rgba(26,31,46,0.85)] dark:shadow-none dark:hover:border-[#f0b90b]/20"
            >
              <h4 className="mb-2 text-xs font-bold text-[#c99400] transition-all duration-300 ease-in-out dark:text-[#f0b90b]">
                {t(titleKey)}
              </h4>
              <p className="text-[11px] leading-relaxed text-slate-600 transition-all duration-300 ease-in-out dark:text-df-muted">
                {t(bodyKey)}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-slate-600 transition-all duration-300 ease-in-out dark:text-df-muted">
          {t("helpLicenseFootnote")
            .split("7374016")
            .map((part, i, arr) =>
              i < arr.length - 1 ? (
                <span key={i}>
                  {part}
                  <strong className="text-slate-900 transition-all duration-300 ease-in-out dark:text-white">
                    7374016
                  </strong>
                </span>
              ) : (
                <span key={i}>
                  {part.split("31000294614116").map((p, j, a) =>
                    j < a.length - 1 ? (
                      <span key={j}>
                        {p}
                        <strong className="text-slate-900 transition-all duration-300 ease-in-out dark:text-white">
                          31000294614116
                        </strong>
                      </span>
                    ) : (
                      <span key={j}>{p}</span>
                    )
                  )}
                </span>
              )
            )}
        </p>
      </>
    ),
  },
];

export default function HelpCenter() {
  const navigate = useNavigate();
  const { t, dir } = useLocale();
  const rtl = dir === "rtl";

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-df-page pb-10 transition-all duration-300 ease-in-out md:min-h-0">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-df-page/95 px-4 py-4 backdrop-blur-xl transition-all duration-300 ease-in-out md:relative md:rounded-2xl md:border md:border-df">
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={`absolute flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300/80 bg-white/80 text-slate-700 transition-all duration-300 ease-in-out hover:border-[#f0b90b]/40 hover:text-[#c99400] dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-[#f0b90b]/30 dark:hover:text-[#f0b90b] ${
              rtl ? "right-0" : "left-0"
            }`}
            aria-label={t("back")}
          >
            <i
              className={`fa-solid fa-arrow-left text-sm transition-all duration-300 ease-in-out ${
                rtl ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>
          <h1 className="text-base font-semibold tracking-wide text-slate-900 transition-all duration-300 ease-in-out dark:text-white">
            {t("helpCenterTitle")}
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5">
        <HelpAccordion sections={HELP_SECTIONS} />
      </div>
    </div>
  );
}
