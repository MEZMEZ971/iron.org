export interface StrategyCard {
  id: number;
  name: string;
  minCapital: number;
  maxCapital: number;
  minTeam: number;
  affiliationRequired: boolean;
  unlocked: boolean;
  capitalInRange: boolean;
  teamMet: boolean;
  affiliationMet: boolean;
  teamShortfall: number;
  dailyYield?: number;
  dailyYieldPercent?: number;
  dailyYieldLabel?: string;
}

import type { BrokerProfileSnapshot } from "../config/brokerProgram";

export interface TradeStatus {
  userId: string;
  walletBalance: number;
  availableBalance: number;
  lockedCapital: number;
  tradingCapital: number;
  activeStrategy: number | null;
  estimatedProceeds?: number | null;
  dailyYieldLabel?: string | null;
  last_trade_time: string | null;
  cooldown: {
    onCooldown: boolean;
    remainingMs: number;
    nextTradeAt: string | null;
  };
  tradeSession: {
    active: boolean;
    remainingMs: number;
    endsAt: string | null;
  };
  affiliate: {
    totalActiveMembers: number;
    totalMembers: number;
    gen1Active: number;
    gen2Active: number;
    gen3Active: number;
  };
  strategies: StrategyCard[];
  botActive: boolean;
  eligibility: {
    eligible: boolean;
    error: string | null;
    errorAr?: string | null;
    code?: string | null;
    requiredCapital?: number | null;
    requiredTeam?: number | null;
    matchedStrategy: { id: number; name: string } | null;
    autoLockAmount?: number | null;
  };
}

import {
  getAuthenticatedUserId,
  getStoredToken,
} from "../lib/authStorage";

/** Production API origin — must be set via VITE_API_URL at build time. */
const DEV_API_URL = "http://localhost:3000";

/** Strip trailing slashes so `${baseURL}${path}` never yields `...app//api/...`. */
function sanitizeBaseURL(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

const baseURL = sanitizeBaseURL(
  import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? DEV_API_URL : "")
);

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error(
    "[api] VITE_API_URL is required for production builds. Set it in .env.production or Vercel env."
  );
}

/** Join base + path with exactly one slash between them. */
function buildRequestUrl(path: string): string {
  return `${baseURL}/${path.replace(/^\/+/, "")}`;
}

export { baseURL as API_BASE_URL };

export class ApiError extends Error {
  status: number;
  code?: string;
  errorAr?: string;
  requiredCapital?: number;
  requiredTeam?: number;

  constructor(
    message: string,
    status: number,
    code?: string,
    errorAr?: string,
    extras?: { requiredCapital?: number; requiredTeam?: number }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errorAr = errorAr;
    this.requiredCapital = extras?.requiredCapital;
    this.requiredTeam = extras?.requiredTeam;
  }
}

export class ApiNetworkError extends Error {
  constructor(message = "Unable to reach API server") {
    super(message);
    this.name = "ApiNetworkError";
  }
}

export type UserRole = "USER" | "ADMIN" | "PARTNER";

export interface AuthUser {
  id: string;
  userId: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  displayName: string;
  uid: string;
  referralCode?: string;
  role?: UserRole;
  walletBalance?: number;
  trialBalance?: number;
  isTrialActive?: boolean;
  trialExpiresAt?: string | null;
  fundAccount?: number;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(buildRequestUrl(path), {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiNetworkError(
      "Cannot connect to API. Start the backend with `npm run server` from the repo root."
    );
  }

  const raw = await res.text();
  let data: {
    error?: string;
    code?: string;
    errorAr?: string;
    requiredCapital?: number;
    requiredTeam?: number;
  } & Record<string, unknown> = {};
  if (raw) {
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      throw new ApiError(
        res.ok ? "Invalid JSON response from server" : `Request failed (${res.status})`,
        res.status
      );
    }
  }

