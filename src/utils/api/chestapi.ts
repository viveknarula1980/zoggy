// src/utils/api/chestapi.ts
// Chest API client with robust wallet/device detection & safe error handling.

export type DepositBooster = {
  type: "deposit_booster";
  multiplier: number;
  capLamports: string | null;
  note?: string;
};

export type FreeSpins = {
  type: "free_spins";
  count: number;
  gameId?: string;
  valueUsd: number;
  maxWinUsd?: number;
};

export type DirectUsd = {
  type: "direct_usd";
  usd: number;
  lamports?: string;
};

export type PrizeDetails =
  | DepositBooster
  | FreeSpins
  | DirectUsd
  | { type: "mystery"; [k: string]: any };

export type DailyEligibilityResponse = {
  eligible: boolean;
  reason: string | null;
  streak: number;
};

// Use `reason` (not `message`). We'll still accept `message` from old backends and map it.
export type WeeklyEligibilityResponse = {
  eligible: boolean;
  reason: string | null;
};

export type ClaimResponse = {
  ok: boolean;
  prize: string;         // prize_key
  details: PrizeDetails; // structured details
  claimId: string;
  claimedAt: string;     // ISO
};

// For legacy UIs that expect a quick display value
export type RewardDisplay = number | string;

/* ---------------- Config & helpers ---------------- */

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "";

function toUrl(p: string) {
  return `${API_BASE.replace(/\/+$/, "")}${p.startsWith("/") ? p : `/${p}`}`;
}

/**
 * Fetch JSON safely and throw friendly errors
 */
async function httpJSON<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const r = await fetch(toUrl(path), {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      ...init,
    });

    let data: any = {};
    try {
      data = await r.json();
    } catch {
      data = {};
    }

    if (!r.ok) {
      const msg = (data && (data.error || data.message || data.reason)) || `HTTP ${r.status}`;
      throw new Error(msg);
    }

    return data as T;
  } catch (err: any) {
    // Always throw a proper Error with a safe message
    throw new Error(err?.message || "Network error, please try again.");
  }
}

const WALLET_KEYS = ["preferred_wallet", "user_wallet", "walletAddress"];

export function setPreferredWalletAddress(addr: string | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    if (!addr) {
      WALLET_KEYS.forEach((k) => localStorage.removeItem(k));
      return;
    }
    localStorage.setItem(WALLET_KEYS[0], addr);
  } catch {}
}

function getWalletFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    for (const k of WALLET_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
  } catch {}
  return null;
}

function getWalletFromInjected(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const anyWin = window as any;
    const pk = anyWin?.solana?.publicKey;
    if (pk?.toBase58) return pk.toBase58();
    if (typeof pk === "string" && pk.length > 30) return pk;
  } catch {}
  return null;
}

function resolveWalletAddress(explicit?: string): string | null {
  if (explicit && explicit.length > 30) return explicit;
  return getWalletFromInjected() || getWalletFromStorage();
}

function getOrMakeDeviceId(): string {
  if (typeof window === "undefined") return `dev_${Date.now()}`;
  try {
    const k = "device_id";
    let v = localStorage.getItem(k);
    if (!v) {
      v =
        (crypto?.randomUUID?.() ??
          `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`) as string;
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return `dev_${Date.now()}`;
  }
}

export function prizeToDisplay(details: PrizeDetails, prizeKey: string): RewardDisplay {
  if (details?.type === "direct_usd") {
    return `$${(details.usd ?? 0).toFixed(2)} Bonus`;
  }
  if (details?.type === "free_spins") {
    const v = Number(details.valueUsd ?? 0);
    return `${details.count} Free Spins @ $${v.toFixed(2)}`;
  }
  if (details?.type === "deposit_booster") {
    const mult = Number(details.multiplier ?? 1);
    const plusPct = Math.round((mult - 1) * 100);
    const capSol =
      details.capLamports && !Number.isNaN(Number(details.capLamports))
        ? ` (cap ${(Number(details.capLamports) / 1e9).toFixed(2)} SOL)`
        : "";
    return mult >= 2
      ? `2× Deposit Booster${capSol}`
      : `+${plusPct}% Deposit Booster${capSol}`;
  }
  return prizeKey.replace(/[_-]/g, " ");
}

/* ---------------- Public APIs ---------------- */

export async function getDailyEligibility(wallet?: string, deviceId?: string) {
  const w = resolveWalletAddress(wallet);
  if (!w) throw new Error("Connect your wallet to check daily chest.");
  return httpJSON<DailyEligibilityResponse>(
    `/promo/chest/daily/eligibility?wallet=${encodeURIComponent(w)}&deviceId=${encodeURIComponent(
      deviceId || getOrMakeDeviceId()
    )}`
  );
}

export async function claimDailyChest(userWallet?: string, deviceId?: string) {
  const wallet = resolveWalletAddress(userWallet);
  if (!wallet) throw new Error("Connect your wallet to claim the daily chest.");
  return httpJSON<ClaimResponse>(`/promo/chest/daily/claim`, {
    method: "POST",
    body: JSON.stringify({
      userWallet: wallet,
      deviceId: deviceId || getOrMakeDeviceId(),
    }),
  });
}

export async function getWeeklyEligibility(wallet?: string) {
  const w = resolveWalletAddress(wallet);
  if (!w) throw new Error("Connect your wallet to check weekly chest.");

  // Backend may return { eligible, reason } or older { eligible, message }
  const raw = await httpJSON<any>(
    `/promo/chest/weekly/eligibility?wallet=${encodeURIComponent(w)}`
  );

  const normalized: WeeklyEligibilityResponse = {
    eligible: !!raw.eligible,
    reason: raw.reason ?? raw.message ?? null, // ← normalize for toast
  };
  return normalized;
}

export async function claimWeeklyChest(userWallet?: string, deviceId?: string) {
  const wallet = resolveWalletAddress(userWallet);
  if (!wallet) throw new Error("Connect your wallet to claim the weekly chest.");
  return httpJSON<ClaimResponse>(`/promo/chest/weekly/claim`, {
    method: "POST",
    body: JSON.stringify({
      userWallet: wallet,
      deviceId: deviceId || getOrMakeDeviceId(),
    }),
  });
}

/**
 * Back-compat wrapper (if you still need it elsewhere).
 * Returns a friendly display string/number for quick UIs.
 */
export async function claimChestReward(
  type: string,
  userWallet?: string,
  deviceId?: string
): Promise<RewardDisplay> {
  try {
    const t = String(type).toLowerCase();
    const kind = t.includes("week") ? "weekly" : "daily";

    const resp =
      kind === "weekly"
        ? await claimWeeklyChest(userWallet, deviceId)
        : await claimDailyChest(userWallet, deviceId);

    return prizeToDisplay(resp.details, resp.prize);
  } catch (err: any) {
    return `❌ ${err?.message || "Something went wrong"}`;
  }
}
