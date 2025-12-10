// src/utils/api/adminchestapi.ts
// Real admin chest data fetchers + tiny safe fallbacks for first paint.

import type { ChestStatsData } from "@/components/admin/chest/ChestStats";
import type { ChestData } from "@/components/admin/chest/ChestTable";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "";

function toUrl(p: string) {
  return `${API_BASE.replace(/\/+$/, "")}${p.startsWith("/") ? p : `/${p}`}`;
}

type HttpOpts = { signal?: AbortSignal; fallbackToMock?: boolean };

async function httpJSON<T>(path: string, opts?: HttpOpts): Promise<T> {
  const r = await fetch(toUrl(path), {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
    ...(opts?.signal ? { signal: opts.signal } : {}),
  });

  let data: any = null;
  try {
    data = await r.json();
  } catch {
    /* ignore non-JSON bodies */
  }

  if (!r.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data as T;
}

/** ------- minimal safe fallbacks (used only if you enable fallbackToMock) ------- */
export const chestMockStats: ChestStatsData = {
  totalChests: 1247,
  dailyChests: 89,
  weeklyChests: 23,
  premiumChests: 45,
  totalClaimed: 892,
  totalValue: 15420.5,
  activeUsers: 234,
  claimRate: 71.5,
};

export const chestMockChests: ChestData[] = [
  {
    id: "1",
    walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    chestType: "daily",
    status: "claimed",
    claimedAt: "2024-01-15T10:30:00Z",
    expiresAt: "2024-01-16T00:00:00Z",
    rewardValue: 0.05,
    rewardType: "USD",
  },
  {
    id: "2",
    walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHU",
    chestType: "weekly",
    status: "available",
    expiresAt: "2024-01-20T00:00:00Z",
    rewardValue: 0.25,
    rewardType: "USD",
  },
  {
    id: "3",
    walletAddress: "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi",
    chestType: "daily",
    status: "available",
    expiresAt: "2024-01-18T12:00:00Z",
    rewardValue: 1.0,
    rewardType: "USD",
  },
  {
    id: "4",
    walletAddress: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    chestType: "weekly",
    status: "expired",
    expiresAt: "2024-01-14T23:59:59Z",
    rewardValue: 500,
    rewardType: "Points",
  },
];

/** ------- live API helpers ------- */

export async function fetchChests(
  limit = 200,
  opts?: HttpOpts
): Promise<ChestData[]> {
  try {
    const list = await httpJSON<ChestData[]>(
      `/promo/admin/chests?limit=${Math.min(500, Math.max(1, Number(limit || 200)))}`,
      opts
    );
    // Normalize defensively
    return (list || []).map((r) => ({
      ...r,
      id: String(r.id),
      chestType: r.chestType === "weekly" ? "weekly" : "daily",
      status: r.status || "claimed",
      walletAddress: r.walletAddress,
      claimedAt: r.claimedAt ? new Date(r.claimedAt).toISOString() : "",
      expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : "",
      rewardValue: Number.isFinite(Number(r.rewardValue)) ? Number(r.rewardValue) : 0,
      rewardType: r.rewardType || "Other",
    }));
  } catch (e) {
    if (opts?.fallbackToMock) return chestMockChests;
    throw e;
  }
}

export async function fetchChestStats(opts?: HttpOpts): Promise<ChestStatsData> {
  try {
    const s = await httpJSON<ChestStatsData>(`/promo/admin/chests/stats`, opts);
    return {
      totalChests: Number(s.totalChests ?? 0),
      dailyChests: Number(s.dailyChests ?? 0),
      weeklyChests: Number(s.weeklyChests ?? 0),
      premiumChests: Number(s.premiumChests ?? 0),
      totalClaimed: Number(s.totalClaimed ?? 0),
      totalValue: Number(s.totalValue ?? 0),
      activeUsers: Number(s.activeUsers ?? 0),
      claimRate: Number(s.claimRate ?? 0),
    };
  } catch (e) {
    if (opts?.fallbackToMock) return chestMockStats;
    throw e;
  }
}
