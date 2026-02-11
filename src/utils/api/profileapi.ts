"use client";

// ====== Types kept identical ======
export interface UserProfile {
  username: string;
  walletAddress: string;
  pdaBalance: number;
  joinedAt: string;
  lastActive: string;
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  favoriteGame: string | null;
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXp: number;
}

export interface BonusData {
  type: string;
  amount: number;
  wageredAmount: number;
  requiredWager: number;
  expiresAt: Date;
  isActive: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  totalWagered: number;
  currentLevel: string;
  isCurrentUser?: boolean;
}

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number; // USD only
  status: "completed" | "pending" | "failed";
  timestamp: Date;
  txHash?: string;
  address?: string;
}

// ====== Internal helpers (no API surface changes) ======
function apiBase(): string {
  const v =
    (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_BACKEND_URL) ||
    (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_API_URL) ||
    "";
  return v || "";
}

function usdPerSolClient(): number {
  const raw =
    (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_USD_PER_SOL) || "";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 200;
}

function toISODate(input: any): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(+d)) return "";
  return d.toISOString().slice(0, 10);
}

function shortWallet(w?: string | null): string {
  const s = String(w || "");
  if (s.length <= 8) return s || "Unknown";
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

function syncGet<T = any>(url: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) {
      return JSON.parse(xhr.responseText) as T;
    }
  } catch {}
  return null;
}

// ====== Server response shapes ======
type AdminUserDetails = {
  id: string;
  username: string;
  walletAddress: string;
  pdaBalance: number;
  joinedAt: string | Date | null;
  lastActive: string | Date | null;
  totalBets: number;
  totalWins: number;
  totalLosses?: number;
  winRate?: number;
  favoriteGame: string | null;
};

type RewardsProgress = {
  currentWagered: number;
  currentLevel: {
    level_number: number;
    title: string;
    range_id: number;
  } | null;
  currentRange?: { id: number; name: string } | null;
  nextLevel?: {
    level_number: number;
    title: string;
    wagering: string;
  } | null;
};

// IMPORTANT: include optional `details` so we can ignore "withdraw_prepare"
type ActivityRow =
  | {
      type?: string;
      action?: string;
      kind?: string;
      details?: string;
      amount?: number | string;
      amount_usd?: number | string;
      price_usd_per_sol?: number | string;
      currency?: string;
      timestamp?: string;
      time?: string;
      created_at?: string;
      createdAt?: string;
      tx_hash?: string;
      txSig?: string;
      tx_signature?: string;
      signature?: string;
    }
  | Record<string, any>;

type TransactionsList = {
  transactions: Array<{
    id: string | number;
    username?: string;
    walletAddress?: string;
    type?: string;
    amount?: number | string;
    currency?: string;
    status?: string;
    timestamp?: string;
    tx_hash?: string;
  }>;
};

// ====== Rank name (authoritative from backend progress only) ======
export function getRankName(_level: number): string {
  return LAST_META.currentRank || "UNRANKED";
}

