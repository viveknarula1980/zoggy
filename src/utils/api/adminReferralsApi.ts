// referralsAdminApi.ts — real API client wired to your backend

// ================== Types (unchanged + a few new ones) ==================
export interface AdminAffiliate {
  id: string;
  walletAddress: string;
  affiliateId: string;
  referralLink: string;
  totalReferrals: number;
  activeReferrals: number;
  lifetimeEarnings: number;
  currentBalance: number;
  status: "active" | "suspended" | "banned";
  joinDate: string;
  lastActivity: string | null;
  fraudFlags: string[];
}

export interface AdminMetrics {
  totalAffiliates: number;
  activeAffiliates: number;
  totalCommissionsPaid: number;
  pendingPayouts: number;
  totalDepositsGenerated: number;
  netGamingRevenue: number;
  averageCommissionRate: number; // %
}

export interface PayoutRequest {
  id: string;
  affiliateId: string;
  walletAddress: string;
  amount: number;
  network: "SOL" | "USDT" | "ETH" | "BTC";
  status: "pending" | "approved" | "rejected" | "completed" | "processing";
  requestDate: string | null;
  processedDate?: string;
  fraudScore: number;
  isAutomatic: boolean;
  requiresManualReview: boolean;
  transactionHash?: string;
  notes?: string;
}

export interface FraudAlert {
  id: string;
  affiliateId: string;
  type: "multiple_ips" | "self_referral" | "no_wagering" | "suspicious_pattern";
  description: string;
  severity: "low" | "medium" | "high";
  date: string | null;
  resolved: boolean;
}

export interface CommissionRule {
  id: string;
  name: string;
  gameType: "all" | "crash" | "slots" | "mines" | "dice" | "plinko";
  commissionRate: number;
  bonusPerDeposit: number;
  rakeback: number;
  isGlobal: boolean;
  affiliateIds: string[];
  tierBasedRates: {
    enabled: boolean;
    tiers: { minVolume: number; commissionRate: number; bonusMultiplier: number }[];
  };
  bonusTriggers: {
    firstDepositBonus: number;
    minimumDepositAmount: number;
    recurringDepositBonus: number;
    volumeMilestoneBonus: { volume: number; bonus: number }[];
  };
  rakebackIncentives: {
    baseRakeback: number;
    referralBonus: number;
    loyaltyMultiplier: number;
  };
  restrictions: {
    minimumBetAmount: number;
    excludedCountries: string[];
    maxCommissionPerMonth: number;
    requireKYC: boolean;
  };
  validityPeriod: {
    startDate: string;
    endDate?: string;
    isActive: boolean;
  };
}

export interface TopAffiliate {
  affiliateId: string;
  walletAddress: string;
  totalVolume: number;
  commissionEarned: number;
  referralCount: number;
}

export interface PayoutSettings {
  autoPayoutEnabled: boolean;
  autoPayoutThreshold: number;      // USD in your UI, backend converts to lamports
  autoPayoutMaxAmount: number;      // USD
  defaultNetwork: "SOL" | "USDT" | "ETH" | "BTC";
  fraudScoreThreshold: number;      // 0..1
  requireManualReviewAbove: number; // USD
}

// ===== NEW: Activity Feed & Sources & KPI types =====
export type ActivityType = "signup" | "deposit" | "commission" | "payout" | "other";
export type ActivityStatus = "success" | "pending" | "failed";

export interface AdminActivityItem {
  id: string;                       // unique id
  type: ActivityType;
  affiliateId: string;
  description: string;
  amount: number | null;            // USD
  timestamp: string;                // ISO string from backend
  status: ActivityStatus;
}

export interface TopSourceToday {
  source: string;                   // e.g., "Telegram Groups"
  signups: number;
  conversion: number;               // 0..100 (%)
}

export interface ActivityStats {
  signupsToday: number;
  depositsToday: number;
  commissionsToday: number;
  activeAffiliates: number;
}

// ================== HTTP helpers ==================
const ORIGIN =
  (typeof process !== "undefined" && 
    ((process.env as any)?.NEXT_PUBLIC_BACKEND_URL ||
     (process.env as any)?.NEXT_PUBLIC_API_URL)?.replace(/\/$/, "")) ||
  ""; // empty = same origin
const BASE = `${ORIGIN}/api/admin/referrals`;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = (body as any)?.error || msg;
    } catch {}
    throw new Error(`${res.status} ${msg}`);
  }
  return res.json() as Promise<T>;
}

// ================== Real implementations (same signatures) ==================

