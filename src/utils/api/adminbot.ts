/* eslint-disable no-console */
import { io, Socket } from "socket.io-client";

/** ========== UI Types ========== */
export interface BotStatsData {
  activeUsers: number;
  totalBets: number;
  dailyVolume: number; // SOL since page load (fallback) or server daily
  winRate: number; // percentage 0..100
}

export interface BotConfig {
  userPoolSize: number;
  minBetSize: number;
  maxBetSize: number;
  winRate: number;
  activityInterval: { min: number; max: number }; // seconds
  quietModeChance: number;
  bigWinFrequency: number;
  bigWinRange: { min: number; max: number };
  gameDistribution: {
    slots: number;
    crash: number;
    mines: number;
    dice: number;
    plinko: number;
    coinflip: number;
  };
  multiplierPool: number[];
}

export interface BotActivity {
  id: string;
  username: string;
  game: string; // e.g. "slots", "crash", ...
  action: "bet" | "win" | "lose";
  amount: number;
  multiplier?: number;
  timestamp: string; // UI-friendly string
  result: number; // +payout or -stake or 0
  /** raw epoch ms from server so “time ago” survives refresh */
  ts?: number;
}

/** ========== Defaults ========== */
export const defaultConfig: BotConfig = {
  userPoolSize: 150,
  minBetSize: 0.05,
  maxBetSize: 1.5,
  winRate: 45,
  activityInterval: { min: 2, max: 7 },
  quietModeChance: 15,
  bigWinFrequency: 30,
  bigWinRange: { min: 10, max: 100 },
  gameDistribution: {
    slots: 25,
    crash: 20,
    mines: 15,
    dice: 15,
    plinko: 15,
    coinflip: 10,
  },
  multiplierPool: [1.2, 1.5, 2, 2.5, 5, 10, 20, 50, 100],
};

export const mockStats: BotStatsData = {
  activeUsers: 87,
  totalBets: 1247,
  dailyVolume: 2856,
  winRate: 45,
};

/** ========== Runtime config ========== */
const HTTP_URL = 
  process.env.NEXT_PUBLIC_BACKEND_HTTP ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "";

// Ensure HTTP_URL is always absolute (not relative)
const getHttpUrl = (): string => {
  const url = HTTP_URL.trim();
  if (!url) {
    const errorMsg = 
      "[adminbot] ERROR: Backend URL not configured! " +
      "Set NEXT_PUBLIC_BACKEND_URL or NEXT_PUBLIC_BACKEND_HTTP in your environment variables. " +
      "Current env values: " +
      `NEXT_PUBLIC_BACKEND_HTTP=${process.env.NEXT_PUBLIC_BACKEND_HTTP || "undefined"}, ` +
      `NEXT_PUBLIC_BACKEND_URL=${process.env.NEXT_PUBLIC_BACKEND_URL || "undefined"}, ` +
      `NEXT_PUBLIC_API_URL=${process.env.NEXT_PUBLIC_API_URL || "undefined"}`;
    console.error(errorMsg);
    // In production, throw error to prevent silent failures
    if (typeof window !== "undefined") {
      console.error("All API requests will fail until backend URL is configured!");
    }
    return "";
  }
  // If URL doesn't start with http:// or https://, it's invalid
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    console.error(
      `[adminbot] ERROR: Invalid backend URL format: "${url}". ` +
      "URL must start with http:// or https://"
    );
    return "";
  }
  return url.replace(/\/+$/, ""); // Remove trailing slashes
};

const getWsUrl = (): string => {
  // Socket.IO works with HTTP/HTTPS URLs - it handles WebSocket upgrade internally
  // Check for explicit WebSocket URL first
  if (process.env.NEXT_PUBLIC_BACKEND_WS) {
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS.trim();
    // If it's already ws:// or wss://, use it as-is
    if (wsUrl.startsWith("ws://") || wsUrl.startsWith("wss://")) {
      return wsUrl.replace(/\/+$/, "");
    }
    // If it's http:// or https://, use it as-is (Socket.IO will handle it)
    if (wsUrl.startsWith("http://") || wsUrl.startsWith("https://")) {
      return wsUrl.replace(/\/+$/, "");
    }
  }
  
  // Fallback: use HTTP URL directly (Socket.IO works with HTTP URLs)
  const httpUrl = getHttpUrl();
  if (!httpUrl) {
    console.error(
      "[adminbot] ERROR: WebSocket URL not configured! " +
      "Set NEXT_PUBLIC_BACKEND_WS or NEXT_PUBLIC_BACKEND_URL environment variable."
    );
    return "";
  }
  
  // Use HTTP URL directly - Socket.IO will handle WebSocket upgrade
  return httpUrl;
};

const WS_URL = getWsUrl();

// Optional envs to fine-tune connections
const ENABLE_FAKE_FEED = process.env.NEXT_PUBLIC_ENABLE_FAKE_FEED !== "0"; // default on
const ENABLE_REAL_WINS = process.env.NEXT_PUBLIC_ENABLE_REAL_WINS !== "0"; // default on