function num(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.replace(/[$,]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function firstDefined<T>(...vals: (T | undefined | null)[]): T | undefined {
  return vals.find((v) => v !== undefined && v !== null) as T | undefined;
}

function parseMoneyLike(s?: string): number {
  if (!s) return 0;
  return num(s);
}

function pickTxHash(r: any): string | undefined {
  return firstDefined(r?.tx_hash, r?.txSig, r?.tx_signature, r?.signature, undefined);
}

function pickTimestamp(r: any): string | undefined {
  return firstDefined(r?.timestamp, r?.time, r?.created_at, r?.createdAt, undefined);
}

function pickAction(r: any): string {
  const raw = String(firstDefined(r?.type, r?.action, r?.kind, "") || "").toLowerCase();
  if (raw.includes("deposit")) return "deposit";
  if (raw.includes("withdraw")) return "withdrawal";
  return "";
}

// ---- helper: detect "withdraw_prepare" in any relevant field ----
function isWithdrawPrepareRow(r: ActivityRow): boolean {
  const d = String((r as any)?.details || "").toLowerCase();
  const t = String((r as any)?.type || "").toLowerCase();
  const a = String((r as any)?.action || "").toLowerCase();
  const k = String((r as any)?.kind || "").toLowerCase();
  return (
    d === "withdraw_prepare" ||
    d.includes("withdraw_prepare") ||
    t === "withdraw_prepare" ||
    a === "withdraw_prepare" ||
    k === "withdraw_prepare"
  );
}

// ---- USD-only transaction mapping ----
function amountToUsd(r: ActivityRow): number {
  const au = (r as any)?.amount_usd;
  if (au !== undefined && au !== null && String(au) !== "") return num(au);

  const cur = String(((r as any)?.currency || "")).toUpperCase();
  if (cur === "USD" || cur === "USDT") return num((r as any)?.amount);

  const priceSnap = num((r as any)?.price_usd_per_sol);
  if (priceSnap > 0) return num((r as any)?.amount) * priceSnap;

  return num((r as any)?.amount) * usdPerSolClient();
}

function rowToTransaction(wallet: string, r: ActivityRow, idx: number): Transaction | null {
  // ⛔️ Skip "withdraw_prepare" completely (don't show, don't count)
  if (isWithdrawPrepareRow(r)) return null;

  const a = pickAction(r);
  if (!a) return null;

  const tsRaw = pickTimestamp(r) || new Date().toISOString();
  const ts = new Date(String(tsRaw));
  const id = `${ts.getTime()}-${idx}`;

  return {
    id,
    type: a as Transaction["type"],
    amount: amountToUsd(r),
    status: "completed",
    timestamp: ts,
    txHash: pickTxHash(r),
    address: wallet,
  };
}

// ====== Profile ======
const DEFAULT_PROFILE: UserProfile = {
  username: "Player",
  walletAddress: "7xKE...2pQs",
  pdaBalance: 0,
  joinedAt: "",
  lastActive: "",
  totalBets: 0,
  totalWins: 0,
  totalLosses: 0,
  winRate: 0,
  favoriteGame: null,
  level: 0,
  xp: 0,
  xpToNextLevel: 0,
  totalXp: 0,
};

let LAST_WALLET: string | null = null;
let LAST_TRANSACTIONS: Transaction[] = [];
let LAST_META = {
  totalWagered: 0.0,
  currentRank: "UNRANKED",
  levelIcon: "👑",
};

function loadTransactionsForWallet(wallet: string) {
  let txs: Transaction[] = [];

  // Prefer detailed activities (usually contain `details`)
  const actAdmin = syncGet<ActivityRow[]>(
    `${apiBase()}/admin/users/${encodeURIComponent(wallet)}/activities?limit=500`
  );
  if (actAdmin && Array.isArray(actAdmin) && actAdmin.length) {
    txs = actAdmin.map((r, i) => rowToTransaction(wallet, r, i)).filter(Boolean) as Transaction[];
  }

  if (!txs.length) {
    const actPublic = syncGet<ActivityRow[]>(
      `${apiBase()}/wallets/${encodeURIComponent(wallet)}/activities?limit=500`
    );
    if (actPublic && Array.isArray(actPublic) && actPublic.length) {
      txs = actPublic.map((r, i) => rowToTransaction(wallet, r, i)).filter(Boolean) as Transaction[];
    }
  }

  // Fallback: generic transactions list (may not include `details`; try to drop obvious prepares)
  if (!txs.length) {
    const list = syncGet<TransactionsList>(
      `${apiBase()}/admin/transactions?limit=500&type=all&search=${encodeURIComponent(wallet)}`
    );
    if (list?.transactions?.length) {
      txs = list.transactions
        .filter((t) => !String(t.type || "").toLowerCase().includes("withdraw_prepare"))
        .map((t, i) =>
          rowToTransaction(
            wallet,
            {
              type: t.type,
              amount: t.amount,
              currency: (t as any).currency,
              timestamp: t.timestamp,
              tx_hash: (t as any).tx_hash,
            } as any,
            i
          )
        )
        .filter(Boolean) as Transaction[];
    }
  }

  txs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  LAST_TRANSACTIONS = txs;
}

export function getMockProfile(walletAddress?: string): UserProfile {
  const out: UserProfile = {
    ...DEFAULT_PROFILE,
    walletAddress: walletAddress ? walletAddress : DEFAULT_PROFILE.walletAddress,
  };

  if (!walletAddress) return out;
  LAST_WALLET = walletAddress;

  const u = syncGet<AdminUserDetails>(`${apiBase()}/admin/users/${encodeURIComponent(walletAddress)}`);
  if (u) {
    out.username = u.username || shortWallet(walletAddress);
    out.walletAddress = walletAddress;
    out.pdaBalance = Number(u.pdaBalance || 0);
    out.joinedAt = toISODate(u.joinedAt) || out.joinedAt;
    out.lastActive = toISODate(u.lastActive) || out.lastActive;

    const totalBets = Number(u.totalBets || 0);
    const totalWins = Number(u.totalWins || 0);
    const totalLosses =
      typeof u.totalLosses === "number" ? u.totalLosses : Math.max(0, totalBets - totalWins);

    out.totalBets = totalBets;
    out.totalWins = totalWins;
    out.totalLosses = totalLosses;
    out.winRate = totalBets > 0 ? Number(((totalWins / totalBets) * 100).toFixed(1)) : Number(u.winRate || 0);
    out.favoriteGame = u.favoriteGame || null;
  } else {
    out.username = shortWallet(walletAddress);
  }

  // Authoritative progress snapshot
  const p = syncGet<RewardsProgress>(`${apiBase()}/rewards/users/${encodeURIComponent(walletAddress)}/progress`);
  if (p) {
    if (p.currentLevel) out.level = Number(p.currentLevel.level_number || 0);

    LAST_META.totalWagered = Number(p.currentWagered || 0);
    out.xp = LAST_META.totalWagered;
    out.totalXp = out.xp;

    const targetStr = p.nextLevel?.wagering;
    const target = parseMoneyLike(targetStr);
    out.xpToNextLevel = Math.max(0, target - out.xp);

    LAST_META.currentRank = p.currentRange?.name || "UNRANKED";
  } else {
    LAST_META.totalWagered = 0;
    LAST_META.currentRank = "UNRANKED";
    out.xp = 0;
    out.totalXp = 0;
    out.xpToNextLevel = 0;
  }

  loadTransactionsForWallet(walletAddress);
  return out;
}

// ====== Bonus (real state; name kept for compatibility) ======
export const MOCK_BONUS: BonusData = {
  type: "Welcome Bonus",
  amount: 0,
  wageredAmount: 0,
  requiredWager: 0,
  expiresAt: new Date(Date.now() + 1),
  isActive: false,
};

// ====== Real leaderboard (drop-in replacement; no fake rows) ======
type TopRow = {
  rank: number;
  wallet: string;
  username?: string | null;
  total_wagered_usd: number;
  current_level_number?: number | null;
  current_level_title?: string | null;
  current_range_name?: string | null;
  current_level_label?: string | null;
};

let LAST_LEADERBOARD: LeaderboardEntry[] = [];

function ensureLeaderboardLoaded(limit = 10) {
  if (LAST_LEADERBOARD.length) return;
  const rows = syncGet<TopRow[]>(`${apiBase()}/leaderboard/top?limit=${encodeURIComponent(String(limit))}`);
  if (rows && Array.isArray(rows) && rows.length) {
    LAST_LEADERBOARD = rows.map((r) => ({
      rank: r.rank,
      username: r.username ? shortWallet(r.username) : shortWallet(r.wallet),
      totalWagered: Number(r.total_wagered_usd || 0),
      currentLevel:
        r.current_level_label ||
        (r.current_range_name && r.current_level_title
          ? `${r.current_range_name} - ${r.current_level_title}`
          : "UNRANKED"),
    }));
  } else {
    LAST_LEADERBOARD = [];
  }
}

/** Keeps the old export name so the UI doesn't change; it’s real data now. */
export const MOCK_LEADERBOARD: LeaderboardEntry[] = new Proxy(([] as unknown) as LeaderboardEntry[], {
  get(_t, p: any) {
    ensureLeaderboardLoaded(10);
    const arr = LAST_LEADERBOARD;
    if (p === "length") return arr.length;
    if (p === Symbol.iterator) return (arr as any)[Symbol.iterator].bind(arr);
    const v: any = (arr as any)[p];
    return typeof v === "function" ? v.bind(arr) : v;
  },
}) as unknown as LeaderboardEntry[];

export function refreshLeaderboard(limit = 10) {
  LAST_LEADERBOARD = [];
  ensureLeaderboardLoaded(limit);
  return LAST_LEADERBOARD.slice();
}

export function getMockUserRank(pubkey?: string): LeaderboardEntry {
  const short = pubkey && pubkey.length > 8 ? `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}` : "Unknown";
  let base: LeaderboardEntry = {
    rank: 0,
    username: short,
    totalWagered: 0,
    currentLevel: "UNRANKED",
    isCurrentUser: true,
  };
  if (!pubkey || typeof window === "undefined") return base;

  const p = syncGet<RewardsProgress>(`${apiBase()}/rewards/users/${encodeURIComponent(pubkey)}/progress`);
  if (p) {
    const lvlName = p.currentLevel?.title || "Rookie";
    const rangeName = p.currentRange?.name || "UNRANKED";
    base.totalWagered = Number(p.currentWagered || 0);
    base.currentLevel = `${rangeName} - ${lvlName}`;
  }
  return base;
}

export const MOCK_TRANSACTIONS: Transaction[] = new Proxy(([] as unknown) as Transaction[], {
  get(_t, p: any) {
    const arr = LAST_TRANSACTIONS;
    if (p === "length") return arr.length;
    if (p === Symbol.iterator) return (arr as any)[Symbol.iterator].bind(arr);
    const v: any = (arr as any)[p];
    return typeof v === "function" ? v.bind(arr) : v;
  },
}) as unknown as Transaction[];

export const MOCK_PROFILE_META = new Proxy({} as any, {
  get(_t, p: any) {
    if (p === "totalWagered") return LAST_META.totalWagered;
    if (p === "currentRank") return LAST_META.currentRank;
    if (p === "levelIcon") return LAST_META.levelIcon;
    return undefined;
  },
}) as { totalWagered: number; currentRank: string; levelIcon: string };

// =============================================================================
// REAL Welcome Bonus integration
// =============================================================================
export type WelcomeState = {
  id?: string | number;
  user_wallet?: string;
  name?: string;
  bonus_amount_usd?: string | number;
  wr_required_units?: string | number;
  wr_progress_units?: string | number;
  coefficient?: string | number;
  expires_at?: string;
  expires_at_iso?: string;
  max_bet_usd?: string | number;
  status?: "active" | "cleared" | "expired" | "forfeited" | "none" | "eligible";
  fs_count?: number | string;
  fs_value_usd?: number | string;
  fs_max_win_usd?: number | string;
  usd_per_sol?: number;
  claimed?: boolean;
  claimable?: boolean;

  // NEW (pre-claim eligibility)
  eligible_bonus_usd?: number | string;
  claim_deadline_iso?: string;
};

export async function fetchWelcomeState(wallet: string): Promise<WelcomeState | null> {
  if (!wallet) return null;
  try {
    const r = await fetch(`${apiBase()}/promo/welcome/state?userWallet=${encodeURIComponent(wallet)}`, {
      credentials: "include",
    });
    if (!r.ok) return null;
    const j = (await r.json()) as WelcomeState;
    return j || null;
  } catch {
    return null;
  }
}

// Optional: explicitly notify backend of a deposit (recommended)
export async function creditWelcomeOnDeposit(params: {
  wallet: string;
  amountSol: number;
  txSig?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(`${apiBase()}/promo/welcome/credit-on-deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        userWallet: params.wallet,
        amountSol: params.amountSol,
        txSig: params.txSig || null,
      }),
    });
    const j = await r.json();
    if (!r.ok) return { ok: false, error: j?.error || "credit-on-deposit failed" };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "credit-on-deposit error" };
  }
}

export async function hasAnyDepositAsync(
  wallet: string
): Promise<{ has: boolean; latestAmountUsd?: number; txHash?: string }> {
  if (!wallet) return { has: false };

  async function tryGet(url: string) {
    try {
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) return null;
      return (await r.json()) as any[] | { transactions?: any[] } | null;
    } catch {
      return null;
    }
  }

  let rows = (await tryGet(`${apiBase()}/admin/users/${encodeURIComponent(wallet)}/activities?limit=500`)) as any[];
  if (!Array.isArray(rows) || !rows.length) {
    rows = (await tryGet(`${apiBase()}/wallets/${encodeURIComponent(wallet)}/activities?limit=500`)) as any[];
  }

  if (!Array.isArray(rows) || !rows.length) {
    const list = (await tryGet(
      `${apiBase()}/admin/transactions?limit=500&type=all&search=${encodeURIComponent(wallet)}`
    )) as { transactions?: any[] } | null;
    if (list?.transactions?.length) rows = list.transactions as any[];
  }

  if (!Array.isArray(rows) || !rows.length) return { has: false };

  const txs = rows.map((r, i) => rowToTransaction(wallet, r as ActivityRow, i)).filter(Boolean) as Transaction[];

  if (!txs.length) return { has: false };
  txs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const latestDeposit = txs.find((t) => t.type === "deposit");
  if (!latestDeposit) return { has: false };

  return {
    has: true,
    latestAmountUsd: Number(latestDeposit.amount || 0),
    txHash: latestDeposit.txHash,
  };
}

// One-shot claim (backend will transfer first, then mark claimed with txSig)
export async function claimWelcomeBonus(wallet: string): Promise<{
  ok: boolean;
  alreadyClaimed?: boolean;
  txSig?: string;
  bonusLamports?: number;
  bonusUsd?: number;
  toVault?: string;
  claimedAt?: string;
  error?: string;
}> {
  if (!wallet) return { ok: false, error: "wallet required" };
  try {
    const r = await fetch(`${apiBase()}/promo/welcome/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userWallet: wallet }),
    });
    const j = await r.json();
    if (!r.ok) return { ok: false, error: j?.error || "Claim failed" };
    // Backend now guarantees txSig when marked claimed.
    return { ok: true, ...j };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Claim error" };
  }
}

