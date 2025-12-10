// utils/api/referralsApi.ts

// ==== Bonus Milestones (real API via backend) ====
export type BonusMilestone = {
  id: string;
  title: string;
  requirement: string;
  reward: string;
  achieved: boolean;
  icon: string;
};

export async function getBonusMilestones(): Promise<BonusMilestone[]> {
  const wallet = await getWallet();
  const res = await fetchJson<{ milestones: BonusMilestone[] }>(
    `/promo/affiliates/me/bonus-milestones?wallet=${encodeURIComponent(wallet)}`
  );
  return res.milestones ?? [];
}

// ==== Top Games (real API via backend) ====
export type TopGame = {
  game: string;
  commission: number;
  percentage: number;
};

export async function getTopGames(limit = 4): Promise<TopGame[]> {
  const wallet = await getWallet();
  const data = await fetchJson<GameBreakdown[]>(
    `/promo/affiliates/me/games?wallet=${encodeURIComponent(wallet)}`
  );

  return (data ?? [])
    .sort((a, b) => (b?.amount ?? 0) - (a?.amount ?? 0))
    .slice(0, limit)
    .map((g) => ({
      game: prettifyGame(g?.game ?? ""),
      commission: Number((g?.amount ?? 0).toFixed(2)),
      percentage: Number((g?.percentage ?? 0).toFixed(1)),
    }));
}

function prettifyGame(k: string): string {
  const map: Record<string, string> = {
    crash: "Crash",
    memeslot: "Slots",
    slots: "Slots",
    mines: "Mines",
    dice: "Dice",
    plinko: "Plinko",
    coinflip: "Coinflip",
    coinflip_pvp: "Coinflip",
  };
  const key = (k || "").toLowerCase();
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : "Other");
}

// ===== Types wired to /promo/* =====
export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalCommission: number;
  pendingBonuses: number;
  weeklyGrowth: number;
  monthlyCommission: number;
}

export interface BonusData {
  dailyReferrals: number;
  dailyTarget: number;
  unlockedBonus: number;
  nextMilestone: number;
  streakDays: number;
  totalBonusEarned: number;
}

export interface CommissionData {
  week: Array<{ day: string; amount: number; game: string }>;
  month: Array<{ period: string; amount: number }>;
}

export interface GameBreakdown {
  game: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface ReferralActivity {
  id: number;
  username: string;
  firstDeposit: string | null;
  amountWagered: number;
  commissionEarned: number;
  status: "active" | "inactive" | "pending";
  lastActivity: string | null;
  totalDeposits: number;
}

export interface ReferralLinkData {
  referralCode: string;
  referralLink: string;
  totalClicks: number;
  conversions: number;
  conversionRate: number;
}

export interface UnclaimedCommission {
  amount: number;          // USD available (not yet requested/locked/paid)
  lastUpdated?: string;    // ISO datetime
  canClaim: boolean;       // true if user is allowed to request now
  minimum?: number;        // optional minimum USD threshold to request
  nextEligibleAt?: string; // optional ISO (cooldown/next window)
}

export interface ClaimCommissionResponse {
  success: boolean;
  claimedAmount: number;    // USD that this request represents
  transactionId?: string;   // optional tx/receipt id when applicable
  message?: string;
}

// ----------------- internal helpers -----------------

const API_BASE =
  (typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL)?.replace(/\/$/, "")) ||
  "";

// try to read wallet directly from injected providers
function getWalletFromWindow(): string | null {
  try {
    const anyWin = globalThis as any;
    if (anyWin?.solana?.publicKey?.toBase58) return anyWin.solana.publicKey.toBase58();
    if (anyWin?.backpack?.publicKey?.toBase58) return anyWin.backpack.publicKey.toBase58();
  } catch {}
  return null;
}

// fallback to localStorage
function getWalletFromStorage(): string | null {
  try {
    const keys = [
      "wallet",
      "walletAddress",
      "publicKey",
      "phantom:publicKey",
      "solana:publicKey",
      "flipverse:wallet",
      "aff_wallet",
    ];
    for (const k of keys) {
      const v = (globalThis as any)?.localStorage?.getItem?.(k);
      if (v && String(v).length > 20) return v;
    }
  } catch {}
  return null;
}

async function getWallet(): Promise<string> {
  const w = getWalletFromWindow() || getWalletFromStorage();
  if (w) return w;
  throw new Error("Wallet not detected");
}