// Affiliates
export function getAffiliates(): Promise<AdminAffiliate[]> {
  return http<AdminAffiliate[]>(`${BASE}/affiliates`);
}

export function updateAffiliateStatus(
  affiliateId: string,
  status: "active" | "suspended" | "banned"
): Promise<{ ok: true }> {
  return http<{ ok: true }>(`${BASE}/affiliates/${encodeURIComponent(affiliateId)}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

// Metrics (overall)
export function getAdminMetrics(): Promise<AdminMetrics> {
  return http<AdminMetrics>(`${BASE}/metrics`);
}

// Payouts
export function getPayoutRequests(): Promise<PayoutRequest[]> {
  return http<PayoutRequest[]>(`${BASE}/payouts`);
}

export function createManualPayout(
  affiliateId: string,
  amount: number,
  network: "SOL" | "USDT" | "ETH" | "BTC",
  notes?: string
): Promise<{ ok: true; id: string }> {
  return http<{ ok: true; id: string }>(`${BASE}/payouts/manual`, {
    method: "POST",
    body: JSON.stringify({ affiliateId, amount, network, notes }),
  });
}

export function triggerAutomaticPayouts(): Promise<{ ok: true; created: number }> {
  return http<{ ok: true; created: number }>(`${BASE}/payouts/auto-trigger`, { method: "POST" });
}

/** Extended to support optional txHash for 'processing' / 'complete' */
export function processPayout(
  payoutId: string,
  action: "approve" | "reject" | "completed" | "processing" | "complete",
  network?: "SOL" | "USDT" | "ETH" | "BTC",
  notes?: string,
  txHash?: string
): Promise<{ ok: true }> {
  return http<{ ok: true }>(`${BASE}/payouts/${encodeURIComponent(payoutId)}`, {
    method: "PUT",
    body: JSON.stringify({ action, network, notes, txHash }),
  });
}

// Payout settings
export function getPayoutSettings(): Promise<PayoutSettings> {
  return http<PayoutSettings>(`${BASE}/payout-settings`);
}

export function updatePayoutSettings(settings: PayoutSettings): Promise<{ ok: true }> {
  return http<{ ok: true }>(`${BASE}/payout-settings`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

// Commission Rules
export function getCommissionRules(): Promise<CommissionRule[]> {
  return http<CommissionRule[]>(`${BASE}/rules`);
}

export function createCommissionRule(rule: Omit<CommissionRule, "id">): Promise<{ id: string }> {
  return http<{ id: string }>(`${BASE}/rules`, {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export function updateCommissionRule(rule: CommissionRule): Promise<{ ok: true }> {
  return http<{ ok: true }>(`${BASE}/rules/${encodeURIComponent(rule.id)}`, {
    method: "PUT",
    body: JSON.stringify(rule),
  });
}

export function deleteCommissionRule(ruleId: string): Promise<{ ok: true }> {
  return http<{ ok: true }>(`${BASE}/rules/${encodeURIComponent(ruleId)}`, { method: "DELETE" });
}

// Leaderboards / Fraud
export function getTopAffiliates(): Promise<TopAffiliate[]> {
  return http<TopAffiliate[]>(`${BASE}/top`);
}

export function getFraudAlerts(): Promise<FraudAlert[]> {
  return http<FraudAlert[]>(`${BASE}/fraud`);
}

export function resolveFraudAlert(id: string, resolved = true): Promise<{ ok: true }> {
  return http<{ ok: true }>(`${BASE}/fraud/${encodeURIComponent(id)}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ resolved }),
  });
}

// ================== NEW: Activity Feed & Sources & KPIs ==================
//
// Back-end routes assumed:
//   GET  /api/admin/referrals/activity?limit=50
//   GET  /api/admin/referrals/activity/stats?window=today
//   GET  /api/admin/referrals/sources/top?window=today
//
// Adjust if your backend uses different paths.

export function getRecentAdminActivity(limit = 50): Promise<AdminActivityItem[]> {
  const url = `${BASE}/activity?limit=${encodeURIComponent(limit)}`;
  return http<AdminActivityItem[]>(url);
}

export function getActivityStats(window: "today" | "7d" | "30d" = "today"): Promise<ActivityStats> {
  const url = `${BASE}/activity/stats?window=${encodeURIComponent(window)}`;
  return http<ActivityStats>(url);
}

export function getTopSourcesToday(): Promise<TopSourceToday[]> {
  const url = `${BASE}/sources/top?window=today`;
  return http<TopSourceToday[]>(url);
}