export async function getWelcomeBonusAmount(wallet: string): Promise<number> {
  const st = await fetchWelcomeState(wallet);
  const amt = st?.bonus_amount_usd;
  return amt !== undefined ? num(amt as any) : 0;
}

export async function refreshWelcomeBonusIntoMock(wallet: string): Promise<WelcomeState | null> {
  const st = await fetchWelcomeState(wallet);
  if (!st) {
    Object.assign(MOCK_BONUS, {
      type: "Welcome Bonus",
      amount: 0,
      wageredAmount: 0,
      requiredWager: 0,
      expiresAt: new Date(Date.now() + 1),
      isActive: false,
    } as BonusData);
    return null;
  }

  // If pre-claim eligible, reflect potential amount & keep inactive
  const displayAmt =
    st.status === "eligible"
      ? num(st.eligible_bonus_usd)
      : num(st.bonus_amount_usd);

  const displayExpiry =
    st.status === "eligible" && st.claim_deadline_iso
      ? new Date(st.claim_deadline_iso)
      : new Date(st.expires_at || Date.now());

  Object.assign(MOCK_BONUS, {
    type: "Welcome Bonus",
    amount: displayAmt,
    wageredAmount: num(st.wr_progress_units),
    requiredWager: num(st.wr_required_units),
    expiresAt: displayExpiry,
    isActive: st.status === "active",
  } as BonusData);

  return st;
}

