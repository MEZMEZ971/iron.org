import type { TranslationKey } from "../i18n/translations";

export type NavItem = {
  to: string;
  labelKey: TranslationKey;
  icon: string;
  end?: boolean;
};

/** Mobile bottom bar — 5 primary H5 tabs */
export const MOBILE_BOTTOM_NAV: NavItem[] = [
  { to: "/", labelKey: "navHome", icon: "fa-house", end: true },
  { to: "/market", labelKey: "navQuotes", icon: "fa-chart-line" },
  { to: "/trade", labelKey: "navTrade", icon: "fa-coins" },
  { to: "/assets", labelKey: "navAssets", icon: "fa-wallet" },
  { to: "/my", labelKey: "navMy", icon: "fa-user" },
];

/** Desktop sidebar — primary + network routes */
export const DESKTOP_SIDEBAR_NAV: NavItem[] = [
  ...MOBILE_BOTTOM_NAV,
  { to: "/deposit", labelKey: "deposit", icon: "fa-arrow-down" },
  { to: "/team", labelKey: "navTeam", icon: "fa-users" },
  { to: "/invite", labelKey: "navInvite", icon: "fa-user-plus" },
  { to: "/help", labelKey: "profileHelp", icon: "fa-circle-question" },
];