  if (!res.ok) {
    throw new ApiError(
      data.error || res.statusText || `Request failed (${res.status})`,
      res.status,
      data.code,
      typeof data.errorAr === "string" ? data.errorAr : undefined,
      {
        requiredCapital:
          typeof data.requiredCapital === "number"
            ? data.requiredCapital
            : undefined,
        requiredTeam:
          typeof data.requiredTeam === "number" ? data.requiredTeam : undefined,
      }
    );
  }

  return data as T;
}

export function authRegister(payload: {
  username: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  password: string;
  invitationCode?: string;
  referralCode?: string;
}) {
  const referral =
    payload.referralCode?.trim() || payload.invitationCode?.trim() || undefined;

  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      invitationCode: referral,
      referralCode: referral,
    }),
  });
}

export function authLogin(payload: { identifier: string; password: string }) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface TradeEarnings {
  accountBalance: number;
  walletBalance: number;
  trialBalance?: number;
  lockedCapital: number;
  currency: string;
  totalTransactionProceeds: number;
  proceedsPeriodEndsAt: string;
  totalIncomeToBeDistributed: number;
  grossIncomeToBeDistributed?: number;
  todayPendingEarnings: number;
  userProfitSharePercent?: number;
  teamCommissions: {
    dailyReferralEarnings: number;
    monthlyReferralEarnings: number;
  };
  cooldown: {
    onCooldown: boolean;
    nextTradeAt: string | null;
    remainingMs: number;
  };
  activeStrategy: number | null;
}

export function fetchTradeEarnings(userId: string) {
  return request<TradeEarnings>(
    `/api/trade/earnings/${encodeURIComponent(userId)}`
  );
}

export function fetchTradeStatus(userId: string) {
  return request<TradeStatus>(
    `/api/trade/status/${encodeURIComponent(userId)}`
  );
}

