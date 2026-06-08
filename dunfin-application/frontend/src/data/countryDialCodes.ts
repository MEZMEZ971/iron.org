export interface CountryDialEntry {
  iso2: string;
  dialCode: string;
  nameEn: string;
  nameAr: string;
}

/** ISO alpha-2 → flag emoji */
export function isoToFlag(iso2: string): string {
  const code = iso2.toUpperCase();
  if (code.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

export function getCountryLabel(
  entry: CountryDialEntry,
  locale: "en" | "ar"
): string {
  return locale === "ar" ? entry.nameAr : entry.nameEn;
}

/**
 * Global ITU-T E.164 dialing codes (ISO 3166-1 alpha-2).
 * `nameAr` uses verified Arabic nomenclature where applicable.
 */
export const COUNTRY_DIAL_CODES: CountryDialEntry[] = [
  { iso2: "AF", dialCode: "+93", nameEn: "Afghanistan", nameAr: "أفغانستان" },
  { iso2: "AL", dialCode: "+355", nameEn: "Albania", nameAr: "ألبانيا" },
  { iso2: "DZ", dialCode: "+213", nameEn: "Algeria", nameAr: "الجزائر" },
  { iso2: "AS", dialCode: "+1", nameEn: "American Samoa", nameAr: "ساموا الأمريكية" },
  { iso2: "AD", dialCode: "+376", nameEn: "Andorra", nameAr: "أندورا" },
  { iso2: "AO", dialCode: "+244", nameEn: "Angola", nameAr: "أنغولا" },
  { iso2: "AI", dialCode: "+1", nameEn: "Anguilla", nameAr: "أنغويلا" },
  { iso2: "AG", dialCode: "+1", nameEn: "Antigua and Barbuda", nameAr: "أنتيغوا وباربودا" },
  { iso2: "AR", dialCode: "+54", nameEn: "Argentina", nameAr: "الأرجنتين" },
  { iso2: "AM", dialCode: "+374", nameEn: "Armenia", nameAr: "أرمينيا" },
  { iso2: "AW", dialCode: "+297", nameEn: "Aruba", nameAr: "أروبا" },
  { iso2: "AU", dialCode: "+61", nameEn: "Australia", nameAr: "أستراليا" },
  { iso2: "AT", dialCode: "+43", nameEn: "Austria", nameAr: "النمسا" },
  { iso2: "AZ", dialCode: "+994", nameEn: "Azerbaijan", nameAr: "أذربيجان" },
  { iso2: "BS", dialCode: "+1", nameEn: "Bahamas", nameAr: "جزر البهاما" },
  { iso2: "BH", dialCode: "+973", nameEn: "Bahrain", nameAr: "البحرين" },
  { iso2: "BD", dialCode: "+880", nameEn: "Bangladesh", nameAr: "بنغلاديش" },
  { iso2: "BB", dialCode: "+1", nameEn: "Barbados", nameAr: "باربادوس" },
  { iso2: "BY", dialCode: "+375", nameEn: "Belarus", nameAr: "بيلاروس" },
  { iso2: "BE", dialCode: "+32", nameEn: "Belgium", nameAr: "بلجيكا" },
  { iso2: "BZ", dialCode: "+501", nameEn: "Belize", nameAr: "بليز" },
  { iso2: "BJ", dialCode: "+229", nameEn: "Benin", nameAr: "بنين" },
  { iso2: "BM", dialCode: "+1", nameEn: "Bermuda", nameAr: "برمودا" },
  { iso2: "BT", dialCode: "+975", nameEn: "Bhutan", nameAr: "بوتان" },
  { iso2: "BO", dialCode: "+591", nameEn: "Bolivia", nameAr: "بوليفيا" },
  { iso2: "BA", dialCode: "+387", nameEn: "Bosnia and Herzegovina", nameAr: "البوسنة والهرسك" },
  { iso2: "BW", dialCode: "+267", nameEn: "Botswana", nameAr: "بوتسوانا" },
  { iso2: "BR", dialCode: "+55", nameEn: "Brazil", nameAr: "البرازيل" },
  { iso2: "BN", dialCode: "+673", nameEn: "Brunei", nameAr: "بروناي" },
  { iso2: "BG", dialCode: "+359", nameEn: "Bulgaria", nameAr: "بلغاريا" },
  { iso2: "BF", dialCode: "+226", nameEn: "Burkina Faso", nameAr: "بوركينا فاسو" },
  { iso2: "BI", dialCode: "+257", nameEn: "Burundi", nameAr: "بوروندي" },
  { iso2: "KH", dialCode: "+855", nameEn: "Cambodia", nameAr: "كمبوديا" },
  { iso2: "CM", dialCode: "+237", nameEn: "Cameroon", nameAr: "الكاميرون" },
  { iso2: "CA", dialCode: "+1", nameEn: "Canada", nameAr: "كندا" },
  { iso2: "CV", dialCode: "+238", nameEn: "Cape Verde", nameAr: "الرأس الأخضر" },
  { iso2: "KY", dialCode: "+1", nameEn: "Cayman Islands", nameAr: "جزر كايمان" },
  { iso2: "CF", dialCode: "+236", nameEn: "Central African Republic", nameAr: "جمهورية أفريقيا الوسطى" },
  { iso2: "TD", dialCode: "+235", nameEn: "Chad", nameAr: "تشاد" },
  { iso2: "CL", dialCode: "+56", nameEn: "Chile", nameAr: "تشيلي" },
  { iso2: "CN", dialCode: "+86", nameEn: "China", nameAr: "الصين" },
  { iso2: "CO", dialCode: "+57", nameEn: "Colombia", nameAr: "كولومبيا" },
  { iso2: "KM", dialCode: "+269", nameEn: "Comoros", nameAr: "جزر القمر" },
  { iso2: "CG", dialCode: "+242", nameEn: "Congo", nameAr: "الكونغو" },
  { iso2: "CD", dialCode: "+243", nameEn: "DR Congo", nameAr: "جمهورية الكونغو الديمقراطية" },
  { iso2: "CR", dialCode: "+506", nameEn: "Costa Rica", nameAr: "كوستاريكا" },
  { iso2: "CI", dialCode: "+225", nameEn: "Côte d'Ivoire", nameAr: "ساحل العاج" },
  { iso2: "HR", dialCode: "+385", nameEn: "Croatia", nameAr: "كرواتيا" },
  { iso2: "CU", dialCode: "+53", nameEn: "Cuba", nameAr: "كوبا" },
  { iso2: "CY", dialCode: "+357", nameEn: "Cyprus", nameAr: "قبرص" },
  { iso2: "CZ", dialCode: "+420", nameEn: "Czech Republic", nameAr: "التشيك" },
  { iso2: "DK", dialCode: "+45", nameEn: "Denmark", nameAr: "الدنمارك" },
  { iso2: "DJ", dialCode: "+253", nameEn: "Djibouti", nameAr: "جيبوتي" },
  { iso2: "DM", dialCode: "+1", nameEn: "Dominica", nameAr: "دومينيكا" },
  { iso2: "DO", dialCode: "+1", nameEn: "Dominican Republic", nameAr: "جمهورية الدومينيكان" },
  { iso2: "EC", dialCode: "+593", nameEn: "Ecuador", nameAr: "الإكوادور" },
  { iso2: "EG", dialCode: "+20", nameEn: "Egypt", nameAr: "مصر" },
  { iso2: "SV", dialCode: "+503", nameEn: "El Salvador", nameAr: "السلفادور" },
  { iso2: "GQ", dialCode: "+240", nameEn: "Equatorial Guinea", nameAr: "غينيا الاستوائية" },
  { iso2: "ER", dialCode: "+291", nameEn: "Eritrea", nameAr: "إريتريا" },
  { iso2: "EE", dialCode: "+372", nameEn: "Estonia", nameAr: "إستونيا" },
  { iso2: "SZ", dialCode: "+268", nameEn: "Eswatini", nameAr: "إسواتيني" },
  { iso2: "ET", dialCode: "+251", nameEn: "Ethiopia", nameAr: "إثيوبيا" },
  { iso2: "FJ", dialCode: "+679", nameEn: "Fiji", nameAr: "فيجي" },
  { iso2: "FI", dialCode: "+358", nameEn: "Finland", nameAr: "فنلندا" },
  { iso2: "FR", dialCode: "+33", nameEn: "France", nameAr: "فرنسا" },
  { iso2: "GA", dialCode: "+241", nameEn: "Gabon", nameAr: "الغابون" },
  { iso2: "GM", dialCode: "+220", nameEn: "Gambia", nameAr: "غامبيا" },
  { iso2: "GE", dialCode: "+995", nameEn: "Georgia", nameAr: "جورجيا" },
  { iso2: "DE", dialCode: "+49", nameEn: "Germany", nameAr: "ألمانيا" },
  { iso2: "GH", dialCode: "+233", nameEn: "Ghana", nameAr: "غانا" },
  { iso2: "GR", dialCode: "+30", nameEn: "Greece", nameAr: "اليونان" },
  { iso2: "GD", dialCode: "+1", nameEn: "Grenada", nameAr: "غرينادا" },
  { iso2: "GT", dialCode: "+502", nameEn: "Guatemala", nameAr: "غواتيمالا" },
  { iso2: "GN", dialCode: "+224", nameEn: "Guinea", nameAr: "غينيا" },
  { iso2: "GW", dialCode: "+245", nameEn: "Guinea-Bissau", nameAr: "غينيا بيساو" },
  { iso2: "GY", dialCode: "+592", nameEn: "Guyana", nameAr: "غيانا" },
  { iso2: "HT", dialCode: "+509", nameEn: "Haiti", nameAr: "هايتي" },
  { iso2: "HN", dialCode: "+504", nameEn: "Honduras", nameAr: "هندوراس" },
  { iso2: "HK", dialCode: "+852", nameEn: "Hong Kong", nameAr: "هونغ كونغ" },
  { iso2: "HU", dialCode: "+36", nameEn: "Hungary", nameAr: "المجر" },
  { iso2: "IS", dialCode: "+354", nameEn: "Iceland", nameAr: "آيسلندا" },
  { iso2: "IN", dialCode: "+91", nameEn: "India", nameAr: "الهند" },
  { iso2: "ID", dialCode: "+62", nameEn: "Indonesia", nameAr: "إندونيسيا" },
  { iso2: "IR", dialCode: "+98", nameEn: "Iran", nameAr: "إيران" },
  { iso2: "IQ", dialCode: "+964", nameEn: "Iraq", nameAr: "العراق" },
  { iso2: "IE", dialCode: "+353", nameEn: "Ireland", nameAr: "أيرلندا" },
  { iso2: "IL", dialCode: "+972", nameEn: "Israel", nameAr: "إسرائيل" },
  { iso2: "IT", dialCode: "+39", nameEn: "Italy", nameAr: "إيطاليا" },
  { iso2: "JM", dialCode: "+1", nameEn: "Jamaica", nameAr: "جامايكا" },
  { iso2: "JP", dialCode: "+81", nameEn: "Japan", nameAr: "اليابان" },
  { iso2: "JO", dialCode: "+962", nameEn: "Jordan", nameAr: "الأردن" },
  { iso2: "KZ", dialCode: "+7", nameEn: "Kazakhstan", nameAr: "كازاخستان" },
  { iso2: "KE", dialCode: "+254", nameEn: "Kenya", nameAr: "كينيا" },
  { iso2: "KW", dialCode: "+965", nameEn: "Kuwait", nameAr: "الكويت" },
  { iso2: "KG", dialCode: "+996", nameEn: "Kyrgyzstan", nameAr: "قيرغيزستان" },
  { iso2: "LA", dialCode: "+856", nameEn: "Laos", nameAr: "لاوس" },
  { iso2: "LV", dialCode: "+371", nameEn: "Latvia", nameAr: "لاتفيا" },
  { iso2: "LB", dialCode: "+961", nameEn: "Lebanon", nameAr: "لبنان" },
  { iso2: "LS", dialCode: "+266", nameEn: "Lesotho", nameAr: "ليسوتو" },
  { iso2: "LR", dialCode: "+231", nameEn: "Liberia", nameAr: "ليبيريا" },
  { iso2: "LY", dialCode: "+218", nameEn: "Libya", nameAr: "ليبيا" },
  { iso2: "LI", dialCode: "+423", nameEn: "Liechtenstein", nameAr: "ليختنشتاين" },
  { iso2: "LT", dialCode: "+370", nameEn: "Lithuania", nameAr: "ليتوانيا" },
  { iso2: "LU", dialCode: "+352", nameEn: "Luxembourg", nameAr: "لوكسمبورغ" },
  { iso2: "MO", dialCode: "+853", nameEn: "Macau", nameAr: "ماكاو" },
  { iso2: "MG", dialCode: "+261", nameEn: "Madagascar", nameAr: "مدغشقر" },
  { iso2: "MW", dialCode: "+265", nameEn: "Malawi", nameAr: "ملاوي" },
  { iso2: "MY", dialCode: "+60", nameEn: "Malaysia", nameAr: "ماليزيا" },
  { iso2: "MV", dialCode: "+960", nameEn: "Maldives", nameAr: "جزر المالديف" },
  { iso2: "ML", dialCode: "+223", nameEn: "Mali", nameAr: "مالي" },
  { iso2: "MT", dialCode: "+356", nameEn: "Malta", nameAr: "مالطا" },
  { iso2: "MR", dialCode: "+222", nameEn: "Mauritania", nameAr: "موريتانيا" },
  { iso2: "MU", dialCode: "+230", nameEn: "Mauritius", nameAr: "موريشيوس" },
  { iso2: "MX", dialCode: "+52", nameEn: "Mexico", nameAr: "المكسيك" },
  { iso2: "MD", dialCode: "+373", nameEn: "Moldova", nameAr: "مولدوفا" },
  { iso2: "MC", dialCode: "+377", nameEn: "Monaco", nameAr: "موناكو" },
  { iso2: "MN", dialCode: "+976", nameEn: "Mongolia", nameAr: "منغوليا" },
  { iso2: "ME", dialCode: "+382", nameEn: "Montenegro", nameAr: "الجبل الأسود" },
  { iso2: "MA", dialCode: "+212", nameEn: "Morocco", nameAr: "المغرب" },
  { iso2: "MZ", dialCode: "+258", nameEn: "Mozambique", nameAr: "موزمبيق" },
  { iso2: "MM", dialCode: "+95", nameEn: "Myanmar", nameAr: "ميانمار" },
  { iso2: "NA", dialCode: "+264", nameEn: "Namibia", nameAr: "ناميبيا" },
  { iso2: "NP", dialCode: "+977", nameEn: "Nepal", nameAr: "نيبال" },
  { iso2: "NL", dialCode: "+31", nameEn: "Netherlands", nameAr: "هولندا" },
  { iso2: "NZ", dialCode: "+64", nameEn: "New Zealand", nameAr: "نيوزيلندا" },
  { iso2: "NI", dialCode: "+505", nameEn: "Nicaragua", nameAr: "نيكاراغوا" },
  { iso2: "NE", dialCode: "+227", nameEn: "Niger", nameAr: "النيجر" },
  { iso2: "NG", dialCode: "+234", nameEn: "Nigeria", nameAr: "نيجيريا" },
  { iso2: "MK", dialCode: "+389", nameEn: "North Macedonia", nameAr: "مقدونيا الشمالية" },
  { iso2: "NO", dialCode: "+47", nameEn: "Norway", nameAr: "النرويج" },
  { iso2: "OM", dialCode: "+968", nameEn: "Oman", nameAr: "عُمان" },
  { iso2: "PK", dialCode: "+92", nameEn: "Pakistan", nameAr: "باكستان" },
  { iso2: "PS", dialCode: "+970", nameEn: "Palestine", nameAr: "فلسطين" },
  { iso2: "PA", dialCode: "+507", nameEn: "Panama", nameAr: "بنما" },
  { iso2: "PG", dialCode: "+675", nameEn: "Papua New Guinea", nameAr: "بابوا غينيا الجديدة" },
  { iso2: "PY", dialCode: "+595", nameEn: "Paraguay", nameAr: "باراغواي" },
  { iso2: "PE", dialCode: "+51", nameEn: "Peru", nameAr: "بيرو" },
  { iso2: "PH", dialCode: "+63", nameEn: "Philippines", nameAr: "الفلبين" },
  { iso2: "PL", dialCode: "+48", nameEn: "Poland", nameAr: "بولندا" },
  { iso2: "PT", dialCode: "+351", nameEn: "Portugal", nameAr: "البرتغال" },
  { iso2: "PR", dialCode: "+1", nameEn: "Puerto Rico", nameAr: "بورتوريكو" },
  { iso2: "QA", dialCode: "+974", nameEn: "Qatar", nameAr: "قطر" },
  { iso2: "RO", dialCode: "+40", nameEn: "Romania", nameAr: "رومانيا" },
  { iso2: "RU", dialCode: "+7", nameEn: "Russia", nameAr: "روسيا" },
  { iso2: "RW", dialCode: "+250", nameEn: "Rwanda", nameAr: "رواندا" },
  { iso2: "SA", dialCode: "+966", nameEn: "Saudi Arabia", nameAr: "المملكة العربية السعودية" },
  { iso2: "SN", dialCode: "+221", nameEn: "Senegal", nameAr: "السنغال" },
  { iso2: "RS", dialCode: "+381", nameEn: "Serbia", nameAr: "صربيا" },
  { iso2: "SC", dialCode: "+248", nameEn: "Seychelles", nameAr: "سيشل" },
  { iso2: "SL", dialCode: "+232", nameEn: "Sierra Leone", nameAr: "سيراليون" },
  { iso2: "SG", dialCode: "+65", nameEn: "Singapore", nameAr: "سنغافورة" },
  { iso2: "SK", dialCode: "+421", nameEn: "Slovakia", nameAr: "سلوفاكيا" },
  { iso2: "SI", dialCode: "+386", nameEn: "Slovenia", nameAr: "سلوفينيا" },
  { iso2: "SO", dialCode: "+252", nameEn: "Somalia", nameAr: "الصومال" },
  { iso2: "ZA", dialCode: "+27", nameEn: "South Africa", nameAr: "جنوب أفريقيا" },
  { iso2: "KR", dialCode: "+82", nameEn: "South Korea", nameAr: "كوريا الجنوبية" },
  { iso2: "SS", dialCode: "+211", nameEn: "South Sudan", nameAr: "جنوب السودان" },
  { iso2: "ES", dialCode: "+34", nameEn: "Spain", nameAr: "إسبانيا" },
  { iso2: "LK", dialCode: "+94", nameEn: "Sri Lanka", nameAr: "سريلانكا" },
  { iso2: "SD", dialCode: "+249", nameEn: "Sudan", nameAr: "السودان" },
  { iso2: "SR", dialCode: "+597", nameEn: "Suriname", nameAr: "سورينام" },
  { iso2: "SE", dialCode: "+46", nameEn: "Sweden", nameAr: "السويد" },
  { iso2: "CH", dialCode: "+41", nameEn: "Switzerland", nameAr: "سويسرا" },
  { iso2: "SY", dialCode: "+963", nameEn: "Syria", nameAr: "سوريا" },
  { iso2: "TW", dialCode: "+886", nameEn: "Taiwan", nameAr: "تايوان" },
  { iso2: "TJ", dialCode: "+992", nameEn: "Tajikistan", nameAr: "طاجيكستان" },
  { iso2: "TZ", dialCode: "+255", nameEn: "Tanzania", nameAr: "تنزانيا" },
  { iso2: "TH", dialCode: "+66", nameEn: "Thailand", nameAr: "تايلاند" },
  { iso2: "TL", dialCode: "+670", nameEn: "Timor-Leste", nameAr: "تيمور الشرقية" },
  { iso2: "TG", dialCode: "+228", nameEn: "Togo", nameAr: "توغو" },
  { iso2: "TT", dialCode: "+1", nameEn: "Trinidad and Tobago", nameAr: "ترينيداد وتوباغو" },
  { iso2: "TN", dialCode: "+216", nameEn: "Tunisia", nameAr: "تونس" },
  { iso2: "TR", dialCode: "+90", nameEn: "Turkey", nameAr: "تركيا" },
  { iso2: "TM", dialCode: "+993", nameEn: "Turkmenistan", nameAr: "تركمانستان" },
  { iso2: "UG", dialCode: "+256", nameEn: "Uganda", nameAr: "أوغندا" },
  { iso2: "UA", dialCode: "+380", nameEn: "Ukraine", nameAr: "أوكرانيا" },
  { iso2: "AE", dialCode: "+971", nameEn: "United Arab Emirates", nameAr: "الإمارات العربية المتحدة" },
  { iso2: "GB", dialCode: "+44", nameEn: "United Kingdom", nameAr: "المملكة المتحدة" },
  { iso2: "US", dialCode: "+1", nameEn: "United States", nameAr: "الولايات المتحدة" },
  { iso2: "UY", dialCode: "+598", nameEn: "Uruguay", nameAr: "أوروغواي" },
  { iso2: "UZ", dialCode: "+998", nameEn: "Uzbekistan", nameAr: "أوزبكستان" },
  { iso2: "VE", dialCode: "+58", nameEn: "Venezuela", nameAr: "فنزويلا" },
  { iso2: "VN", dialCode: "+84", nameEn: "Vietnam", nameAr: "فيتنام" },
  { iso2: "YE", dialCode: "+967", nameEn: "Yemen", nameAr: "اليمن" },
  { iso2: "ZM", dialCode: "+260", nameEn: "Zambia", nameAr: "زامبيا" },
  { iso2: "ZW", dialCode: "+263", nameEn: "Zimbabwe", nameAr: "زيمبابوي" },
];

/** Deduplicate by iso2 (some territories share +1) — keep first entry per iso2 */
export const COUNTRIES_BY_ISO = new Map(
  COUNTRY_DIAL_CODES.map((c) => [c.iso2, c])
);

export function findCountryByDialCode(dialCode: string): CountryDialEntry | undefined {
  return COUNTRY_DIAL_CODES.find((c) => c.dialCode === dialCode);
}

export function filterCountries(
  query: string,
  locale: "en" | "ar"
): CountryDialEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRY_DIAL_CODES;

  const digits = q.replace(/\D/g, "");
  return COUNTRY_DIAL_CODES.filter((c) => {
    const name = getCountryLabel(c, locale).toLowerCase();
    const dial = c.dialCode.replace("+", "");
    return (
      name.includes(q) ||
      c.iso2.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.nameAr.includes(q) ||
      c.dialCode.includes(q) ||
      (digits && dial.startsWith(digits))
    );
  });
}