// Error throttling to avoid log spam
const errorCounts = new Map<string, number>();
const MAX_ERROR_LOGS = 3; // Log first 3 errors, then suppress

// === Jackpot rule (hard-coded as requested) ===
const JACKPOT_MIN_MULT = 10;

/** ========== Server config ========== */
type ServerConfig = {
  enabled: boolean;
  minMs: number;
  maxMs: number;
  winRate: number; // 0..1
  minSol: number;
  maxSol: number;
  players: string[];
  games: string[]; // ["memeslot","crash",...], possibly repeated for weighting
  multipliers: number[];
};

/** Helpers for config transforms */
const weightedGamesFromDistribution = (dist: BotConfig["gameDistribution"]) => {
  const total =
    dist.slots + dist.crash + dist.mines + dist.dice + dist.plinko + dist.coinflip || 100;
  const toCount = (n: number) => Math.max(1, Math.round((n / total) * 100));
  const pairs: Array<[string, number]> = [
    ["memeslot", toCount(dist.slots)], // slots -> memeslot
    ["crash", toCount(dist.crash)],
    ["mines", toCount(dist.mines)],
    ["dice", toCount(dist.dice)],
    ["plinko", toCount(dist.plinko)],
    ["coinflip", toCount(dist.coinflip)],
  ];
  const arr: string[] = [];
  for (const [name, count] of pairs) for (let i = 0; i < count; i++) arr.push(name);
  return arr;
};

const generateUsernames = (n: number) =>
  Array.from({ length: n }, (_, i) => `bot_user_${String(i + 1).padStart(3, "0")}`);

const ms = (sec: number) => Math.max(0, Math.round(sec * 1000));
const secs = (millis: number) => Math.max(0, Math.round(millis / 1000));

const serverToClientConfig = (s: ServerConfig): BotConfig => {
  const count = (key: string) => s.games.filter((g) => g === key).length || 0;
  const total = s.games.length || 1;
  const pct = (n: number) => Math.round((n / total) * 100);
  return {
    userPoolSize: s.players.length || defaultConfig.userPoolSize,
    minBetSize: s.minSol ?? defaultConfig.minBetSize,
    maxBetSize: s.maxSol ?? defaultConfig.maxBetSize,
    winRate: Math.round((s.winRate ?? 0.45) * 100),
    activityInterval: {
      min: secs(s.minMs ?? ms(defaultConfig.activityInterval.min)),
      max: secs(s.maxMs ?? ms(defaultConfig.activityInterval.max)),
    },
    quietModeChance: defaultConfig.quietModeChance,
    bigWinFrequency: defaultConfig.bigWinFrequency,
    bigWinRange: defaultConfig.bigWinRange,
    gameDistribution: {
      slots: pct(count("memeslot")) || defaultConfig.gameDistribution.slots,
      crash: pct(count("crash")) || defaultConfig.gameDistribution.crash,
      mines: pct(count("mines")) || defaultConfig.gameDistribution.mines,
      dice: pct(count("dice")) || defaultConfig.gameDistribution.dice,
      plinko: pct(count("plinko")) || defaultConfig.gameDistribution.plinko,
      coinflip: pct(count("coinflip")) || defaultConfig.gameDistribution.coinflip,
    },
    multiplierPool: s.multipliers?.length ? s.multipliers : defaultConfig.multiplierPool,
  };
};

const clientToServerConfig = (c: BotConfig, existing?: ServerConfig): Partial<ServerConfig> => {
  const current = existing ?? {
    enabled: true,
    minMs: 2000,
    maxMs: 7000,
    winRate: 0.45,
    minSol: 0.05,
    maxSol: 1.5,
    players: generateUsernames(c.userPoolSize),
    games: weightedGamesFromDistribution(c.gameDistribution),
    multipliers: c.multiplierPool?.length ? c.multiplierPool : defaultConfig.multiplierPool,
  };
  const next: Partial<ServerConfig> = {
    minMs: ms(c.activityInterval.min),
    maxMs: ms(c.activityInterval.max),
    winRate: Math.max(0, Math.min(1, c.winRate / 100)),
    minSol: c.minBetSize,
    maxSol: c.maxBetSize,
    multipliers: c.multiplierPool?.length ? c.multiplierPool : current.multipliers,
  };
  if (c.userPoolSize !== current.players.length) {
    next.players = generateUsernames(c.userPoolSize);
  }
  next.games = weightedGamesFromDistribution(c.gameDistribution);
  return next;
};