function getOrMakeDeviceId(): string {
  try {
    const k = "device_id";
    let id = (globalThis as any)?.localStorage?.getItem?.(k) || "";
    if (!id) {
      id =
        (globalThis.crypto as any)?.randomUUID?.() ||
        Math.random().toString(36).slice(2);
      (globalThis as any)?.localStorage?.setItem?.(k, id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function safeText(res: Response) {
  try {
    return (await res.text())?.slice(0, 400);
  } catch {
    return "";
  }
}

// ----------------- public API -----------------

export async function getReferralStats(): Promise<ReferralStats> {
  const wallet = await getWallet();
  return fetchJson<ReferralStats>(
    `/promo/affiliates/me/summary?wallet=${encodeURIComponent(wallet)}`
  );
}

export async function getBonusData(): Promise<BonusData> {
  const wallet = await getWallet();
  return fetchJson<BonusData>(
    `/promo/affiliates/me/bonus?wallet=${encodeURIComponent(wallet)}`
  );
}

export async function getCommissionData(): Promise<CommissionData> {
  const wallet = await getWallet();
  return fetchJson<CommissionData>(
    `/promo/affiliates/me/commissions?wallet=${encodeURIComponent(wallet)}`
  );
}

export async function getGameBreakdown(): Promise<GameBreakdown[]> {
  const wallet = await getWallet();
  return fetchJson<GameBreakdown[]>(
    `/promo/affiliates/me/games?wallet=${encodeURIComponent(wallet)}`
  );
}

export async function getReferralActivity(): Promise<ReferralActivity[]> {
  const wallet = await getWallet();
  return fetchJson<ReferralActivity[]>(
    `/promo/affiliates/me/activity?wallet=${encodeURIComponent(wallet)}`
  );
}

export async function getReferralLinkData(): Promise<ReferralLinkData> {
  const wallet = await getWallet();
  return fetchJson<ReferralLinkData>(
    `/promo/affiliates/me/link?wallet=${encodeURIComponent(wallet)}`
  );
}

// ----------------- optional client-side tracking (not required) -----------------
export async function trackReferralClick(code: string) {
  const deviceId = getOrMakeDeviceId();
  try {
    await fetchJson(`/promo/affiliates/link/click`, {
      method: "POST",
      body: JSON.stringify({
        code,
        deviceId,
        userWallet: getWalletFromWindow() || getWalletFromStorage() || null,
        landingUrl: typeof window !== "undefined" ? window.location.href : null,
        refererUrl: typeof document !== "undefined" ? document.referrer : null,
      }),
    });
    // optional debug
    // console.debug("Referral click logged for code", code);
  } catch (e) {
    console.error("Referral click log failed", e);
  }
}

export async function bindReferral(code: string, walletOverride?: string | null) {
  const wallet =
    (walletOverride && walletOverride.length > 20 && walletOverride) ||
    (await getWallet());
  const deviceId = getOrMakeDeviceId();
  const body = { code, userWallet: wallet, deviceId };
  return fetchJson<{ ok: boolean; alreadyBound?: boolean }>(
    `/promo/referrals/bind`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

/* ----------------- Unclaimed + Claim (user request -> admin approval) -----------------

Your backend already exposes:

  GET  /promo/affiliates/me/unclaimed?wallet=<ADDR>
  POST /promo/affiliates/me/claim        { wallet: "<ADDR>" }

This file calls those first. For robustness, it also gracefully falls back to
slight naming variants that might exist in other deployments:
  - /promo/affiliates/me/unclaimed-commission
  - /promo/affiliates/me/claim-commission

The GET is expected to return something like:
  { amountUsd|amount, canClaim, lastUpdated?, minimumUsd?, nextEligibleAt? }

The POST is expected to return something like:
  { ok|success: boolean, claimedUsd|claimedAmount: number, txSig|transactionId?, message? }

*/

export async function getUnclaimedCommission(): Promise<UnclaimedCommission> {
  const wallet = await getWallet();

  // primary
  try {
    const raw = await fetchJson<any>(
      `/promo/affiliates/me/unclaimed?wallet=${encodeURIComponent(wallet)}`
    );
    return normalizeUnclaimed(raw);
  } catch (e1) {
    // fallback variations
    try {
      const raw = await fetchJson<any>(
        `/promo/affiliates/me/unclaimed-commission?wallet=${encodeURIComponent(wallet)}`
      );
      return normalizeUnclaimed(raw);
    } catch (e2) {
      // as a very last resort, return zero-able structure so UI stays stable
      console.error("Unclaimed endpoint not available:", e1 || e2);
      return { amount: 0, canClaim: false };
    }
  }
}

function normalizeUnclaimed(raw: any): UnclaimedCommission {
  const amount =
    Number(raw?.amountUsd ?? raw?.amount ?? 0) || 0;
  const min =
    Number(raw?.minimumUsd ?? raw?.minimum ?? 0) || undefined;
  return {
    amount,
    canClaim: Boolean(raw?.canClaim ?? amount > 0),
    lastUpdated: raw?.lastUpdated ?? raw?.updatedAt ?? undefined,
    minimum: min,
    nextEligibleAt: raw?.nextEligibleAt ?? undefined,
  };
}

export async function claimCommission(): Promise<ClaimCommissionResponse> {
  const wallet = await getWallet();

  // primary
  try {
    const data = await fetchJson<any>(`/promo/affiliates/me/claim`, {
      method: "POST",
      body: JSON.stringify({ wallet }),
    });
    return normalizeClaim(data);
  } catch (e1) {
    // fallback variation
    try {
      const data = await fetchJson<any>(`/promo/affiliates/me/claim-commission`, {
        method: "POST",
        body: JSON.stringify({ wallet }),
      });
      return normalizeClaim(data);
    } catch (e2) {
      const message =
        (e1 as Error)?.message || (e2 as Error)?.message || "Claim failed";
      return { success: false, claimedAmount: 0, message };
    }
  }
}

function normalizeClaim(data: any): ClaimCommissionResponse {
  const ok = Boolean(data?.ok ?? data?.success ?? false);
  const claimed =
    Number(data?.claimedUsd ?? data?.claimedAmount ?? 0) || 0;
  return {
    success: ok,
    claimedAmount: claimed,
    message: data?.message,
    transactionId: data?.txSig ?? data?.transactionId,
  };
}
