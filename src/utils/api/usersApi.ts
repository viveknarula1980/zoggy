// utils/api/usersApi.ts

export interface User {
  id: string;
  username: string; // wallet name
  walletAddress: string;

  /** PDA balance shown in the Admin UI, in USDT (fiat), rounded to 2 decimals. */
  pdaBalance: number;

  status: "active" | "disabled" | "banned";
  withdrawalsEnabled: boolean; // Admin control for withdrawal permissions
  joinedAt: string;
  lastActive: string;
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  favoriteGame?: string | null;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: "login" | "bet" | "win" | "loss" | "deposit" | "withdrawal";
  game?: string;
  amount?: number;
  timestamp: string;
  details?: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  newUsersToday: number;
}

/** Raw shape coming from the backend (may contain lamports or USDT). */
type PageRespRaw = { users: any[]; total: number; pages: number };

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

/** Fallback price if backend doesn't send a USD-converted value */
const USD_PER_SOL_FALLBACK = Number(process.env.NEXT_PUBLIC_USD_PER_SOL || 200);

function toNumber(v: any, d = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function lamportsToUsdt(lamports: number, usdPerSol = USD_PER_SOL_FALLBACK): number {
  return +(((lamports || 0) / 1e9) * usdPerSol).toFixed(2);
}

/**
 * Normalize a raw user object into the UI-facing User where
 * `pdaBalance` is **USDT** only.
 *
 * Accepted raw fields (whichever exists will be used):
 * - pdaBalanceUsdt (preferred if provided by backend)
 * - pdaBalanceLamports (backend live lamports)
 * - pdaBalance (legacy lamports in DB)
 */
function normalizeUser(raw: any): User {
  const lamports = toNumber(
    raw?.pdaBalanceLamports != null ? raw.pdaBalanceLamports : raw?.pdaBalance,
    0
  );

  const pdaBalanceUsdt =
    raw?.pdaBalanceUsdt != null ? toNumber(raw?.pdaBalanceUsdt) : lamportsToUsdt(lamports);

  return {
    id: String(raw?.id ?? ""),
    username: String(raw?.username ?? raw?.walletAddress ?? ""),
    walletAddress: String(raw?.walletAddress ?? ""),
    pdaBalance: pdaBalanceUsdt, // <-- USDT only

    status: (raw?.status as User["status"]) ?? "active",
    withdrawalsEnabled: raw?.withdrawalsEnabled ?? true, // Default to enabled
    joinedAt: String(raw?.joinedAt ?? ""),
    lastActive: String(raw?.lastActive ?? ""),
    totalBets: toNumber(raw?.totalBets),
    totalWins: toNumber(raw?.totalWins),
    totalLosses: toNumber(raw?.totalLosses),
    winRate: toNumber(raw?.winRate),
    favoriteGame: raw?.favoriteGame ?? null,
  };
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json();
}

export class UsersApiService {
  /** Fetch all users (used by your current UI for client-side filtering/pagination). */
  static async fetchUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE_URL}/admin/users?limit=1000`, { cache: "no-store" });
    const data = await json<PageRespRaw>(res);
    return (data.users || []).map(normalizeUser);
  }

  /** Small stats box on Users page */
  static async fetchUserStats(): Promise<UserStats> {
    // Ask the backend for counts cheaply (limit=1 to only get totals).
    const [all, active, banned] = await Promise.all([
      fetch(`${API_BASE_URL}/admin/users?limit=1`, { cache: "no-store" })
        .then((r) => json<PageRespRaw>(r))
        .then((d) => d.total)
        .catch(() => 0),
      fetch(`${API_BASE_URL}/admin/users?status=active&limit=1`, { cache: "no-store" })
        .then((r) => json<PageRespRaw>(r))
        .then((d) => d.total)
        .catch(() => 0),
      fetch(`${API_BASE_URL}/admin/users?status=banned&limit=1`, { cache: "no-store" })
        .then((r) => json<PageRespRaw>(r))
        .then((d) => d.total)
        .catch(() => 0),
    ]);

    return {
      totalUsers: Number(all || 0),
      activeUsers: Number(active || 0),
      bannedUsers: Number(banned || 0),
      newUsersToday: 0, // add a backend filter later if needed
    };
  }

  /** Server-side pagination + filtering (optional; not used by your current UI) */
  static async fetchUsersWithPagination(
    page: number = 1,
    limit: number = 20,
    filters: { status?: string; search?: string } = {}
  ): Promise<{ users: User[]; total: number; pages: number }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);

    const res = await fetch(`${API_BASE_URL}/admin/users?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await json<PageRespRaw>(res);
    return { users: (data.users || []).map(normalizeUser), total: data.total, pages: data.pages };
  }

  static async getUserDetails(userId: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}`, {
      cache: "no-store",
    });
    const data = await json<any>(res);
    return normalizeUser(data);
  }

  static async fetchUserActivities(userId: string): Promise<UserActivity[]> {
    const res = await fetch(
      `${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}/activities?limit=100`,
      { cache: "no-store" }
    );
    return json<UserActivity[]>(res);
  }

  static async updateUserStatus(
    userId: string,
    status: "active" | "disabled" | "banned"
  ): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await json(res); // throw on non-200
  }

  /**
   * Admin "fake" (promo) balance adjuster — integrates with:
   * PUT /admin/fake/users/:id/promo-balance
   * Body: { type: "add"|"subtract", amountUsd?: number, amountLamports?: number, reason?: string }
   * Requires: Authorization: Bearer <ADMIN_API_KEY>
   */
  static async adjustUserBalance(
    userId: string,
    amount: number,
    type: "add" | "subtract",
    reason?: string
  ): Promise<void> {
    const apiKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY || "";

    const res = await fetch(
      `${API_BASE_URL}/admin/fake/users/${encodeURIComponent(userId)}/promo-balance`,
      {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          type,           // "add" | "subtract"
          amountUsd: amount,
          reason,
        }),
      }
    );

    // friendlier errors for auth issues
    if (res.status === 401 || res.status === 403) {
      const detail = await res.text().catch(() => "");
      const hint =
        res.status === 401
          ? "Missing admin key. Set NEXT_PUBLIC_ADMIN_API_KEY in the frontend .env."
          : "Forbidden. Ensure NEXT_PUBLIC_ADMIN_API_KEY (frontend) exactly matches ADMIN_API_KEY (backend).";
      throw new Error(`${hint}${detail ? ` — ${detail}` : ""}`);
    }

    await json(res); // throw if non-2xx
  }

  static async updateWithdrawalPermissions(
    userId: string,
    withdrawalsEnabled: boolean,
    reason?: string
  ): Promise<void> {
    const apiKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY || "";

    const res = await fetch(
      `${API_BASE_URL}/admin/fake/users/${encodeURIComponent(userId)}/withdrawals`,
      {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ withdrawalsEnabled, reason }),
      }
    );
    if (res.status === 401 || res.status === 403) {
      const detail = await res.text().catch(() => "");
      const hint =
        res.status === 401
          ? "Missing admin key. Set NEXT_PUBLIC_ADMIN_API_KEY in the frontend .env."
          : "Forbidden. Ensure NEXT_PUBLIC_ADMIN_API_KEY (frontend) exactly matches ADMIN_API_KEY (backend).";
      throw new Error(`${hint}${detail ? ` — ${detail}` : ""}`);
    }
    await json(res);
  }
}
