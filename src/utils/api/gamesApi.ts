// src/utils/api/gamesApi.ts
import { GameSettings } from "@/components/admin/GameSettingsModal";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).replace(/\/$/, "");

/** Backend shape returned by GET /admin/games */
type BackendGame = {
  id: string;
  name: string;
  enabled: boolean;
  running: boolean;
  minBetLamports: string | number;
  maxBetLamports: string | number;
  feeBps: number;
  rtpBps: number;
  revenue: number; // revenue in SOL (backend already divided by 1e9)
  plays?: number; // may be missing, default to 0
};

const GAME_ICONS: Record<string, string> = {
  coinflip: "🪙",
  dice: "🎲",
  crash: "🚀",
  mines: "💣",
  slots: "🎰",
  plinko: "⚪",
};

/* -------------------- ONLY for bet-limit conversion -------------------- */
const LAMPORTS_PER_SOL = 1_000_000_000;

class PriceService {
  private static LS_KEY = "flipverse:sol_usdt_price";
  private static TTL_MS = 60_000; // 60s cache
  private static memo: { price?: number; ts?: number } = {};

  /** Returns 1 SOL in USDT (≈USD). No backend calls. */
  static async getSolUsdt(): Promise<number> {
    const now = Date.now();

    // In-memory cache
    if (this.memo.price && this.memo.ts && now - this.memo.ts < this.TTL_MS) {
      return this.memo.price!;
    }

    // LocalStorage cache
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(this.LS_KEY);
        if (raw) {
          const { price, ts } = JSON.parse(raw);
          if (price && now - Number(ts) < this.TTL_MS) {
            this.memo = { price: Number(price), ts: Number(ts) };
            return this.memo.price!;
          }
        }
      } catch {}
    }

    // Public sources (no backend)
    // Coingecko
    try {
      const cg = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
        { cache: "no-store" }
      );
      if (cg.ok) {
        const j = await cg.json();
        const p = Number(j?.solana?.usd);
        if (Number.isFinite(p) && p > 0) return this.stash(p);
      }
    } catch {}

    // Binance
    try {
      const bz = await fetch(
        "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT",
        { cache: "no-store" }
      );
      if (bz.ok) {
        const j = await bz.json();
        const p = Number(j?.price);
        if (Number.isFinite(p) && p > 0) return this.stash(p);
      }
    } catch {}

    // Last resort: constant so UI doesn't break
    return this.stash(150);
  }

  private static stash(price: number): number {
    const ts = Date.now();
    this.memo = { price, ts };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(this.LS_KEY, JSON.stringify({ price, ts }));
      } catch {}
    }
    return price;
  }
}

function lamportsToUsdt(lamports: number, solUsdt: number): number {
  return (lamports / LAMPORTS_PER_SOL) * solUsdt;
}
function usdtToLamports(usdt: number, solUsdt: number): number {
  return Math.round((usdt / solUsdt) * LAMPORTS_PER_SOL);
}
/* ---------------------------------------------------------------------- */

/** Convert backend object -> UI model (ONLY bet limits to USDT) */
function toUiWithPrice(g: BackendGame, solUsdt: number): GameSettings {
  const minBet = lamportsToUsdt(Number(g.minBetLamports), solUsdt); // USDT
  const maxBet = lamportsToUsdt(Number(g.maxBetLamports), solUsdt); // USDT
  const houseEdge = Math.max(0, (10000 - Number(g.rtpBps)) / 100);

  return {
    id: g.id,
    name: g.name,
    icon: GAME_ICONS[g.id] ?? "🎮",
    enabled: g.enabled,
    running: g.running,
    minBet, // USDT
    maxBet, // USDT
    houseEdge,
    totalPlayed: Number(g.plays ?? 0),
    revenue: Number(g.revenue ?? 0), // unchanged (SOL)
  };
}

/** Convert UI patch -> backend payload (ONLY bet limits back to lamports) */
async function toServerPatch(usdtUpdates: Partial<GameSettings>) {
  const patch: Record<string, number | boolean> = {};
  const solUsdt = await PriceService.getSolUsdt();

  if (usdtUpdates.minBet != null) {
    patch.min_bet_lamports = usdtToLamports(Number(usdtUpdates.minBet), solUsdt);
  }
  if (usdtUpdates.maxBet != null) {
    patch.max_bet_lamports = usdtToLamports(Number(usdtUpdates.maxBet), solUsdt);
  }

  if (usdtUpdates.houseEdge != null) {
    patch.houseEdgePct = Number(usdtUpdates.houseEdge);
  }
  if (typeof usdtUpdates.enabled === "boolean") {
    patch.enabled = usdtUpdates.enabled;
  }
  if (typeof usdtUpdates.running === "boolean") {
    patch.running = usdtUpdates.running;
  }

  return patch;
}

export class GamesApiService {
  /** Fetch all game settings (min/max returned in USDT; everything else unchanged) */
  static async fetchGames(): Promise<GameSettings[]> {
    const res = await fetch(`${API_BASE_URL}/admin/games`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch games (${res.status})`);
    const data: BackendGame[] = await res.json();

    const solUsdt = await PriceService.getSolUsdt();
    return data.map((g) => toUiWithPrice(g, solUsdt));
  }

  /** Update a game — accepts min/max in USDT; sends lamports to backend */
  static async updateGame(
    gameId: string,
    updates: Partial<GameSettings>
  ): Promise<GameSettings> {
    const body = await toServerPatch(updates);
    const res = await fetch(`${API_BASE_URL}/admin/games/${gameId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to update game");
    const updated: BackendGame = await res.json();

    const solUsdt = await PriceService.getSolUsdt();
    return toUiWithPrice(updated, solUsdt);
  }

  /** Toggle game enabled */
  static async toggleGameEnabled(gameId: string, _enabled?: boolean): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/admin/games/${gameId}/toggle-enabled`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to toggle game enabled");
  }

  /** Toggle game running */
  static async toggleGameRunning(gameId: string, _running?: boolean): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/admin/games/${gameId}/toggle-running`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to toggle game running");
  }
}
