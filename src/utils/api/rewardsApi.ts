// utils/api/rewardsApi.ts

export interface Range {
  id: number;
  name: string;
  quote: string;
  image?: string | null;
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Level {
  id: number;
  range_id: number;
  level_number: number;
  title: string;
  reward: string | null;
  wagering: string | null;
  bonus?: string | null;
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
  range?: Range;
  totalClaimed?: number;
  totalUsers?: number;
}

export interface RewardClaim {
  id: string;
  userId: string;
  levelId: number;
  amount: number;
  claimedAt: string;
  transactionId?: string;
  level?: Pick<Level, "id" | "level_number" | "title" | "reward">;
}

export interface FreeSpins {
  count: number;
  valueUsd: number;
  maxWinUsd: number;
}

export interface UserRewardProgress {
  userId: string;
  currentWagered: number;
  currentLevel: Level | null;
  nextLevel: Level | null;
  claimedLevels: number[];
  availableToClaim: number[];
  currentRange?: Range | null;
  totalRewardsPaid?: number;
  freeSpins?: FreeSpins | null;
}

export interface RewardTier {
  id: string;
  name: string;
  icon?: string;
  requirement: number;
  rewardAmount: number;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalClaimed: number;
  totalUsers: number;
}

/* -------------------------------------------------------------------------- */
/*  Config URLs                                                               */
/* -------------------------------------------------------------------------- */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).replace(/\/$/, "");
const ASSET_BASE_URL = (process.env.NEXT_PUBLIC_ASSET_BASE_URL || API_BASE_URL).replace(/\/$/, "");

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function isAbsoluteUrl(u: string) {
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
}

function toAbsoluteAssetUrl(pathOrUrl?: string | null): string | null {
  if (!pathOrUrl) return null;
  const u = String(pathOrUrl);
  if (isAbsoluteUrl(u)) return u;
  const rel = u.startsWith("/") ? u : `/${u}`;
  return `${ASSET_BASE_URL}${rel}`;
}