/* ========================================================================== */
/* ======================= REAL RANK / CHANGE / PLAYERS ===================== */
/* ========================================================================== */

export type RankSummary = {
  bestRank: number | null;
  change: number | null;
  playersCount: number | null;
  currentLevelLabel?: string | null;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchRankSummary(wallet: string): Promise<RankSummary | null> {
  if (!wallet) return null;

  let bestRank: number | null = null;
  let change: number | null = null;
  let playersCount: number | null = null;
  let currentLevelLabel: string | null = null;

  const me = await fetchJson<any>(`${apiBase()}/leaderboard/me?wallet=${encodeURIComponent(wallet)}`);
  if (me) {
    if (typeof me.bestRank === "number") bestRank = me.bestRank;
    if (typeof me.change === "number") change = me.change;
    if (typeof me.players === "number") playersCount = me.players;
    if (typeof me.current_level_label === "string") currentLevelLabel = me.current_level_label;
  }

  if (bestRank == null) {
    const top = await fetchJson<any[]>(`${apiBase()}/leaderboard/top?limit=100`);
    if (Array.isArray(top) && top.length) {
      const idx = top.findIndex((r) => r?.wallet === wallet);
      if (idx >= 0) {
        bestRank = top[idx].rank ?? idx + 1;
        currentLevelLabel =
          top[idx].current_level_label ||
          (top[idx].current_range_name && top[idx].current_level_title
            ? `${top[idx].current_range_name} - ${top[idx].current_level_title}`
            : currentLevelLabel);
      }
      playersCount = top.length;
    }
  }

  if (playersCount == null) {
    const pc1 = await fetchJson<{ count: number }>(`${apiBase()}/stats/players-count`);
    if (pc1 && typeof pc1.count === "number") playersCount = pc1.count;
  }

  if (change == null && bestRank != null && typeof window !== "undefined") {
    const key = `rank:last:${wallet}`;
    const prevStr = window.localStorage.getItem(key);
    const prev = prevStr ? Number(prevStr) : NaN;
    if (Number.isFinite(prev)) change = prev - bestRank; // positive = improved
    window.localStorage.setItem(key, String(bestRank));
  }

  return {
    bestRank,
    change,
    playersCount,
    currentLevelLabel,
  };
}
