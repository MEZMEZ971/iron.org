import type { Locale } from "../locales";

type NonBaseLocale = Exclude<Locale, "en" | "ar">;

/** Localized FOMO banner copy for non EN/AR locales. */
export const FOMO_BANNER_OVERRIDES: Record<
  NonBaseLocale,
  { fomoBannerActiveUsers: string }
> = {
  ru: { fomoBannerActiveUsers: "{count} АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ ТОРГУЮТ ПРЯМО СЕЙЧАС" },
  de: { fomoBannerActiveUsers: "{count} AKTIVE NUTZER HANDELN JETZT LIVE" },
  pt: { fomoBannerActiveUsers: "{count} USUÁRIOS ATIVOS NEGOCIANDO AO VIVO AGORA" },
  es: { fomoBannerActiveUsers: "{count} USUARIOS ACTIVOS OPERANDO EN VIVO AHORA" },
  fr: { fomoBannerActiveUsers: "{count} UTILISATEURS ACTIFS TRADENT EN DIRECT MAINTENANT" },
  ja: { fomoBannerActiveUsers: "{count} 人のアクティブユーザーが現在ライブ取引中" },
  ko: { fomoBannerActiveUsers: "{count}명의 활성 사용자가 지금 실시간 거래 중" },
  vi: { fomoBannerActiveUsers: "{count} NGƯỜI DÙNG ĐANG GIAO DỊCH TRỰC TIẾP NGAY BÂY GIỜ" },
  fa: { fomoBannerActiveUsers: "{count} کاربر فعال هم‌اکنون در حال معامله زنده" },
  id: { fomoBannerActiveUsers: "{count} PENGGUNA AKTIF BERTRADING LIVE SEKARANG" },
  bn: { fomoBannerActiveUsers: "{count} সক্রিয় ব্যবহারকারী এখনই লাইভ ট্রেড করছেন" },
  gn: { fomoBannerActiveUsers: "{count} PURUHA OIKÓVA OÑEMBOGUE HÁGUA" },
  ay: { fomoBannerActiveUsers: "{count} ACTIVOS USUARIOS JICHHA LIVE TRADE KATJATA" },
  mi: { fomoBannerActiveUsers: "{count} KAIWHAKAMĀI HOHE E HOKO HOKO INĀIANEI" },
  mn: { fomoBannerActiveUsers: "{count} ИДЭВХТЭЙ ХЭРЭГЛЭГЧ ОДОО ШУУД АРИЛЖИЖ БАЙНА" },
};