/** Parse JSON safely */
async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Coerce any value to a safe number (no NaN) */
function toNum(v: any, def = 0): number {
  if (v === null || v === undefined) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/** Normalize images + numeric aggregates */
function normalizeRangeImages(range: Range): Range {
  return { ...range, image: toAbsoluteAssetUrl(range.image) };
}

function normalizeLevelImages(level: Level): Level {
  let out: Level = { ...level };
  if (level.range) out = { ...out, range: normalizeRangeImages(level.range) };

  // Coerce numeric aggregates
  (out as any).totalClaimed = toNum((level as any).totalClaimed ?? (level as any).total_claimed);
  (out as any).totalUsers = toNum((level as any).totalUsers ?? (level as any).total_users);
  return out;
}

/* -------------------------------------------------------------------------- */
/*  API Service                                                               */
/* -------------------------------------------------------------------------- */

export class RewardsApiService {
  // ----------------------- RANGES -----------------------
  static async fetchRanges(): Promise<Range[]> {
    const res = await fetch(`${API_BASE_URL}/admin/ranges`, { cache: "no-store" });
    const data = await json<Range[]>(res);
    return data.map(normalizeRangeImages);
  }

  static async createRange(rangeData: Omit<Range, "id" | "created_at" | "updated_at">): Promise<Range> {
    const payload = { ...rangeData, isActive: !!rangeData.isActive };
    const res = await fetch(`${API_BASE_URL}/admin/ranges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const created = await json<Range>(res);
    return normalizeRangeImages(created);
  }

  static async updateRange(id: number, rangeData: Partial<Omit<Range, "id" | "created_at" | "updated_at">>): Promise<Range> {
    const payload = { ...rangeData, isActive: rangeData.isActive == null ? undefined : !!rangeData.isActive };
    const res = await fetch(`${API_BASE_URL}/admin/ranges/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated = await json<Range>(res);
    return normalizeRangeImages(updated);
  }

  static async deleteRange(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/admin/ranges/${id}`, { method: "DELETE" });
    await json(res);
  }

  // ----------------------- LEVELS -----------------------
  static async fetchLevels(): Promise<Level[]> {
    const res = await fetch(`${API_BASE_URL}/admin/levels`, { cache: "no-store" });
    const levels = await json<Level[]>(res);
    return levels.map(normalizeLevelImages);
  }

  static async fetchLevelsByRange(rangeId: number): Promise<Level[]> {
    const res = await fetch(`${API_BASE_URL}/admin/ranges/${rangeId}/levels`, { cache: "no-store" });
    const levels = await json<Level[]>(res);
    return levels.map(normalizeLevelImages);
  }

  static async createLevel(levelData: Omit<Level, "id" | "created_at" | "updated_at" | "range" | "totalClaimed" | "totalUsers">): Promise<Level> {
    const payload = { ...levelData, isActive: !!levelData.isActive };
    const res = await fetch(`${API_BASE_URL}/admin/levels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const created = await json<Level>(res);
    return normalizeLevelImages(created);
  }

  static async updateLevel(
    id: number,
    levelData: Partial<Omit<Level, "id" | "created_at" | "updated_at" | "range" | "totalClaimed" | "totalUsers">>
  ): Promise<Level> {
    const payload = { ...levelData, isActive: levelData.isActive == null ? undefined : !!levelData.isActive };
    const res = await fetch(`${API_BASE_URL}/admin/levels/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated = await json<Level>(res);
    return normalizeLevelImages(updated);
  }

  static async deleteLevel(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/admin/levels/${id}`, { method: "DELETE" });
    await json(res);
  }

  // ------------------- PROGRESS & CLAIMS -------------------
  static async fetchUserProgress(userId: string): Promise<UserRewardProgress> {
    const res = await fetch(`${API_BASE_URL}/rewards/users/${encodeURIComponent(userId)}/progress`, {
      cache: "no-store",
    });
    const p = await json<UserRewardProgress>(res);

    if (p.currentLevel) p.currentLevel = normalizeLevelImages(p.currentLevel);
    if (p.nextLevel) p.nextLevel = normalizeLevelImages(p.nextLevel);
    if (p.currentRange) p.currentRange = normalizeRangeImages(p.currentRange);

    // Fix numeric coercion
    p.currentWagered = toNum((p as any).currentWagered);
    p.totalRewardsPaid = toNum((p as any).totalRewardsPaid);

    // Safely coerce nested level numeric values
    if (p.currentLevel) {
      (p.currentLevel as any).wagering_usd_calc = toNum((p.currentLevel as any).wagering_usd_calc);
      (p.currentLevel as any).reward_usd_calc = toNum((p.currentLevel as any).reward_usd_calc);
    }
    if (p.nextLevel) {
      (p.nextLevel as any).wagering_usd_calc = toNum((p.nextLevel as any).wagering_usd_calc);
      (p.nextLevel as any).reward_usd_calc = toNum((p.nextLevel as any).reward_usd_calc);
    }

    if (p.freeSpins) {
      p.freeSpins = {
        count: toNum((p.freeSpins as any).count),
        valueUsd: toNum((p.freeSpins as any).valueUsd),
        maxWinUsd: toNum((p.freeSpins as any).maxWinUsd),
      };
    } else {
      p.freeSpins = null;
    }

    return p;
  }

  static async claimReward(userId: string, levelId: number): Promise<RewardClaim> {
    const res = await fetch(`${API_BASE_URL}/rewards/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, levelId }),
    });
    const claim = await json<RewardClaim>(res);
    claim.amount = toNum(claim.amount);
    return claim;
  }

  static async uploadRewardIcon(file: File): Promise<{ iconUrl: string }> {
    const formData = new FormData();
    formData.append("icon", file);

    const res = await fetch(`${API_BASE_URL}/admin/rewards/upload-icon`, {
      method: "POST",
      body: formData,
    });

    const data = await json<{ iconUrl: string }>(res);
    return { iconUrl: toAbsoluteAssetUrl(data.iconUrl)! };
  }

  static async fetchRewardClaims(
    page = 1,
    limit = 20,
    filters: { levelId?: number; userId?: string } = {}
  ): Promise<{ claims: RewardClaim[]; total: number; pages: number }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.levelId) params.set("levelId", String(filters.levelId));
    if (filters.userId) params.set("userId", filters.userId);

    const res = await fetch(`${API_BASE_URL}/admin/rewards/claims?${params.toString()}`, { cache: "no-store" });
    const out = await json<{ claims: RewardClaim[]; total: number; pages: number }>(res);
    out.claims = out.claims.map((c) => ({ ...c, amount: toNum(c.amount) }));
    return out;
  }

  static async fetchSummary(): Promise<{ totalRewardsPaidUsd: number; totalUsers: number; totalClaims: number }> {
    const res = await fetch(`${API_BASE_URL}/admin/rewards/summary`, { cache: "no-store" });
    const s = await json<{ totalRewardsPaidUsd: number; totalUsers: number; totalClaims: number }>(res);
    return {
      totalRewardsPaidUsd: toNum(s.totalRewardsPaidUsd),
      totalUsers: toNum(s.totalUsers),
      totalClaims: toNum(s.totalClaims),
    };
  }
}