export function executeTrade(userId: string) {
  return request<{
    ok: boolean;
    trade: { strategy: { name: string }; capitalAmount: number };
    user: TradeStatus;
  }>("/api/trade/execute", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

/** Legacy anonymous registration — skip when JWT session exists */
export function registerUser(userId: string, referredBy?: string) {
  return request<{ success: boolean }>("/api/users/register", {
    method: "POST",
    body: JSON.stringify({ userId, referredBy }),
  });
}

export function syncBalance(userId: string) {
  const token = getStoredToken();
  const storedId = getAuthenticatedUserId();
  if (token && storedId && storedId === userId) {
    return request<{ success: boolean }>("/api/users/profile/sync-balance", {
      method: "POST",
    });
  }
  return request<{ success: boolean }>(
    `/api/users/${encodeURIComponent(userId)}/sync-balance`,
    { method: "POST" }
  );
}

export interface AssetRow {
  symbol: string;
  total: number;
  available: number;
  freeze: number;
}

export interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  timestamp: string;
  commission: number | null;
  strategyId?: number;
}

export interface UserProfile {
  userId: string;
  uid?: string;
  email?: string | null;
  username?: string | null;
  displayName: string;
  walletBalance: number;
  lockedCapital: number;
  onChainBalance: number;
  tradingCapital: number;
  activeStrategy: number | null;
  fundAccount: number;
  tradingAccount: number;
  trialBalance?: number;
  isTrialActive?: boolean;
  trialExpiresAt?: string | null;
  withdrawableBalance?: number;
  todayPnl: number;
  totalPnl: number;
  affiliate: TradeStatus["affiliate"];
  tradeHistory: unknown[];
  deposits: unknown[];
  transactions: TransactionRow[];
  assets: AssetRow[];
  pendingWithdrawals?: number;
  broker?: BrokerProfileSnapshot;
  savedWithdrawalAddresses?: SavedWithdrawalAddresses;
}

/** Authenticated profile for the current JWT subject */
export function fetchMyProfile() {
  return request<UserProfile>("/api/users/profile");
}

export function fetchUserProfile(userId: string) {
  const token = getStoredToken();
  const storedId = getAuthenticatedUserId();
  if (token && storedId && storedId === userId) {
    return fetchMyProfile();
  }
  return request<UserProfile>(
    `/api/users/${encodeURIComponent(userId)}/profile`
  );
}

export function fetchDepositAddress(
  userId: string,
  network: string
) {
  const params = new URLSearchParams({ userId, network });
  return request<import("../types/deposit").DepositAddressResponse>(
    `/api/deposit/address?${params.toString()}`
  );
}

/** Authenticated permanent deposit address for the signed-in user. */
export function fetchUserDepositAddress(
  network: import("../types/deposit").DepositNetwork = "TRC20",
  currency: import("../types/deposit").DepositCurrency = "USDT"
) {
  const asset = currency === "USDC" ? "USDC" : "USDT";
  const params = new URLSearchParams({ network, currency: asset });
  return request<import("../types/deposit").DepositAddressResponse>(
    `/api/user/deposit-address?${params.toString()}`
  );
}

export type KycStatus = "NONE" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export interface KycStatusResponse {
  userId: string;
  kycStatus: KycStatus;
  latestSubmission: {
    id: string;
    frontFileName: string;
    backFileName: string;
    status: KycStatus;
    submittedAt: string;
  } | null;
}

export function fetchKycStatus(userId: string) {
  return request<KycStatusResponse>(
    `/api/users/${encodeURIComponent(userId)}/kyc`
  );
}

export function submitKyc(
  userId: string,
  payload: { frontFileName: string; backFileName: string }
) {
  return request<{
    success: boolean;
    kycStatus: KycStatus;
    submission: KycStatusResponse["latestSubmission"];
  }>(`/api/users/${encodeURIComponent(userId)}/kyc/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface InviteRewardRow {
  strategyId: number;
  productName: string;
  minTeam: number;
  rewardTier: string;
  minCapital: number;
  maxCapital: number;
}

export interface InviteInfo {
  userId: string;
  memberId: string;
  referralCode: string;
  inviteCode: string;
  inviteLink: string;
  affiliate: {
    totalActiveMembers: number;
    totalMembers: number;
    gen1Count: number;
    gen2Count: number;
    gen3Count: number;
    gen1Active: number;
    gen2Active: number;
    gen3Active: number;
  };
  rewardMatrix: InviteRewardRow[];
}

export function fetchInviteInfo(userId: string) {
  return request<InviteInfo>(
    `/api/users/${encodeURIComponent(userId)}/invite`
  );
}

export interface TeamMemberRow {
  account: string;
  nickname: string;
  registrationTime: string;
  isActive: boolean;
}

export interface TeamGenStats {
  rebate: number;
  count: number;
  activeCount: number;
  members: TeamMemberRow[];
}

export interface TeamContributionLog {
  account: string;
  hierarchyLevel: string;
  generation: number;
  executionTime: string;
  earningsPayout: number;
}

export interface TeamAnalytics {
  userId: string;
  totalCommission: number;
  totalTurnover: number;
  dailyVolume: number;
  headcount: number;
  newRegistrationsToday: number;
  statsPerGen: {
    gen1: TeamGenStats;
    gen2: TeamGenStats;
    gen3: TeamGenStats;
  };
  contributionLogs: TeamContributionLog[];
  broker?: BrokerProfileSnapshot;
}

export function fetchTeamAnalytics(userId: string) {
  return request<TeamAnalytics>(
    `/api/team/analytics/${encodeURIComponent(userId)}`
  );
}

export type ProfileUpdatePayload = {
  email?: string;
  verificationCode?: string;
  displayName?: string;
  passwordType?: "login" | "payment";
  oldPassword?: string;
  newPassword?: string;
};

export function sendProfileEmailOtp(email: string) {
  return request<{ success: boolean; message: string }>(
    "/api/users/profile/send-email-otp",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    }
  );
}

export type WithdrawNetwork = "ERC20" | "BEP20" | "TRC20";

export type SavedWithdrawalAddresses = Record<WithdrawNetwork, string | null>;

export interface WithdrawPreflight {
  walletBalance: number;
  requiresPaymentPin: boolean;
  minAmount: number;
  maxAmount: number;
  feePercent: number;
  turnoverShortfall: number;
  savedWithdrawalAddresses?: SavedWithdrawalAddresses;
}

export interface WithdrawalRecordRow {
  id: string;
  userId: string;
  currency: string;
  network: string;
  address: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function fetchWithdrawPreflight() {
  return request<WithdrawPreflight>("/api/wallet/withdraw/preflight");
}

export function saveWithdrawalAddress(payload: {
  network: WithdrawNetwork;
  address: string;
}) {
  return request<{ savedWithdrawalAddresses: SavedWithdrawalAddresses }>(
    "/api/wallet/withdrawal-address",
    { method: "PUT", body: JSON.stringify(payload) }
  );
}

export function fetchWithdrawalHistory() {
  return request<{ withdrawals: WithdrawalRecordRow[] }>(
    "/api/wallet/withdrawals"
  );
}

export interface AdminStats {
  totalManagedLiquidity: number;
  totalCumulativeDeposits: number;
  totalSettledWithdrawals: number;
  totalPlatformRevenue: number;
  pendingWithdrawalCount: number;
  pendingKycCount: number;
}

export interface AdminWithdrawalRow {
  id: string;
  userId: string;
  uid: string | null;
  email: string | null;
  displayName: string;
  currency: string;
  network: string;
  address: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
}

export interface AdminKycRow {
  id: string;
  userId: string;
  uid: string | null;
  email: string | null;
  displayName: string;
  kycStatus: string;
  frontFileName: string;
  backFileName: string;
  status: string;
  rejectionReason: string | null;
  submittedAt: string;
}

export function fetchAdminMe() {
  return request<{ success: boolean; user: AuthUser }>("/api/admin/me");
}

export function fetchAdminStats() {
  return request<AdminStats>("/api/admin/stats");
}

export function fetchAdminWithdrawals() {
  return request<{ withdrawals: AdminWithdrawalRow[] }>("/api/admin/withdrawals");
}

export function adminWithdrawalAction(
  id: string,
  payload: { action: "approve" | "reject"; reason?: string }
) {
  return request<{ success: boolean; withdrawal: AdminWithdrawalRow }>(
    `/api/admin/withdrawals/${encodeURIComponent(id)}/action`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export function fetchAdminKyc() {
  return request<{ submissions: AdminKycRow[] }>("/api/admin/kyc");
}

export function adminKycAction(
  id: string,
  payload: { action: "approve" | "reject"; reason?: string }
) {
  return request<{ success: boolean; submission: AdminKycRow }>(
    `/api/admin/kyc/${encodeURIComponent(id)}/action`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export type UserActivityStatus = "ACTIVE" | "INACTIVE" | "SLEEP";

export interface AdminActivityUserRow {
  uid: string;
  username: string | null;
  walletBalance: number;
  lastActivityAt: string;
  status: UserActivityStatus;
}

export interface AdminActivityAnalytics {
  success: boolean;
  counts: {
    active: number;
    inactive: number;
    sleep: number;
    total: number;
  };
  users: AdminActivityUserRow[];
}

export function fetchAdminActivityAnalytics() {
  return request<AdminActivityAnalytics>("/api/admin/analytics/activity");
}

export interface AdminFinanceUserRow {
  uid: string;
  username: string | null;
  walletBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  netCapitalFlow: number;
}

export interface AdminFinanceUserSummary {
  success: boolean;
  users: AdminFinanceUserRow[];
  total: number;
  page: number;
  limit: number;
}

export function fetchAdminFinanceUserSummary(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.search?.trim()) qs.set("search", params.search.trim());
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request<AdminFinanceUserSummary>(
    `/api/admin/finance/user-summary${query ? `?${query}` : ""}`,
  );
}

export interface AdminBrokerRow {
  id: string;
  username: string;
  uid: string;
  totalTeamCount: number;
  brokerRank: string;
  calculatedSalary: number;
  badge: string | null;
  labelEn: string | null;
  labelAr: string | null;
  family: string | null;
  lastSalaryPayoutAt: string | null;
  salaryEligible: boolean;
}

export interface AdminBrokersSummary {
  totalBrokers: number;
  eligibleForPayout: number;
  estimatedPayoutUsdt: number;
}

export interface AdminBrokersResponse {
  success: boolean;
  brokers: AdminBrokerRow[];
  summary: AdminBrokersSummary;
}

export function fetchAdminBrokers() {
  return request<AdminBrokersResponse>("/api/admin/brokers");
}

export function adminPayoutBrokerSalaries(payload?: { force?: boolean }) {
  return request<{
    success: boolean;
    brokersPaid: number;
    totalUsdtPaid: number;
    paidUserIds: string[];
  }>("/api/admin/brokers/payout-salaries", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export function adminWakeUpSleepers() {
  return request<{
    success: boolean;
    sent: number;
    sleepers: number;
    skipped?: number;
  }>("/api/admin/notifications/wake-up-sleepers", { method: "POST" });
}

export interface AdminControlledUser {
  userId: string;
  uid: string;
  email: string | null;
  username: string | null;
  displayName: string;
  role: string;
  walletBalance: number;
  lockedCapital: number;
  tradingCapital: number;
  accountActive: boolean;
  accountStatus: "ACTIVE" | "SUSPENDED";
  kycStatus: string;
  hasDeposited: boolean;
  registrationDate: string;
  createdAt: string;
}

function normalizeAdminControlledUser(user: AdminControlledUser): AdminControlledUser {
  return {
    ...user,
    walletBalance: Number(user.walletBalance) || 0,
    lockedCapital: Number(user.lockedCapital) || 0,
    tradingCapital: Number(user.tradingCapital) || 0,
  };
}

export async function adminLookupUser(uid: string) {
  const result = await request<{ success: boolean; user: AdminControlledUser }>(
    `/api/admin/users/lookup/${encodeURIComponent(uid)}`
  );
  return { ...result, user: normalizeAdminControlledUser(result.user) };
}

export async function adminMutateBalance(
  uid: string,
  payload: { action: "CREDIT" | "DEBIT"; amount: number }
) {
  const result = await request<{
    success: boolean;
    action: string;
    amount: number;
    walletBalance: number;
    user: AdminControlledUser;
  }>(`/api/admin/users/${encodeURIComponent(uid)}/mutate-balance`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const walletBalance = Number(result.walletBalance ?? result.user?.walletBalance) || 0;
  const user = normalizeAdminControlledUser({
    ...result.user,
    walletBalance,
  });
  return { ...result, walletBalance, user };
}

export function adminToggleUserStatus(
  uid: string,
  payload: { status: "ACTIVE" | "SUSPENDED"; active?: boolean }
) {
  return request<{ success: boolean; accountActive: boolean; user: AdminControlledUser }>(
    `/api/admin/users/${encodeURIComponent(uid)}/toggle-status`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export function submitWithdrawal(payload: {
  amount: number;
  currency: string;
  network: string;
  address: string;
  paymentPassword: string;
  /** @deprecated use paymentPassword */
  paymentPin?: string;
}) {
  return request<{
    success: boolean;
    withdrawal: WithdrawalRecordRow;
    walletBalance: number;
    settlementAmount: number;
    fee: number;
    netAmount: number;
    feePercent: number;
  }>("/api/wallet/withdraw", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUserProfileSettings(payload: ProfileUpdatePayload) {
  return request<{ success: boolean; user: AuthUser }>(
    "/api/users/profile/update",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export interface SpinWheelResult {
  success: true;
  prizeIndex: number;
  amount: number;
  type: "USDT";
  label: string;
  grand?: boolean;
  walletBalance: number;
  customTokenBalance: number;
  spinsRemaining: number;
}

export interface WheelStatusResult {
  success: true;
  spinsRemaining: number;
  maxSpinsPerDay: number;
  canSpin: boolean;
  hasRealDeposit: boolean;
  depositRequired: boolean;
  nextSpinAt: string | null;
  prizes: Array<{
    index: number;
    amount: number;
    type: "USDT";
    label: string;
    grand: boolean;
  }>;
}

export function fetchWheelStatus() {
  return request<WheelStatusResult>("/api/rewards/wheel-status");
}

export function spinLuckyWheel() {
  return request<SpinWheelResult>("/api/rewards/spin-wheel", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