/** ========== HTTP helpers ========== */
async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Use Next.js API proxy to avoid CORS issues
  // The proxy route is at /api/admin/bot/[...path]
  const useProxy = typeof window !== "undefined"; // Only use proxy in browser
  
  let fullUrl: string;
  
  if (useProxy) {
    // Remove /admin/bot prefix since proxy route already includes it
    const apiPath = path.replace(/^\/admin\/bot\//, "");
    fullUrl = `/api/admin/bot/${apiPath}`;
  } else {
    // Server-side: use direct backend URL
    const baseUrl = getHttpUrl();
    if (!baseUrl) {
      throw new Error(
        "Backend URL not configured. Set NEXT_PUBLIC_BACKEND_URL environment variable."
      );
    }
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    fullUrl = `${baseUrl}${normalizedPath}`;
  }
  
  const res = await fetch(fullUrl, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${path}: ${text}`);
  }
  return res.json();
}

/** ========== Public Admin API (HTTP) ========== */
export async function fetchBotConfig(): Promise<{ enabled: boolean; config: BotConfig }> {
  const s = await jsonFetch<ServerConfig>("/admin/bot/config");
  return { enabled: s.enabled, config: serverToClientConfig(s) };
}

export async function updateBotConfig(
  nextConfig: Partial<BotConfig>
): Promise<{ enabled: boolean; config: BotConfig }> {
  const currentServer = await jsonFetch<ServerConfig>("/admin/bot/config").catch(() => null);
  const mergedClient: BotConfig = {
    ...defaultConfig,
    ...(currentServer ? serverToClientConfig(currentServer) : {}),
    ...nextConfig,
  };
  const payload = clientToServerConfig(mergedClient, currentServer ?? undefined);
  await jsonFetch<{}>("/admin/bot/config", { method: "POST", body: JSON.stringify(payload) });
  const s = await jsonFetch<ServerConfig>("/admin/bot/config");
  return { enabled: s.enabled, config: serverToClientConfig(s) };
}

export async function setBotEnabled(enabled: boolean): Promise<void> {
  await jsonFetch<{}>("/admin/bot/enable", { method: "POST", body: JSON.stringify({ enabled }) });
}

export async function fetchBotStats(): Promise<BotStatsData> {
  try {
    return await jsonFetch<BotStatsData>("/admin/bot/stats");
  } catch {
    return getLiveStats(); // fallback to client aggregate
  }
}

/** Force Big Win (immediate broadcast) */
export async function forceBigWin(opts?: {
  user?: string;
  game?: string; // "memeslot" | "slots" | "crash" | "dice" | "plinko" | "mines" | "coinflip"
  amountSol?: number;
  multiplier?: number;
}): Promise<void> {
  const payload =
    opts && opts.game
      ? { ...opts, game: opts.game === "slots" ? "memeslot" : opts.game }
      : opts || {};
  await jsonFetch<{}>("/admin/bot/bigwin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** ========== Realtime feed ========== */
let fakeSocket: Socket | null = null; // /fake-feed (bot simulator)
let winsRoot: Socket | null = null; // root namespace (wins:push/wins:recent)
let winsNs: Socket | null = null; // /wins namespace (if server mounts there)
let socketConnected = false;

function recomputeConnected() {
  socketConnected = !!(
    (fakeSocket && fakeSocket.connected) ||
    (winsRoot && winsRoot.connected) ||
    (winsNs && winsNs.connected)
  );
}

// general (all wins/losses split into bet + win/lose BotActivity)
const activityListeners = new Set<(a: BotActivity) => void>();
const MAX_RECENT = 200;
const recent: BotActivity[] = [];
const seenIds = new Set<string>();

// big wins only
const bigWinListeners = new Set<(a: BotActivity) => void>();
const recentBig: BotActivity[] = [];
const seenBigIds = new Set<string>();

// jackpot wins only
const jackpotListeners = new Set<(a: BotActivity) => void>();
const recentJackpot: BotActivity[] = [];
const seenJackIds = new Set<string>();

// aggregates for fallback stats
const seenUsers = new Map<string, number>();
let totalBets = 0;
let totalWins = 0;
let totalLosses = 0;
let totalStaked = 0;

let hydratedOnce = false;

/** ======== Multiplier helpers & jackpot rule ======== */
function toNumber(n: any): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

/** Safely extract timestamp from multiple possible fields */
function getTs(ev: any): number {
  const raw = ev?.ts ?? ev?.ts_ms ?? ev?.timestamp ?? ev?.created_at;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

/** Safely extract username from multiple possible fields */
function getUsername(ev: any, fallback = "bot_user"): string {
  const u =
    ev?.user ??
    ev?.username ??
    ev?.user_name ??
    ev?.wallet ??
    ev?.player ??
    ev?.user_wallet;
  return String(u || fallback);
}

/** Map server game key to UI key */
function mapGameName(g: any): string {
  const s = String(g || "").toLowerCase();
  if (s === "memeslot") return "slots"; // bot feed uses "memeslot"
  return s || "dice";
}

/** Safely extract game key from multiple possible fields */
function getGame(ev: any): string {
  const g = ev?.game ?? ev?.game_key ?? ev?.gameName;
  return mapGameName(g);
}

/** Safely extract stake/amount from multiple possible fields */
function getAmount(ev: any): number {
  return Number(
    ev?.amountSol ??
      ev?.amount ??
      ev?.amount_sol ??
      ev?.stakeSol ??
      ev?.stake_sol ??
      0
  );
}

/** Safely extract payout from multiple possible fields */
function getPayout(ev: any): number {
  return Number(
    ev?.payoutSol ??
      ev?.payout ??
      ev?.payout_sol ??
      ev?.winSol ??
      ev?.win_sol ??
      0
  );
}

function computeMultiplier(ev: any): number {
  const m = toNumber(ev?.multiplier);
  if (m > 0) return m;
  const amount = getAmount(ev);
  const payout = getPayout(ev);
  if (amount > 0 && payout > 0) return payout / amount;
  return 0;
}
function qualifiesJackpot(evOrMult: any): boolean {
  const m = typeof evOrMult === "number" ? evOrMult : computeMultiplier(evOrMult);
  return m >= JACKPOT_MIN_MULT;
}

/** ========== Helpers to push into buffers ========== */
function pushActivity(a: BotActivity) {
  if (seenIds.has(a.id)) return;
  seenIds.add(a.id);

  recent.push(a);
  if (recent.length > MAX_RECENT) recent.shift();

  const now = a.ts ?? Date.now();
  seenUsers.set(a.username, now);

  if (a.action === "bet") {
    totalBets += 1;
    totalStaked += a.amount || 0;
  } else if (a.action === "win") {
    totalWins += 1;
  } else if (a.action === "lose") {
    totalLosses += 1;
  }

  for (const cb of activityListeners) {
    try {
      cb(a);
    } catch (e) {
      console.warn("AdminBot listener error:", e);
    }
  }
}

function pushBigWin(a: BotActivity) {
  if (seenBigIds.has(a.id)) return;
  seenBigIds.add(a.id);

  recentBig.push(a);
  if (recentBig.length > MAX_RECENT) recentBig.shift();

  for (const cb of bigWinListeners) {
    try {
      cb(a);
    } catch (e) {
      console.warn("AdminBot bigwin listener error:", e);
    }
  }
}

function pushJackpot(a: BotActivity) {
  if (seenJackIds.has(a.id)) return;
  seenJackIds.add(a.id);

  recentJackpot.push(a);
  if (recentJackpot.length > MAX_RECENT) recentJackpot.shift();

  for (const cb of jackpotListeners) {
    try {
      cb(a);
    } catch (e) {
      console.warn("AdminBot jackpot listener error:", e);
    }
  }
}

/** Convert one real wins event (from ws_wins.js) into our UI activities */
function handleRealWinsEvent(ev: any) {
  try {
    const ts = getTs(ev);
    const username = getUsername(ev, "Unknown");
    const gameUi = getGame(ev);
    const amount = getAmount(ev);
    const payout = getPayout(ev);
    const mult = computeMultiplier(ev);

    // treat any payout > 0 as a win (even if < bet);
    // fallback to result string only if payout is 0.
    const resultStr = String(ev?.result || "").toLowerCase();
    const isWin = payout > 0 || resultStr === "win";

    // synthetic "bet"
    pushActivity({
      id: `${ts}-${username}-bet-${gameUi}`,
      username,
      game: gameUi,
      action: "bet",
      amount,
      ts,
      timestamp: new Date(ts).toLocaleTimeString(),
      result: 0,
    });

    // synthetic "win/lose"
    pushActivity({
      id: `${ts}-${username}-${isWin ? "win" : "lose"}-${gameUi}`,
      username,
      game: gameUi,
      action: isWin ? "win" : "lose",
      amount,
      multiplier: mult,
      ts,
      timestamp: new Date(ts).toLocaleTimeString(),
      // For wins we store payout as result; for losses we store -stake.
      result: isWin ? payout : -amount,
    });

    // optional bigwin/jackpot flags from server, but enforce 10x for jackpot
    if (ev?.bigwin) {
      pushBigWin({
        id: `${ts}-${username}-bigwin-${gameUi}`,
        username,
        game: gameUi,
        action: "win",
        amount,
        multiplier: mult || 1,
        ts,
        timestamp: new Date(ts).toLocaleTimeString(),
        result: payout || amount * (mult || 1),
      });
    }
    if (ev?.jackpot && qualifiesJackpot(mult)) {
      pushJackpot({
        id: `${ts}-${username}-jackpot-${gameUi}`,
        username,
        game: gameUi,
        action: "win",
        amount,
        multiplier: mult || 1,
        ts,
        timestamp: new Date(ts).toLocaleTimeString(),
        result: payout || amount * (mult || 1),
      });
    }
    // Also tag jackpot locally if ≥ 10x even when server didn't mark it
    if (isWin && qualifiesJackpot(mult)) {
      pushJackpot({
        id: `${ts}-${username}-jackpot-${gameUi}`,
        username,
        game: gameUi,
        action: "win",
        amount,
        multiplier: mult || 1,
        ts,
        timestamp: new Date(ts).toLocaleTimeString(),
        result: payout || amount * (mult || 1),
      });
    }
  } catch (e) {
    console.warn("handleRealWinsEvent failed:", e);
  }
}

/** Wire handlers for a /fake-feed bot simulator socket */
function wireFakeFeed(sock: Socket) {
  sock.on("connect", () => {
    // Reset error count on successful connection
    errorCounts.delete("fake-feed");
    recomputeConnected();
  });
  sock.on("disconnect", () => recomputeConnected());
  sock.on("connect_error", (err) => {
    const errMsg = err?.message || String(err);
    const errType = err?.type || "";
    const errorKey = "fake-feed";
    const count = (errorCounts.get(errorKey) || 0) + 1;
    errorCounts.set(errorKey, count);
    
    // Only log first few errors to avoid spam
    if (count <= MAX_ERROR_LOGS) {
      // Check for CORS-related errors
      if (errMsg.includes("CORS") || errMsg.includes("xhr poll error") || errMsg.includes("polling")) {
        console.error(
          `[fake-feed] Connection failed due to CORS. ` +
          `The backend at ${WS_URL} needs to allow CORS for Socket.IO endpoints. ` +
          `Error: ${errMsg}`
        );
      } else if (errMsg.includes("websocket") || errType === "TransportError") {
        console.error(
          `[fake-feed] WebSocket connection failed to ${WS_URL}/fake-feed. ` +
          `Possible causes: ` +
          `1) Backend Socket.IO server not running or not accessible, ` +
          `2) Firewall blocking WebSocket connections, ` +
          `3) Backend not configured for Socket.IO. ` +
          `Error: ${errMsg} (type: ${errType})`
        );
      } else {
        console.error(`[fake-feed] connect_error:`, errMsg, err);
      }
      
      if (count === MAX_ERROR_LOGS) {
        console.warn(
          `[fake-feed] Suppressing further connection errors. ` +
          `Socket.IO will continue attempting to reconnect in the background. ` +
          `Fix the backend connectivity issue to resolve.`
        );
      }
    }
  });

  // ALL activity (we synthesize bet + win/lose BotActivity)
  sock.on("activity", (ev: any) => {
    const ts = getTs(ev);
    const gameUi = getGame(ev);
    const username = getUsername(ev, "bot_user");
    const amount = getAmount(ev);
    const payout = getPayout(ev);
    const mult = computeMultiplier(ev);

    // treat any payout > 0 as win, else fall back to result string
    const resultStr = String(ev?.result || "").toLowerCase();
    const isWin = payout > 0 || resultStr === "win";

    pushActivity({
      id: `${ts}-${username}-bet-${gameUi}`,
      username,
      game: gameUi,
      action: "bet",
      amount,
      ts,
      timestamp: new Date(ts).toLocaleTimeString(),
      result: 0,
    });

    pushActivity({
      id: `${ts}-${username}-${isWin ? "win" : "lose"}-${gameUi}`,
      username,
      game: gameUi,
      action: isWin ? "win" : "lose",
      amount,
      multiplier: mult,
      ts,
      timestamp: new Date(ts).toLocaleTimeString(),
      result: isWin ? payout : -amount,
    });

    // Client-side jackpot tagging (≥ 10x)
    if (isWin && qualifiesJackpot(mult)) {
      pushJackpot({
        id: `${ts}-${username}-jackpot-${gameUi}`,
        username,
        game: gameUi,
        action: "win",
        amount,
        multiplier: mult || 1,
        ts,
        timestamp: new Date(ts).toLocaleTimeString(),
        result: payout || amount * (mult || 1),
      });
    }
  });

  // BIG WIN (wins only) — also tag jackpot if ≥ 10x
  sock.on("bigwin", (ev: any) => {
    const ts = getTs(ev);
    const gameUi = getGame(ev);
    const username = getUsername(ev, "bot_user");
    const amount = getAmount(ev);
    const mult = computeMultiplier(ev);
    const payout = getPayout(ev) || amount * mult;

    pushBigWin({
      id: `${ts}-${username}-bigwin-${gameUi}`,
      username,
      game: gameUi,
      action: "win",
      amount,
      multiplier: mult,
      ts,
      timestamp: new Date(ts).toLocaleTimeString(),
      result: payout,
    });

    if (qualifiesJackpot(mult)) {
      pushJackpot({
        id: `${ts}-${username}-jackpot-${gameUi}`,
        username,
        game: gameUi,
        action: "win",
        amount,
        multiplier: mult,
        ts,
        timestamp: new Date(ts).toLocaleTimeString(),
        result: payout,
      });
    }
  });

  // JACKPOT (wins only) — enforce ≥ 10x
  sock.on("jackpot", (ev: any) => {
    const ts = getTs(ev);
    const gameUi = getGame(ev);
    const username = getUsername(ev, "bot_user");
    const amount = getAmount(ev);
    const mult = computeMultiplier(ev);
    const payout = getPayout(ev) || amount * mult;

    if (!qualifiesJackpot(mult)) return; // filter out < 10x

    pushJackpot({
      id: `${ts}-${username}-jackpot-${gameUi}`,
      username,
      game: gameUi,
      action: "win",
      amount,
      multiplier: mult,
      ts,
      timestamp: new Date(ts).toLocaleTimeString(),
      result: payout,
    });
  });

  // Snapshot includes recent (all) + recentBig + recentJackpot
  sock.on("snapshot", (data: any) => {
    // 'recent' (all)
    if (data && Array.isArray(data.recent)) {
      const events = data.recent.slice().reverse();
      for (const ev of events) {
        const ts = getTs(ev);
        const gameUi = getGame(ev);
        const username = getUsername(ev, "bot_user");
        const amount = getAmount(ev);
        const payout = getPayout(ev);
        const mult = computeMultiplier(ev);

        const resultStr = String(ev?.result || "").toLowerCase();
        const isWin = payout > 0 || resultStr === "win";

        pushActivity({
          id: `${ts}-${username}-bet-${gameUi}`,
          username,
          game: gameUi,
          action: "bet",
          amount,
          ts,
          timestamp: new Date(ts).toLocaleTimeString(),
          result: 0,
        });

        pushActivity({
          id: `${ts}-${username}-${isWin ? "win" : "lose"}-${gameUi}`,
          username,
          game: gameUi,
          action: isWin ? "win" : "lose",
          amount,
          multiplier: mult,
          ts,
          timestamp: new Date(ts).toLocaleTimeString(),
          result: isWin ? payout : -amount,
        });

        if (isWin && qualifiesJackpot(mult)) {
          pushJackpot({
            id: `${ts}-${username}-jackpot-${gameUi}`,
            username,
            game: gameUi,
            action: "win",
            amount,
            multiplier: mult || 1,
            ts,
            timestamp: new Date(ts).toLocaleTimeString(),
            result: payout || amount * (mult || 1),
          });
        }
      }
    }

    // 'recentBig'
    if (data && Array.isArray(data.recentBig)) {
      const events = data.recentBig.slice().reverse();
      for (const ev of events) {
        const ts = getTs(ev);
        const gameUi = getGame(ev);
        const username = getUsername(ev, "bot_user");
        const amount = getAmount(ev);
        const mult = computeMultiplier(ev);
        const payout = getPayout(ev) || amount * mult;

        pushBigWin({
          id: `${ts}-${username}-bigwin-${gameUi}`,
          username,
          game: gameUi,
          action: "win",
          amount,
          multiplier: mult,
          ts,
          timestamp: new Date(ts).toLocaleTimeString(),
          result: payout,
        });
        if (qualifiesJackpot(mult)) {
          pushJackpot({
            id: `${ts}-${username}-jackpot-${gameUi}`,
            username,
            game: gameUi,
            action: "win",
            amount,
            multiplier: mult,
            ts,
            timestamp: new Date(ts).toLocaleTimeString(),
            result: payout,
          });
        }
      }
    }

    // 'recentJackpot' (server-provided) — enforce ≥ 10x
    if (data && Array.isArray(data.recentJackpot)) {
      const events = data.recentJackpot.slice().reverse();
      for (const ev of events) {
        const ts = getTs(ev);
        const gameUi = getGame(ev);
        const username = getUsername(ev, "bot_user");
        const amount = getAmount(ev);
        const mult = computeMultiplier(ev);
        const payout = getPayout(ev) || amount * mult;
        if (!qualifiesJackpot(mult)) continue;
        pushJackpot({
          id: `${ts}-${username}-jackpot-${gameUi}`,
          username,
          game: gameUi,
          action: "win",
          amount,
          multiplier: mult,
          ts,
          timestamp: new Date(ts).toLocaleTimeString(),
          result: payout,
        });
      }
    }
  });
}

/** Wire handlers for a wins feed socket (real players) */
function wireRealWins(sock: Socket, label: string) {
  sock.on("connect", () => {
    // Reset error count on successful connection
    errorCounts.delete(`wins-${label}`);
    recomputeConnected();
    // ask server for a snapshot if it auto-emits on connect, you'll receive wins:recent
  });
  sock.on("disconnect", () => recomputeConnected());
  sock.on("connect_error", (err) => {
    const errMsg = err?.message || String(err);
    const errType = err?.type || "";
    const errorKey = `wins-${label}`;
    const count = (errorCounts.get(errorKey) || 0) + 1;
    errorCounts.set(errorKey, count);
    
    // Only log first few errors to avoid spam
    if (count <= MAX_ERROR_LOGS) {
      // Check for CORS-related errors
      if (errMsg.includes("CORS") || errMsg.includes("xhr poll error") || errMsg.includes("polling")) {
        console.error(
          `[wins ${label}] Connection failed due to CORS. ` +
          `The backend at ${WS_URL} needs to allow CORS for Socket.IO endpoints. ` +
          `Error: ${errMsg}`
        );
      } else if (errMsg.includes("websocket") || errType === "TransportError") {
        const endpoint = label === "root" ? WS_URL : `${WS_URL}/wins`;
        console.error(
          `[wins ${label}] WebSocket connection failed to ${endpoint}. ` +
          `Possible causes: ` +
          `1) Backend Socket.IO server not running or not accessible, ` +
          `2) Firewall blocking WebSocket connections, ` +
          `3) Backend not configured for Socket.IO. ` +
          `Error: ${errMsg} (type: ${errType})`
        );
      } else {
        console.error(`[wins ${label}] connect_error:`, errMsg, err);
      }
      
      if (count === MAX_ERROR_LOGS) {
        console.warn(
          `[wins ${label}] Suppressing further connection errors. ` +
          `Socket.IO will continue attempting to reconnect in the background. ` +
          `Fix the backend connectivity issue to resolve.`
        );
      }
    }
  });

  // snapshot of recent wins (array)
  sock.on("wins:recent", (arr: any[]) => {
    if (Array.isArray(arr)) {
      const events = arr.slice().reverse();
      for (const ev of events) handleRealWinsEvent(ev);
    } else if (arr) {
      handleRealWinsEvent(arr);
    }
  });

  // live push, one event at a time
  sock.on("wins:push", (ev: any) => {
    handleRealWinsEvent(ev);
  });
}

/** Ensure all sockets are connected (idempotent) */
function ensureSocket() {
  if (typeof window === "undefined") return;
  
  if (!WS_URL) {
    console.warn("[adminbot] WebSocket URL not configured, skipping socket connections");
    return;
  }
  
  if (!fakeSocket && ENABLE_FAKE_FEED) {
    try {
      // Use HTTP URL - Socket.IO will handle WebSocket upgrade
      // Prefer WebSocket first to avoid CORS issues with polling
      fakeSocket = io(`${WS_URL}/fake-feed`, { 
        transports: ["websocket", "polling"], // Try WebSocket first (no CORS), then polling as fallback
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 10000,
        forceNew: false,
      });
      wireFakeFeed(fakeSocket);
    } catch (err) {
      console.error("[adminbot] Failed to create fake-feed socket:", err);
    }
  }
  if (ENABLE_REAL_WINS) {
    if (!winsRoot) {
      try {
        // Use HTTP URL - Socket.IO will handle WebSocket upgrade
        // Prefer WebSocket first to avoid CORS issues with polling
        winsRoot = io(`${WS_URL}`, { 
          transports: ["websocket", "polling"], // Try WebSocket first (no CORS), then polling as fallback
          withCredentials: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 10000,
          forceNew: false,
        });
        wireRealWins(winsRoot, "root");
      } catch (err) {
        console.error("[adminbot] Failed to create wins root socket:", err);
      }
    }
    if (!winsNs) {
      try {
        // Some servers mount the feed under /wins – listen to both to be safe.
        // Use HTTP URL - Socket.IO will handle WebSocket upgrade
        // Prefer WebSocket first to avoid CORS issues with polling
        winsNs = io(`${WS_URL}/wins`, { 
          transports: ["websocket", "polling"], // Try WebSocket first (no CORS), then polling as fallback
          withCredentials: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 10000,
          forceNew: false,
        });
        wireRealWins(winsNs, "/wins");
      } catch (err) {
        console.error("[adminbot] Failed to create wins namespace socket:", err);
      }
    }
  }
  recomputeConnected();
}

/** Public subscribe (all activity, includes wins & losses) */
export function subscribeBotActivities(onActivity: (a: BotActivity) => void): () => void {
  if (typeof window !== "undefined") ensureSocket();
  activityListeners.add(onActivity);
  return () => activityListeners.delete(onActivity);
}

/** Public subscribe (big wins only) */
export function subscribeBigWins(onWin: (a: BotActivity) => void): () => void {
  if (typeof window !== "undefined") ensureSocket();
  bigWinListeners.add(onWin);
  return () => bigWinListeners.delete(onWin);
}

/** Public subscribe (jackpot wins only) */
export function subscribeJackpotWins(onWin: (a: BotActivity) => void): () => void {
  if (typeof window !== "undefined") ensureSocket();
  jackpotListeners.add(onWin);
  return () => jackpotListeners.delete(onWin);
}

/** Local recents (newest-first) */
export function getRecentActivities(limit = 50): BotActivity[] {
  return recent.slice(-limit).reverse();
}
export function getRecentBigWins(limit = 50): BotActivity[] {
  return recentBig.slice(-limit).reverse();
}
export function getRecentJackpotWins(limit = 50): BotActivity[] {
  return recentJackpot.slice(-limit).reverse();
}

/** HTTP hydration (fills in-memory buffers) — leaves real feed to WS */
export async function hydrateRecentFromServer(limit = MAX_RECENT): Promise<BotActivity[]> {
  try {
    if (hydratedOnce && recent.length) return getRecentActivities(limit);

    const raw = await jsonFetch<any[]>(`/admin/bot/recent?limit=${encodeURIComponent(limit)}`);
    const events = (raw || []).slice().reverse();

    for (const ev of events) {
      const ts = getTs(ev);
      const gameUi = getGame(ev);
      const username = getUsername(ev, "bot_user");
      const amount = getAmount(ev);
      const payout = getPayout(ev);
      const mult = computeMultiplier(ev);

      const resultStr = String(ev?.result || "").toLowerCase();
      const isWin = payout > 0 || resultStr === "win";

      pushActivity({
        id: `${ts}-${username}-bet-${gameUi}`,
        username,
        game: gameUi,
        action: "bet",
        amount,
        ts,
        timestamp: new Date(ts).toLocaleTimeString(),
        result: 0,
      });

      pushActivity({
        id: `${ts}-${username}-${isWin ? "win" : "lose"}-${gameUi}`,
        username,
        game: gameUi,
        action: isWin ? "win" : "lose",
        amount,
        multiplier: mult,
        ts,
        timestamp: new Date(ts).toLocaleTimeString(),
        result: isWin ? payout : -amount,
      });

      if (isWin && qualifiesJackpot(mult)) {
        pushJackpot({
          id: `${ts}-${username}-jackpot-${gameUi}`,
          username,
          game: gameUi,
          action: "win",
          amount,
          multiplier: mult || 1,
          ts,
          timestamp: new Date(ts).toLocaleTimeString(),
          result: payout || amount * (mult || 1),
        });
      }
    }

    hydratedOnce = true;
    return getRecentActivities(limit);
  } catch (e) {
    console.warn("hydrateRecentFromServer failed:", e);
    return getRecentActivities(limit);
  }
}

export async function hydrateRecentBigWinsFromServer(limit = MAX_RECENT): Promise<BotActivity[]> {
  try {
    const raw = await jsonFetch<any[]>(
      `/admin/bot/recent?type=bigwin&limit=${encodeURIComponent(limit)}`
    );
    const events = (raw || []).slice().reverse();
    for (const ev of events) {
      const ts = getTs(ev);
      const gameUi = getGame(ev);
      const username = getUsername(ev, "bot_user");
      const amount = getAmount(ev);
      const mult = computeMultiplier(ev);
      const payout = getPayout(ev) || amount * mult;

      pushBigWin({
        id: `${ts}-${username}-bigwin-${gameUi}`,
        username,
        game: gameUi,
        action: "win",
        amount,
        multiplier: mult,
        ts,
        timestamp: new Date(ts).toLocaleTimeString(),
        result: payout,
      });
      if (qualifiesJackpot(mult)) {
        pushJackpot({
          id: `${ts}-${username}-jackpot-${gameUi}`,
          username,
          game: gameUi,
          action: "win",
          amount,
          multiplier: mult,
          ts,
          timestamp: new Date(ts).toLocaleTimeString(),
          result: payout,
        });
      }
    }
    return getRecentBigWins(limit);
  } catch (e) {
    console.warn("hydrateRecentBigWinsFromServer failed:", e);
    return getRecentBigWins(limit);
  }
}

export async function hydrateRecentJackpotWinsFromServer(
  limit = MAX_RECENT
): Promise<BotActivity[]> {
  try {
    let raw = await jsonFetch<any[]>(
      `/admin/bot/recent?type=jackpot&limit=${encodeURIComponent(limit)}`
    );
    // Enforce ≥ 10x on server-provided jackpot list
    raw = Array.isArray(raw) ? raw.filter((ev) => qualifiesJackpot(ev)) : [];

    // Fallback: if server didn't return anything, fetch all and filter locally
    if (!raw.length) {
      const all = await jsonFetch<any[]>(
        `/admin/bot/recent?limit=${encodeURIComponent(limit)}`
      );
      raw = (all || []).filter((ev) => {
        const payout = getPayout(ev);
        const resultStr = String(ev?.result || "").toLowerCase();
        const isWin = payout > 0 || resultStr === "win";
        return isWin && qualifiesJackpot(ev);
      });
    }

    const events = (raw || []).slice().reverse();
    for (const ev of events) {
      const ts = getTs(ev);
      const gameUi = getGame(ev);
      const username = getUsername(ev, "bot_user");
      const amount = getAmount(ev);
      const mult = computeMultiplier(ev);
      const payout = getPayout(ev) || amount * mult;

      pushJackpot({
        id: `${ts}-${username}-jackpot-${gameUi}`,
        username,
        game: gameUi,
        action: "win",
        amount,
        multiplier: mult,
        ts,
        timestamp: new Date(ts).toLocaleTimeString(),
        result: payout,
      });
    }
    return getRecentJackpotWins(limit);
  } catch (e) {
    console.warn("hydrateRecentJackpotWinsFromServer failed:", e);
    return getRecentJackpotWins(limit);
  }
}

/** Live stats derived from aggregated buffer (fallback) */
export function getLiveStats(): BotStatsData {
  const now = Date.now();
  const TEN_MIN = 10 * 60 * 1000;
  let active = 0;
  for (const [, last] of seenUsers) if (now - last <= TEN_MIN) active++;
  const winRatePct = totalBets > 0 ? Math.round((totalWins / totalBets) * 100) : 0;

  return {
    activeUsers: active,
    totalBets,
    dailyVolume: Number(totalStaked.toFixed(3)),
    winRate: winRatePct,
  };
}

export function isFeedConnected(): boolean {
  return !!socketConnected;
}
