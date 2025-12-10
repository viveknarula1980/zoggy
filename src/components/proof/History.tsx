"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  CheckCircle,
  RefreshCw,
  Zap,
  Dice6,
  Rocket,
  Gamepad2,
  Bomb,
  Circle,
  Coins,
  AlertTriangle,
  Loader2,
  Search,
  ScanLine,
} from "lucide-react";
import TablePagination from "@/components/admin/common/TablePagination";
import ManualVerification from "@/components/proof/ManualVerification";
import { verifyDice } from "@/utils/provablyFair";
import { useWallet } from "@solana/wallet-adapter-react";

/** If you host API on another origin, set NEXT_PUBLIC_API_BASE=https://api.yourhost.com */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

type GameType = "dice" | "crash" | "mines" | "slots" | "plinko" | "coinflip";
type GameFilter = "all" | GameType;

/** ----------------------------- DICE types (from /dice/resolved) ----------------------------- */
type DiceResolvedRow = {
  id: number;
  player: string;
  bet_amount_lamports: string | number;
  bet_type: 0 | 1; // 0=under, 1=over
  target: number;
  roll: number;
  payout_lamports: string | number;
  nonce: number;
  status?: string | null;

  lock_tx_sig: string | null;
  resolved_tx_sig: string | null;

  // PF fields (may be null for legacy rows)
  client_seed: string;
  server_seed_hash: string | null;
  server_seed_hex: string | null;
  first_hmac_hex: string | null;

  win: boolean | null;
  rtp_bps?: number | null;
  fee_bps?: number | null;
  created_at?: string | null;
  resolved_at?: string | null;
};

/** -------------------------- COINFLIP types (from /coinflip/resolved) -------------------------- */
type CoinflipResolvedRow = {
  id: number;
  nonce: number | string;
  player_a: string;
  player_b: string;
  side_a: 0 | 1; // 0=heads, 1=tails
  side_b: 0 | 1;
  bet_lamports: string | number;
  outcome: 0 | 1; // 0=heads, 1=tails
  winner: string | null; // base58 of winner wallet
  payout_lamports: string | number;
  fee_bps?: number | null;

  lock_sig_a: string | null;
  lock_sig_b: string | null;
  resolve_sig_winner: string | null;
  resolve_sig_loser: string | null;

  // PF fields
  server_seed_hash: string | null;
  server_seed_hex: string | null;
  first_hmac_hex: string | null;
  client_seed_a: string;
  client_seed_b: string;

  status?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
};

/** ----------------------------- CRASH types (from /crash/resolved) ----------------------------- */
type CrashResolvedRow = {
  id: number;
  player: string;
  bet_lamports: string | number;
  nonce: number | string;
  cashout_multiplier_bps: number | null; // null if crashed before cashout
  crash_at_mul: number; // final crash multiplier (double)
  payout_lamports: string | number;
  fee_bps?: number | null;

  lock_tx_sig: string | null;
  resolve_tx_sig: string | null;

  // PF fields
  server_seed_hash: string | null;
  server_seed_hex: string | null;
  first_hmac_hex: string | null;
  client_seed: string;

  status?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
};

/** ----------------------------- MINES types (from /mines/resolved) ----------------------------- */
type MinesResolvedRow = {
  id: number;
  player: string;
  bet_lamports: string | number;
  nonce: number | string;
  rows: number;
  cols: number;
  mines: number;
  rtp_bps?: number | null;

  // outcome
  payout_lamports: string | number;

  // reveal / PF
  server_seed_hash: string | null;
  server_seed_hex: string | null;
  first_hmac_hex: string | null;
  client_seed: string;
  first_safe_index?: number | null;
  opened_json?: number[] | string | null; // safe tiles opened (JSON in DB)
  bomb_indices?: number[] | string | null; // full bombs set if persisted

  lock_tx_sig?: string | null;
  resolved_tx_sig?: string | null;

  status?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
};

/** ----------------------------- SLOTS types (from /slots/resolved) ----------------------------- */
type SlotsResolvedRow = {
  id: number;
  player: string;
  nonce: number | string;

  // stake & payout (backend may use either names; support both)
  bet_lamports?: string | number;
  bet_amount?: string | number;
  bet_amount_lamports?: string | number;
  payout?: string | number;
  payout_lamports?: string | number;

  fee_pct?: number | null; // e.g. 0.05

  // PF / reveal
  client_seed: string;
  server_seed_hash: string | null;
  server_seed_hex: string | null;
  first_hmac_hex: string | null;

  // optional details
  grid_json?: string | string[] | null;
  lock_sig?: string | null;
  resolve_sig?: string | null;

  status?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
};

/** ----------------------------- PLINKO types (from /plinko/resolved) ----------------------------- */
type PlinkoResolvedRow = {
  id: number;
  nonce: number | string;
  player: string;
  unit_lamports: string | number;
  balls: number;
  rows: number;
  diff: number;
  payout: string | number;

  // PF fields
  server_seed_hash: string | null;
  server_seed_hex: string | null;
  first_hmac_hex: string | null;
  client_seed: string;

  // Optional results payload from backend
  results_json?: { rows: number; balls: number; results: number[] } | string | null;

  status?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
};

/** ------------------------------------ Shared UI types ------------------------------------ */
type VerifyStatus =
  | { kind: "verified" }
  | { kind: "pending"; reason: string }
  | {
      kind: "mismatch";
      details: string;
      computed?: {
        roll?: number;
        outcome?: number | string;
        hmacHex?: string | null;
        crashAtMul?: number;
        bombsMatch?: boolean;
        payoutCalc?: string;
        gridMatch?: boolean;
      };
    }
  | { kind: "error"; details: string };

type EnrichedRow = {
  raw:
    | DiceResolvedRow
    | CoinflipResolvedRow
    | CrashResolvedRow
    | MinesResolvedRow
    | SlotsResolvedRow
    | PlinkoResolvedRow;
  display: {
    gameType: GameType;
    result: string;
    serverSeed: string | null;
    clientSeed: string;
    nonce: number;
    hmac: string | null;
    time: string | null;
    timeTs: number | null; // numeric for sorting
  };
  verify: VerifyStatus;
};

const gameIcons: Record<GameType, React.ReactNode> = {
  crash: <Rocket size={18} />,
  slots: <Gamepad2 size={18} />,
  mines: <Bomb size={18} />,
  dice: <Dice6 size={18} />,
  plinko: <Circle size={18} />,
  coinflip: <Coins size={18} />,
};

/** ---------------------------------------- Utils ---------------------------------------- */
const truncateHash = (hash: string, length: number = 12) =>
  !hash || hash.length <= length + 4 ? hash : `${hash.slice(0, length)}...${hash.slice(-4)}`;

const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { hour12: false }) : null;

const ts = (iso?: string | null) => {
  if (!iso) return null;
  const n = new Date(iso).getTime();
  return Number.isFinite(n) ? n : null;
};

const isHex32 = (s?: string | null) => !!s && /^[0-9a-f]+$/i.test(s) && s.length === 64;

const isDiceRow = (x: any): x is DiceResolvedRow => "roll" in x && "player" in x && "target" in x;
const isCoinflipRow = (x: any): x is CoinflipResolvedRow =>
  "player_a" in x && "player_b" in x && "outcome" in x;
const isCrashRow = (x: any): x is CrashResolvedRow =>
  "crash_at_mul" in x && "client_seed" in x && "bet_lamports" in x;
const isMinesRow = (x: any): x is MinesResolvedRow =>
  "rows" in x && "cols" in x && "mines" in x && "client_seed" in x;
const isSlotsRow = (x: any): x is SlotsResolvedRow =>
  "client_seed" in x && "server_seed_hash" in x && !("rows" in x) && !("crash_at_mul" in x);
const isPlinkoRow = (x: any): x is PlinkoResolvedRow =>
  "balls" in x && "rows" in x && "diff" in x && "client_seed" in x && ("unit_lamports" in x || "payout" in x);

/** --------------------------------- Browser crypto helpers --------------------------------- */
function hexToBytes(hex: string): Uint8Array {
  const h = hex.replace(/^0x/i, "");
  const arr = new Uint8Array(h.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(h.substr(i * 2, 2), 16);
  return arr;
}
function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = "";
  for (let i = 0; i < b.length; i++) out += b[i].toString(16).padStart(2, "0");
  return out;
}
function encUtf8(s: string) {
  return new TextEncoder().encode(s);
}
async function hmacSha256Hex(
  keyHex: string,
  msg: string
): Promise<{ hex: string; bytes: Uint8Array<ArrayBufferLike> }> {
  const keyData = hexToBytes(keyHex);
  const cryptoKey = await crypto.subtle.importKey("raw", new Uint8Array(keyData), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = (await crypto.subtle.sign("HMAC", cryptoKey, new Uint8Array(encUtf8(msg)))) as ArrayBuffer;
  const hex = bytesToHex(sig);
  return { hex, bytes: new Uint8Array(sig) };
}
async function hmacSha256Bytes(key: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", new Uint8Array(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new Uint8Array(msg));
  return new Uint8Array(sig.slice(0));
}
async function sha256HexBytes(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  return bytesToHex(hash);
}

/** --------- minimal base58 decode (Bitcoin alphabet) for Solana pubkeys --------- */
const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_MAP: Record<string, number> = Object.fromEntries([...B58_ALPHABET].map((c, i) => [c, i]));
function base58Decode(str: string): Uint8Array {
  const bytes: number[] = [0];
  for (const ch of str) {
    const val = B58_MAP[ch];
    if (val === undefined) throw new Error("Invalid base58 char");
    let carry = val;
    for (let j = 0; j < bytes.length; ++j) {
      const x = bytes[j] * 58 + carry;
      bytes[j] = x & 0xff;
      carry = x >> 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const ch of str) {
    if (ch === "1") bytes.push(0);
    else break;
  }
  return new Uint8Array(bytes.reverse());
}

/** --------- Crash PF reproduction --------- */
function u64FromFirst8BE(bytes: Uint8Array): bigint {
  return (
    (BigInt(bytes[0]) << 56n) |
    (BigInt(bytes[1]) << 48n) |
    (BigInt(bytes[2]) << 40n) |
    (BigInt(bytes[3]) << 32n) |
    (BigInt(bytes[4]) << 24n) |
    (BigInt(bytes[5]) << 16n) |
    (BigInt(bytes[6]) << 8n) |
    BigInt(bytes[7])
  );
}
function deriveCrashMultiplierFromHmac(first8: Uint8Array): number {
  const n64 = u64FromFirst8BE(first8);
  const r = Number(n64 >> 11n) / Math.pow(2, 53);
  const edge = 0.99;
  const m = Math.max(1.01, edge / (1 - Math.min(0.999999999999, r)));
  return Math.min(m, 10000);
}

/** --------- Mines combinatoric multiplier --------- */
function minesMultiplier(safeOpened: number, totalTiles: number, mines: number, rtpBps: number = 10000) {
  if (safeOpened <= 0) return 1;
  let m = 1;
  for (let i = 0; i < safeOpened; i++) {
    const totalLeft = totalTiles - i;
    const safeLeft = totalTiles - mines - i;
    m *= totalLeft / safeLeft;
  }
  m *= rtpBps / 10000;
  return Math.max(1, m);
}

/** --------------- Slots RNG + Paytable --------------- */
function makeRng({
  serverSeedHex,
  clientSeed,
  nonce,
}: {
  serverSeedHex: string;
  clientSeed: string;
  nonce: number | string;
}) {
  const serverSeed = hexToBytes(serverSeedHex);
  let counter = 0,
    pool: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
  function refill() {
    const a = encUtf8(clientSeed || "");
    const b = encUtf8(String(nonce));
    const msg = new Uint8Array(a.length + b.length + 4);
    msg.set(a, 0);
    msg.set(b, a.length);
    const off = a.length + b.length;
    msg[off] = (counter >>> 0) & 0xff;
    msg[off + 1] = (counter >>> 8) & 0xff;
    msg[off + 2] = (counter >>> 16) & 0xff;
    msg[off + 3] = (counter >>> 24) & 0xff;
    counter++;
    return hmacSha256Bytes(serverSeed, msg);
  }
  const digests: Uint8Array[] = [];
  async function ensure(n: number) {
    while (digests.length * 8 < n) {
      digests.push(await refill());
    }
  }
  function u32FromDigest(d: Uint8Array, i: number) {
    const o = i * 4;
    return ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0;
  }
  async function nextU32(): Promise<number> {
    if (pool.length < 4) {
      await ensure(4);
      const d = digests.shift()!;
      pool = d;
    }
    const x = u32FromDigest(pool, 0);
    pool = pool.slice(4);
    return x >>> 0;
  }
  async function nextFloat() {
    return (await nextU32()) / 2 ** 32;
  }
  async function nextInt(min: number, max: number) {
    return min + Math.floor((await nextFloat()) * (max - min + 1));
  }
  async function pick<T>(arr: T[]) {
    return arr[await nextInt(0, arr.length - 1)];
  }
  return { nextU32, nextFloat, nextInt, pick };
}

const SLOT_SYMBOLS = ["floki", "wif", "brett", "shiba", "bonk", "doge", "pepe", "sol", "zoggy"];
const SLOTS_CELLS = 9;
type PayRow = { key: string; type: "near" | "triple" | "loss"; symbol?: string; payoutMul: number; freq: number };
const PAYTABLE: PayRow[] = [
  { key: "near_miss", type: "near", payoutMul: 0.8, freq: 0.24999992500002252 },
  { key: "triple_floki", type: "triple", symbol: "floki", payoutMul: 1.5, freq: 0.04999998500000451 },
  { key: "triple_wif", type: "triple", symbol: "wif", payoutMul: 1.5, freq: 0.04999998500000451 },
  { key: "triple_brett", type: "triple", symbol: "brett", payoutMul: 1.5, freq: 0.04999998500000451 },
  { key: "triple_shiba", type: "triple", symbol: "shiba", payoutMul: 3, freq: 0.023609992917002123 },
  { key: "triple_bonk", type: "triple", symbol: "bonk", payoutMul: 6, freq: 0.011804996458501062 },
  { key: "triple_doge", type: "triple", symbol: "doge", payoutMul: 10, freq: 0.007082997875100638 },
  { key: "triple_pepe", type: "triple", symbol: "pepe", payoutMul: 20, freq: 0.003541998937400319 },
  { key: "triple_sol", type: "triple", symbol: "sol", payoutMul: 50, freq: 0.001416999574900128 },
  { key: "triple_zoggy", type: "triple", symbol: "zoggy", payoutMul: 100, freq: 0.000708299787510064 },
  { key: "jackpot", type: "triple", symbol: "zoggy", payoutMul: 1000, freq: 0 },
  { key: "loss", type: "loss", payoutMul: 0, freq: 0.5518348344495496 },
];
const CDF = (() => {
  const rows = PAYTABLE.filter((p) => p.key !== "jackpot");
  let acc = 0;
  return rows.map((r) => ({ ...r, cum: (acc += r.freq) }));
})();

async function pickOutcome(rng: ReturnType<typeof makeRng>) {
  const r = await rng.nextFloat();
  for (const row of CDF) if (r < row.cum) return row as PayRow;
  return PAYTABLE.find((p) => p.key === "loss") as PayRow;
}

async function buildGridForOutcome(rng: ReturnType<typeof makeRng>, outcome: PayRow) {
  const grid: string[] = [];
  for (let i = 0; i < SLOTS_CELLS; i++) grid.push(await rng.pick(SLOT_SYMBOLS));
  const midStart = 3;
  const mid = grid.slice(midStart, midStart + 3);
  const pickNot = async (exclude: string) => {
    let s: string;
    do s = await rng.pick(SLOT_SYMBOLS);
    while (s === exclude);
    return s;
  };

  if (outcome.type === "triple") {
    const s = outcome.symbol!;
    mid[0] = s;
    mid[1] = s;
    mid[2] = s;
  } else if (outcome.type === "near") {
    const s = await rng.pick(SLOT_SYMBOLS);
    const odd = await rng.nextInt(0, 2);
    const t = await pickNot(s);
    for (let i = 0; i < 3; i++) mid[i] = i === odd ? t : s;
  } else {
    mid[0] = await rng.pick(SLOT_SYMBOLS);
    do {
      mid[1] = await rng.pick(SLOT_SYMBOLS);
    } while (mid[1] === mid[0]);
    do {
      mid[2] = await rng.pick(SLOT_SYMBOLS);
    } while (mid[2] === mid[0] || mid[2] === mid[1]);
  }
  for (let i = 0; i < 3; i++) grid[midStart + i] = mid[i];
  return grid;
}

function computeSlotsPayoutLamports(betLamports: bigint, payoutMul: number, feePct: number) {
  const SCALE = 1_000_000n;
  const mul = BigInt(Math.round(payoutMul * 1_000_000));
  const fee = BigInt(Math.round(feePct * 1_000_000));
  const gross = (betLamports * mul) / SCALE;
  const feeAmt = (betLamports * fee) / SCALE;
  return gross > feeAmt ? gross - feeAmt : 0n;
}

/** ----------------------------------- Fetch helpers ----------------------------------- */
async function fetchDicePage(params: {
  wallet: string;
  limit: number;
  cursor?: number | null;
}): Promise<{ items: DiceResolvedRow[]; nextCursor: number | null }> {
  const qs = new URLSearchParams({ wallet: params.wallet, limit: String(params.limit) });
  if (params.cursor) qs.set("cursor", String(params.cursor));
  const url = `${API_BASE}/dice/resolved?${qs.toString()}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
  const j = await r.json();
  return {
    items: (j.items || []) as DiceResolvedRow[],
    nextCursor: (j.nextCursor ?? null) as number | null,
  };
}

async function fetchCoinflipPage(params: {
  wallet: string;
  limit: number;
  cursor?: number | null;
}): Promise<{ items: CoinflipResolvedRow[]; nextCursor: number | null }> {
  const qs = new URLSearchParams({ wallet: params.wallet, limit: String(params.limit) });
  if (params.cursor) qs.set("cursor", String(params.cursor));
  const url = `${API_BASE}/coinflip/resolved?${qs.toString()}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
  const j = await r.json();
  return {
    items: (j.items || []) as CoinflipResolvedRow[],
    nextCursor: (j.nextCursor ?? null) as number | null,
  };
}

async function fetchCrashPage(params: {
  wallet: string;
  limit: number;
  cursor?: number | null;
}): Promise<{ items: CrashResolvedRow[]; nextCursor: number | null }> {
  const qs = new URLSearchParams({ wallet: params.wallet, limit: String(params.limit) });
  if (params.cursor) qs.set("cursor", String(params.cursor));
  const url = `${API_BASE}/crash/resolved?${qs.toString()}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
  const j = await r.json();
  return {
    items: (j.items || []) as CrashResolvedRow[],
    nextCursor: (j.nextCursor ?? null) as number | null,
  };
}

async function fetchMinesPage(params: {
  wallet: string;
  limit: number;
  cursor?: number | null;
}): Promise<{ items: MinesResolvedRow[]; nextCursor: number | null }> {
  const qs = new URLSearchParams({ wallet: params.wallet, limit: String(params.limit) });
  if (params.cursor) qs.set("cursor", String(params.cursor));
  const url = `${API_BASE}/mines/resolved?${qs.toString()}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
  const j = await r.json();
  return {
    items: (j.items || []) as MinesResolvedRow[],
    nextCursor: (j.nextCursor ?? null) as number | null,
  };
}

async function fetchSlotsPage(params: {
  wallet: string;
  limit: number;
  cursor?: number | null;
}): Promise<{ items: SlotsResolvedRow[]; nextCursor: number | null }> {
  const qs = new URLSearchParams({ wallet: params.wallet, limit: String(params.limit) });
  if (params.cursor) qs.set("cursor", String(params.cursor));
  const url = `${API_BASE}/slots/resolved?${qs.toString()}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
  const j = await r.json();
  return {
    items: (j.items || []) as SlotsResolvedRow[],
    nextCursor: (j.nextCursor ?? null) as number | null,
  };
}

async function fetchPlinkoPage(params: {
  wallet: string;
  limit: number;
  cursor?: number | null;
}): Promise<{ items: PlinkoResolvedRow[]; nextCursor: number | null }> {
  const qs = new URLSearchParams({ wallet: params.wallet, limit: String(params.limit) });
  if (params.cursor) qs.set("cursor", String(params.cursor));
  const url = `${API_BASE}/plinko/resolved?${qs.toString()}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
  const j = await r.json();
  return {
    items: (j.items || []) as PlinkoResolvedRow[],
    nextCursor: (j.nextCursor ?? null) as number | null,
  };
}

/** ---------------------------------- Auto-verify (Dice) ---------------------------------- */
async function autoVerifyDice(row: DiceResolvedRow): Promise<VerifyStatus> {
  if (!row.server_seed_hex || !isHex32(row.server_seed_hex)) {
    return { kind: "pending", reason: "Waiting for server seed reveal" };
  }
  try {
    const out = await verifyDice({
      serverSeedHex: row.server_seed_hex,
      clientSeed: row.client_seed || "",
      nonce: String(row.nonce),
    });
    const wantRoll = Number(row.roll);
    const rollMatch = Number.isFinite(wantRoll) && out.roll === wantRoll;
    const hmacMatch = row.first_hmac_hex
      ? (out.hmacHex || "").toLowerCase() === row.first_hmac_hex.toLowerCase()
      : true;

    if (rollMatch && hmacMatch) return { kind: "verified" };

    if (!rollMatch && hmacMatch)
      return {
        kind: "mismatch",
        details: `Roll mismatch (computed ${out.roll} ≠ stored ${wantRoll})`,
        computed: { roll: out.roll, hmacHex: out.hmacHex ?? null },
      };

    if (rollMatch && !hmacMatch)
      return {
        kind: "mismatch",
        details: "HMAC mismatch",
        computed: { roll: out.roll, hmacHex: out.hmacHex ?? null },
      };

    return {
      kind: "mismatch",
      details: "Roll and HMAC mismatch",
      computed: { roll: out.roll, hmacHex: out.hmacHex ?? null },
    };
  } catch (e: any) {
    return { kind: "error", details: e?.message || String(e) };
  }
}

/** -------------------------------- Auto-verify (Coinflip) -------------------------------- */
async function autoVerifyCoinflip(row: CoinflipResolvedRow): Promise<VerifyStatus> {
  if (!row.server_seed_hex || !isHex32(row.server_seed_hex)) {
    return { kind: "pending", reason: "Waiting for server seed reveal" };
  }
  try {
    const message = `${row.client_seed_a || ""}|${row.client_seed_b || ""}|${row.nonce}`;
    const { hex, bytes } = await hmacSha256Hex(row.server_seed_hex, message);
    const outcomeComputed = bytes[0] & 1; // 0=heads, 1=tails
    const outcomeMatch = outcomeComputed === Number(row.outcome);
    const hmacMatch = row.first_hmac_hex ? hex.toLowerCase() === row.first_hmac_hex.toLowerCase() : true;

    if (outcomeMatch && hmacMatch) return { kind: "verified" };

    if (!outcomeMatch && hmacMatch)
      return {
        kind: "mismatch",
        details: `Outcome mismatch (computed ${outcomeComputed} ≠ stored ${row.outcome})`,
        computed: { outcome: outcomeComputed, hmacHex: hex },
      };

    if (outcomeMatch && !hmacMatch)
      return {
        kind: "mismatch",
        details: "HMAC mismatch",
        computed: { outcome: outcomeComputed, hmacHex: hex },
      };

    return {
      kind: "mismatch",
      details: "Outcome and HMAC mismatch",
      computed: { outcome: outcomeComputed, hmacHex: hex },
    };
  } catch (e: any) {
    return { kind: "error", details: e?.message || String(e) };
  }
}

/** --------------------------------- Auto-verify (Crash) --------------------------------- */
async function autoVerifyCrash(row: CrashResolvedRow): Promise<VerifyStatus> {
  if (!row.server_seed_hex || !isHex32(row.server_seed_hex)) {
    return { kind: "pending", reason: "Waiting for server seed reveal" };
  }
  try {
    const msg = `${row.client_seed || ""}${row.nonce}`;
    const { hex, bytes } = await hmacSha256Hex(row.server_seed_hex, msg);
    const crashAtComputed = deriveCrashMultiplierFromHmac(bytes.subarray(0, 8));

    const hmacMatch = row.first_hmac_hex ? hex.toLowerCase() === row.first_hmac_hex.toLowerCase() : true;

    const want = Number(row.crash_at_mul);
    const diff = Math.abs(crashAtComputed - want);
    const ok = diff <= 1e-9 || diff / Math.max(1, want) < 1e-9;

    if (ok && hmacMatch) return { kind: "verified" };

    if (!ok && hmacMatch)
      return {
        kind: "mismatch",
        details: `Crash multiplier mismatch (computed ${crashAtComputed.toFixed(6)} ≠ stored ${want.toFixed(6)})`,
        computed: { crashAtMul: crashAtComputed, hmacHex: hex },
      };

    if (ok && !hmacMatch)
      return {
        kind: "mismatch",
        details: "HMAC mismatch",
        computed: { crashAtMul: crashAtComputed, hmacHex: hex },
      };

    return {
      kind: "mismatch",
      details: "Crash multiplier and HMAC mismatch",
      computed: { crashAtMul: crashAtComputed, hmacHex: hex },
    };
  } catch (e: any) {
    return { kind: "error", details: e?.message || String(e) };
  }
}

/** ---------------------------------- Auto-verify (Mines) --------------------------------- */
async function autoVerifyMines(row: MinesResolvedRow): Promise<VerifyStatus> {
  if (!row.server_seed_hex || !isHex32(row.server_seed_hex)) {
    return { kind: "pending", reason: "Waiting for server seed reveal" };
  }
  try {
    const pkBytes = base58Decode(row.player);
    const baseMsg = new Uint8Array(
      pkBytes.length + encUtf8(String(row.nonce)).length + encUtf8(row.client_seed || "").length
    );
    baseMsg.set(pkBytes, 0);
    baseMsg.set(encUtf8(String(row.nonce)), pkBytes.length);
    baseMsg.set(encUtf8(row.client_seed || ""), pkBytes.length + encUtf8(String(row.nonce)).length);

    const seedKey = await hmacSha256Bytes(hexToBytes(row.server_seed_hex!), baseMsg);
    const firstHmacHex = bytesToHex(seedKey);

    const hmacMatch = row.first_hmac_hex ? firstHmacHex.toLowerCase() === row.first_hmac_hex.toLowerCase() : true;

    const hashHex = await sha256HexBytes(hexToBytes(row.server_seed_hex!));
    const commitMatch = row.server_seed_hash ? row.server_seed_hash.toLowerCase() === hashHex.toLowerCase() : true;

    const total = row.rows * row.cols;
    const firstSafeIndex =
      (row.first_safe_index ?? null) !== null
        ? Number(row.first_safe_index)
        : (() => {
            const opened: number[] =
              typeof row.opened_json === "string"
                ? (JSON.parse(row.opened_json) as number[])
                : (row.opened_json as number[]) || [];
            return opened.length > 0 ? opened[0] : 0;
          })();

    const bombs = new Set<number>();
    let i = 0;
    while (bombs.size < row.mines) {
      const rng = await hmacSha256Bytes(seedKey, encUtf8(String(i++)));
      const n = ((rng[0] << 24) | (rng[1] << 16) | (rng[2] << 8) | rng[3]) >>> 0;
      const idx = n % total;
      if (idx === firstSafeIndex) continue;
      bombs.add(idx);
    }

    let bombsOk = true;
    if (row.bomb_indices) {
      const arr: number[] =
        typeof row.bomb_indices === "string"
          ? (JSON.parse(row.bomb_indices) as number[])
          : (row.bomb_indices as number[]);
      const fromDb = new Set(arr);
      if (fromDb.size !== bombs.size) bombsOk = false;
      else for (const v of bombs) if (!fromDb.has(v)) {
        bombsOk = false;
        break;
      }
    }

    const bet = BigInt(String(row.bet_lamports));
    const opened: number[] =
      typeof row.opened_json === "string"
        ? (JSON.parse(row.opened_json) as number[])
        : (row.opened_json as number[]) || [];
    const safeCount = opened.filter((i) => !bombs.has(i)).length;
    const safeAllGood = safeCount === opened.length;

    const rtpBps = Number(row.rtp_bps ?? 9800);
    const mult = minesMultiplier(safeCount, total, row.mines, rtpBps);
    const multBps = Math.floor(mult * 10000);
    const payoutCalc = (bet * BigInt(multBps)) / 10000n;
    const payoutStored = BigInt(String(row.payout_lamports || 0));
    const payoutMatch = payoutCalc === payoutStored || payoutStored === 0n;

    if (hmacMatch && commitMatch && bombsOk && safeAllGood && payoutMatch) {
      return { kind: "verified" };
    }

    const issues: string[] = [];
    if (!hmacMatch) issues.push("HMAC mismatch");
    if (!commitMatch) issues.push("Commitment hash mismatch");
    if (!bombsOk) issues.push("Bomb layout mismatch");
    if (!safeAllGood) issues.push("Opened contains a bomb");
    if (!payoutMatch) issues.push(`Payout mismatch (calc ${payoutCalc.toString()} ≠ stored ${payoutStored.toString()})`);

    return {
      kind: "mismatch",
      details: issues.join("; "),
      computed: { bombsMatch: bombsOk, payoutCalc: payoutCalc.toString(), hmacHex: firstHmacHex },
    };
  } catch (e: any) {
    return { kind: "error", details: e?.message || String(e) };
  }
}

/** ---------------------------------- Auto-verify (Slots) --------------------------------- */
async function autoVerifySlots(row: SlotsResolvedRow): Promise<VerifyStatus> {
  if (!row.server_seed_hex || !isHex32(row.server_seed_hex)) {
    return { kind: "pending", reason: "Waiting for server seed reveal" };
  }
  try {
    const msg = `${row.client_seed || ""}${row.nonce}`;
    const { hex: firstHex } = await hmacSha256Hex(row.server_seed_hex, msg);

    const hmacMatch = row.first_hmac_hex ? firstHex.toLowerCase() === row.first_hmac_hex.toLowerCase() : true;

    const hashHex = await sha256HexBytes(hexToBytes(row.server_seed_hex));
    const commitMatch = row.server_seed_hash ? row.server_seed_hash.toLowerCase() === hashHex.toLowerCase() : true;

    const rng = makeRng({
      serverSeedHex: row.server_seed_hex,
      clientSeed: row.client_seed || "",
      nonce: Number(row.nonce),
    });
    const outcome = await pickOutcome(rng);
    const grid = await buildGridForOutcome(rng, outcome);

    const feePct = Number(row.fee_pct ?? 0.05);
    const betLamports = BigInt(String(row.bet_lamports ?? row.bet_amount ?? row.bet_amount_lamports ?? 0));
    const payoutCalc = computeSlotsPayoutLamports(betLamports, outcome.payoutMul, feePct);

    const payoutStored = BigInt(String(row.payout_lamports ?? row.payout ?? 0));
    const payoutMatch = payoutCalc === payoutStored;

    let gridOk = true;
    if (row.grid_json) {
      const dbGrid: string[] =
        typeof row.grid_json === "string"
          ? (JSON.parse(row.grid_json) as string[])
          : (row.grid_json as string[]);
      if (dbGrid?.length === grid.length) {
        for (let i = 0; i < grid.length; i++) {
          if (dbGrid[i] !== grid[i]) {
            gridOk = false;
            break;
          }
        }
      } else gridOk = false;
    }

    if (hmacMatch && commitMatch && payoutMatch && gridOk) {
      return { kind: "verified" };
    }

    const issues: string[] = [];
    if (!hmacMatch) issues.push("HMAC mismatch");
    if (!commitMatch) issues.push("Commitment hash mismatch");
    if (!payoutMatch) issues.push(`Payout mismatch (calc ${payoutCalc.toString()} ≠ stored ${payoutStored.toString()})`);
    if (!gridOk) issues.push("Grid mismatch");

    return {
      kind: "mismatch",
      details: issues.join("; "),
      computed: {
        payoutCalc: payoutCalc.toString(),
        hmacHex: firstHex,
        outcome: outcome.key,
        gridMatch: gridOk,
      },
    };
  } catch (e: any) {
    return { kind: "error", details: e?.message || String(e) };
  }
}

/** ------------------------------- Auto-verify (Plinko) ------------------------------- */
async function autoVerifyPlinko(row: PlinkoResolvedRow): Promise<VerifyStatus> {
  if (!row.server_seed_hex || !isHex32(row.server_seed_hex)) {
    return { kind: "pending", reason: "Waiting for server seed reveal" };
  }
  try {
    const key = hexToBytes(row.server_seed_hex);
    const client = encUtf8(row.client_seed || "");
    const nonce = encUtf8(String(row.nonce));

    const base = new Uint8Array(client.length + nonce.length);
    base.set(client, 0);
    base.set(nonce, client.length);

    const msgV2 = new Uint8Array(base.length + 4);
    msgV2.set(base, 0);
    msgV2.set(new Uint8Array([0, 0, 0, 0]), base.length);
    const h2 = await hmacSha256Bytes(key, msgV2);
    const v2 = bytesToHex(h2).toLowerCase();

    const h1 = await hmacSha256Bytes(key, base);
    const v1 = bytesToHex(h1).toLowerCase();

    const stored = (row.first_hmac_hex || "").toLowerCase();

    const matchV2 = stored ? v2 === stored : true;
    const matchV1 = stored ? v1 === stored : false;

    const commit = await sha256HexBytes(hexToBytes(row.server_seed_hex));
    const commitMatch = row.server_seed_hash ? row.server_seed_hash.toLowerCase() === commit.toLowerCase() : true;

    if ((matchV2 || matchV1) && commitMatch) return { kind: "verified" };

    const issues: string[] = [];
    if (!commitMatch) issues.push("Commitment hash mismatch");
    issues.push("HMAC mismatch");
    return { kind: "mismatch", details: issues.join("; "), computed: { hmacHex: matchV2 ? v2 : v1 } };
  } catch (e: any) {
    return { kind: "error", details: e?.message || String(e) };
  }
}

/** ------------------------------------ Component ------------------------------------ */
interface Props {
  /** default filter: 'all' shows everything merged */
  defaultGame?: GameFilter;
  /** items per *page* (client pagination of the merged list) */
  pageSize?: number;
}

export default function HistoryAutoVerify({ defaultGame = "all", pageSize = 10 }: Props) {
  const { publicKey, connected, connecting } = useWallet();

  // Wallet (auto from adapter)
  const [wallet, setWallet] = useState<string>("");
  const [inputWallet, setInputWallet] = useState<string>(""); // read-only when connected

  // Filter + data
  const [game, setGame] = useState<GameFilter>(defaultGame);
  const [items, setItems] = useState<EnrichedRow[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null); // single-game
  const [cursorMap, setCursorMap] = useState<Partial<Record<GameType, number | null>>>({}); // all-games
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string>("");

  // manual panel
  const [manualOpen, setManualOpen] = useState(false);
  const [manualInitial, setManualInitial] = useState<Partial<Record<string, string>>>();
  const [manualGameHint, setManualGameHint] = useState<GameType>("dice");

  const totalPages = useMemo(() => {
    if (!items.length) return 1;
    return Math.max(1, Math.ceil(items.length / pageSize));
  }, [items.length, pageSize]);

  const currentPageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  // debounce copy badge reset
  const copyTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    []
  );

  const copyToClipboard = async (txt: string, key: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      setCopiedKey(key);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedKey(""), 1500);
    } catch {}
  };

  // Auto-bind wallet from wallet adapter
  useEffect(() => {
    if (publicKey) {
      const b58 = publicKey.toBase58();
      setWallet(b58);
      setInputWallet(b58);
    } else {
      setWallet("");
      setInputWallet("");
      setItems([]);
      setNextCursor(null);
      setCursorMap({});
      setPage(1);
    }
  }, [publicKey]);

  const enrichDice = async (r: DiceResolvedRow): Promise<EnrichedRow> => {
    const verify = await autoVerifyDice(r);
    return {
      raw: r,
      display: {
        gameType: "dice",
        result: String(r.roll ?? "-"),
        serverSeed: r.server_seed_hex || null,
        clientSeed: r.client_seed || "",
        nonce: r.nonce,
        hmac: r.first_hmac_hex || null,
        time: fmtTime(r.resolved_at || r.created_at || null),
        timeTs: ts(r.resolved_at || r.created_at || null),
      },
      verify,
    };
  };
  const enrichCoinflip = async (r: CoinflipResolvedRow): Promise<EnrichedRow> => {
    const verify = await autoVerifyCoinflip(r);
    const resultTxt = r.outcome === 0 ? "heads" : "tails";
    const seedsJoined = `${r.client_seed_a || ""}${r.client_seed_a || r.client_seed_b ? " | " : ""}${r.client_seed_b || ""}`;
    return {
      raw: r,
      display: {
        gameType: "coinflip",
        result: resultTxt,
        serverSeed: r.server_seed_hex || null,
        clientSeed: seedsJoined,
        nonce: Number(r.nonce),
        hmac: r.first_hmac_hex || null,
        time: fmtTime(r.resolved_at || r.created_at || null),
        timeTs: ts(r.resolved_at || r.created_at || null),
      },
      verify,
    };
  };
  const enrichCrash = async (r: CrashResolvedRow): Promise<EnrichedRow> => {
    const verify = await autoVerifyCrash(r);
    const resultTxt =
      r.cashout_multiplier_bps && r.cashout_multiplier_bps > 0
        ? `cashout @ ${(r.cashout_multiplier_bps / 10000).toFixed(2)}x`
        : `crashed @ ${Number(r.crash_at_mul).toFixed(2)}x`;
    return {
      raw: r,
      display: {
        gameType: "crash",
        result: resultTxt,
        serverSeed: r.server_seed_hex || null,
        clientSeed: r.client_seed || "",
        nonce: Number(r.nonce),
        hmac: r.first_hmac_hex || null,
        time: fmtTime(r.resolved_at || r.created_at || null),
        timeTs: ts(r.resolved_at || r.created_at || null),
      },
      verify,
    };
  };
  const enrichMines = async (r: MinesResolvedRow): Promise<EnrichedRow> => {
    const verify = await autoVerifyMines(r);
    const bet = Number(r.bet_lamports);
    const payout = Number(r.payout_lamports);
    const resultTxt = payout > 0 && bet > 0 ? `cashout @ ${(payout / bet).toFixed(2)}x` : "boom 💥";
    return {
      raw: r,
      display: {
        gameType: "mines",
        result: resultTxt,
        serverSeed: r.server_seed_hex || null,
        clientSeed: r.client_seed || "",
        nonce: Number(r.nonce),
        hmac: r.first_hmac_hex || null,
        time: fmtTime(r.resolved_at || r.created_at || null),
        timeTs: ts(r.resolved_at || r.created_at || null),
      },
      verify,
    };
  };
  const enrichSlots = async (r: SlotsResolvedRow): Promise<EnrichedRow> => {
    const verify = await autoVerifySlots(r);
    const bet = Number(r.bet_lamports ?? r.bet_amount ?? r.bet_amount_lamports ?? 0);
    const payout = Number(r.payout_lamports ?? r.payout ?? 0);
    const resultTxt = payout > 0 && bet > 0 ? `win @ ${(payout / bet).toFixed(2)}x` : "loss";
    return {
      raw: r,
      display: {
        gameType: "slots",
        result: resultTxt,
        serverSeed: r.server_seed_hex || null,
        clientSeed: r.client_seed || "",
        nonce: Number(r.nonce),
        hmac: r.first_hmac_hex || null,
        time: fmtTime(r.resolved_at || r.created_at || null),
        timeTs: ts(r.resolved_at || r.created_at || null),
      },
      verify,
    };
  };
  const enrichPlinko = async (r: PlinkoResolvedRow): Promise<EnrichedRow> => {
    const verify = await autoVerifyPlinko(r);
    const unit = Number(r.unit_lamports) || 0;
    const payout = Number(r.payout) || 0;
    const mul = unit > 0 ? (payout / unit).toFixed(2) : "—";
    return {
      raw: r,
      display: {
        gameType: "plinko",
        result: `${r.balls} balls → ${mul}x`,
        serverSeed: r.server_seed_hex || null,
        clientSeed: r.client_seed || "",
        nonce: Number(r.nonce),
        hmac: r.first_hmac_hex || null,
        time: fmtTime(r.resolved_at || r.created_at || null),
        timeTs: ts(r.resolved_at || r.created_at || null),
      },
      verify,
    };
  };

  // Fetch + verify depending on filter
  const loadFirstPage = async () => {
    if (!wallet) return;
    setIsLoading(true);
    setPage(1);
    try {
      if (game === "all") {
        // small per-game limit so the merged page isn't massive
        const perGameLimit = Math.max(3, Math.ceil(pageSize / 2));

        const [
          diceRes,
          cfRes,
          crashRes,
          minesRes,
          slotsRes,
          plinkoRes,
        ] = await Promise.all([
          fetchDicePage({ wallet, limit: perGameLimit }),
          fetchCoinflipPage({ wallet, limit: perGameLimit }),
          fetchCrashPage({ wallet, limit: perGameLimit }),
          fetchMinesPage({ wallet, limit: perGameLimit }),
          fetchSlotsPage({ wallet, limit: perGameLimit }),
          fetchPlinkoPage({ wallet, limit: perGameLimit }),
        ]);

        const [
          diceItems,
          cfItems,
          crashItems,
          minesItems,
          slotsItems,
          plinkoItems,
        ] = await Promise.all([
          Promise.all(diceRes.items.map(enrichDice)),
          Promise.all(cfRes.items.map(enrichCoinflip)),
          Promise.all(crashRes.items.map(enrichCrash)),
          Promise.all(minesRes.items.map(enrichMines)),
          Promise.all(slotsRes.items.map(enrichSlots)),
          Promise.all(plinkoRes.items.map(enrichPlinko)),
        ]);

        const merged = [
          ...diceItems,
          ...cfItems,
          ...crashItems,
          ...minesItems,
          ...slotsItems,
          ...plinkoItems,
        ].sort((a, b) => (b.display.timeTs ?? 0) - (a.display.timeTs ?? 0));

        setItems(merged);
        setNextCursor(null); // single nextCursor not used in 'all'
        setCursorMap({
          dice: diceRes.nextCursor,
          coinflip: cfRes.nextCursor,
          crash: crashRes.nextCursor,
          mines: minesRes.nextCursor,
          slots: slotsRes.nextCursor,
          plinko: plinkoRes.nextCursor,
        });
      } else {
        // single game mode
        let enriched: EnrichedRow[] = [];
        if (game === "dice") {
          const { items: rows, nextCursor } = await fetchDicePage({ wallet, limit: pageSize });
          enriched = await Promise.all(rows.map(enrichDice));
          setNextCursor(nextCursor);
        } else if (game === "coinflip") {
          const { items: rows, nextCursor } = await fetchCoinflipPage({ wallet, limit: pageSize });
          enriched = await Promise.all(rows.map(enrichCoinflip));
          setNextCursor(nextCursor);
        } else if (game === "crash") {
          const { items: rows, nextCursor } = await fetchCrashPage({ wallet, limit: pageSize });
          enriched = await Promise.all(rows.map(enrichCrash));
          setNextCursor(nextCursor);
        } else if (game === "mines") {
          const { items: rows, nextCursor } = await fetchMinesPage({ wallet, limit: pageSize });
          enriched = await Promise.all(rows.map(enrichMines));
          setNextCursor(nextCursor);
        } else if (game === "slots") {
          const { items: rows, nextCursor } = await fetchSlotsPage({ wallet, limit: pageSize });
          enriched = await Promise.all(rows.map(enrichSlots));
          setNextCursor(nextCursor);
        } else if (game === "plinko") {
          const { items: rows, nextCursor } = await fetchPlinkoPage({ wallet, limit: pageSize });
          enriched = await Promise.all(rows.map(enrichPlinko));
          setNextCursor(nextCursor);
        }
        setItems(enriched);
        setCursorMap({});
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreAppend = async () => {
    if (!wallet || isRefetching) return;

    // Determine if we have any cursor left to fetch
    const anyCursorLeft =
      game === "all"
        ? Object.values(cursorMap).some((v) => !!v)
        : !!nextCursor;

    if (!anyCursorLeft) return;

    setIsRefetching(true);
    try {
      if (game === "all") {
        const perGameLimit = Math.max(3, Math.ceil(pageSize / 2));
        const updates: EnrichedRow[] = [];
        const newMap: Partial<Record<GameType, number | null>> = { ...cursorMap };

        // helper to fetch & enrich if that game still has a cursor
        const tryFetch = async <T,>(
          key: GameType,
          fn: (args: { wallet: string; limit: number; cursor?: number | null }) => Promise<{ items: T[]; nextCursor: number | null }>,
          enrich: (r: any) => Promise<EnrichedRow>
        ) => {
          const cur = cursorMap[key];
          if (!cur) return;
          const { items: rows, nextCursor } = await fn({ wallet, limit: perGameLimit, cursor: cur });
          const e = await Promise.all(rows.map(enrich));
          updates.push(...e);
          newMap[key] = nextCursor;
        };

        await Promise.all([
          tryFetch("dice", fetchDicePage, enrichDice),
          tryFetch("coinflip", fetchCoinflipPage, enrichCoinflip),
          tryFetch("crash", fetchCrashPage, enrichCrash),
          tryFetch("mines", fetchMinesPage, enrichMines),
          tryFetch("slots", fetchSlotsPage, enrichSlots),
          tryFetch("plinko", fetchPlinkoPage, enrichPlinko),
        ]);

        if (updates.length > 0) {
          const merged = [...items, ...updates].sort((a, b) => (b.display.timeTs ?? 0) - (a.display.timeTs ?? 0));
          setItems(merged);
        }
        setCursorMap(newMap);
      } else {
        if (!nextCursor) return;
        let appended: EnrichedRow[] = [];
        let nc: number | null = null;

        if (game === "dice") {
          const { items: rows, nextCursor: n } = await fetchDicePage({ wallet, limit: pageSize, cursor: nextCursor });
          appended = await Promise.all(rows.map(enrichDice));
          nc = n;
        } else if (game === "coinflip") {
          const { items: rows, nextCursor: n } = await fetchCoinflipPage({ wallet, limit: pageSize, cursor: nextCursor });
          appended = await Promise.all(rows.map(enrichCoinflip));
          nc = n;
        } else if (game === "crash") {
          const { items: rows, nextCursor: n } = await fetchCrashPage({ wallet, limit: pageSize, cursor: nextCursor });
          appended = await Promise.all(rows.map(enrichCrash));
          nc = n;
        } else if (game === "mines") {
          const { items: rows, nextCursor: n } = await fetchMinesPage({ wallet, limit: pageSize, cursor: nextCursor });
          appended = await Promise.all(rows.map(enrichMines));
          nc = n;
        } else if (game === "slots") {
          const { items: rows, nextCursor: n } = await fetchSlotsPage({ wallet, limit: pageSize, cursor: nextCursor });
          appended = await Promise.all(rows.map(enrichSlots));
          nc = n;
        } else if (game === "plinko") {
          const { items: rows, nextCursor: n } = await fetchPlinkoPage({ wallet, limit: pageSize, cursor: nextCursor });
          appended = await Promise.all(rows.map(enrichPlinko));
          nc = n;
        }

        setItems((prev) => prev.concat(appended));
        setNextCursor(nc);
      }
    } finally {
      setIsRefetching(false);
    }
  };

  // Auto-fetch whenever wallet or filter changes
  useEffect(() => {
    if (!wallet) return;
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, game]);

  const openManualForRow = (r: EnrichedRow) => {
    if (isDiceRow(r.raw)) {
      const init: Record<string, string> = {
        serverSeedHex: r.raw.server_seed_hex || "",
        clientSeed: r.raw.client_seed || "",
        nonce: String(r.raw.nonce),
        expectedHmac: r.raw.first_hmac_hex || "",
      };
      setManualGameHint("dice");
      setManualInitial(init);
    } else if (isCoinflipRow(r.raw)) {
      const init: Record<string, string> = {
        serverSeedHex: r.raw.server_seed_hex || "",
        clientSeedA: r.raw.client_seed_a || "",
        clientSeedB: r.raw.client_seed_b || "",
        nonce: String(r.raw.nonce),
        expectedHmac: r.raw.first_hmac_hex || "",
      };
      setManualGameHint("coinflip");
      setManualInitial(init);
    } else if (isCrashRow(r.raw)) {
      const init: Record<string, string> = {
        serverSeedHex: r.raw.server_seed_hex || "",
        clientSeed: r.raw.client_seed || "",
        nonce: String(r.raw.nonce),
        expectedHmac: r.raw.first_hmac_hex || "",
      };
      setManualGameHint("crash");
      setManualInitial(init);
    } else if (isMinesRow(r.raw)) {
      const init: Record<string, string> = {
        serverSeedHex: r.raw.server_seed_hex || "",
        clientSeed: r.raw.client_seed || "",
        nonce: String(r.raw.nonce),
        expectedHmac: r.raw.first_hmac_hex || "",
      };
      setManualGameHint("mines");
      setManualInitial(init);
    } else if (isSlotsRow(r.raw)) {
      const init: Record<string, string> = {
        serverSeedHex: r.raw.server_seed_hex || "",
        clientSeed: r.raw.client_seed || "",
        nonce: String(r.raw.nonce),
        expectedHmac: r.raw.first_hmac_hex || "",
      };
      setManualGameHint("slots");
      setManualInitial(init);
    } else if (isPlinkoRow(r.raw)) {
      const init: Record<string, string> = {
        serverSeedHex: r.raw.server_seed_hex || "",
        clientSeed: r.raw.client_seed || "",
        nonce: String(r.raw.nonce),
        expectedHmac: r.raw.first_hmac_hex || "",
      };
      setManualGameHint("plinko");
      setManualInitial(init);
    } else {
      setManualInitial(undefined);
    }
    setManualOpen(true);
    setTimeout(() => {
      document.getElementById("manual-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const hasMore =
    game === "all" ? Object.values(cursorMap).some(Boolean) : !!nextCursor;

  /** ---------- NEW: helper to color result (win=green, loss=red) ---------- */
  const resultColorClass = (row: EnrichedRow) => {
    // Default neutral
    let win: boolean | null = null;

    if (isDiceRow(row.raw)) {
      const payout = Number(row.raw.payout_lamports || 0);
      win = typeof row.raw.win === "boolean" ? row.raw.win : payout > 0;
    } else if (isCoinflipRow(row.raw)) {
      // Treat as win if this wallet is the winner
      win = !!(row.raw.winner && wallet && row.raw.winner === wallet);
    } else if (isCrashRow(row.raw)) {
      win = Number(row.raw.payout_lamports || 0) > 0;
    } else if (isMinesRow(row.raw)) {
      win = Number(row.raw.payout_lamports || 0) > 0;
    } else if (isSlotsRow(row.raw)) {
      win = Number(row.raw.payout_lamports ?? row.raw.payout ?? 0) > 0;
    } else if (isPlinkoRow(row.raw)) {
      // Consider any payout > 0 as win
      win = Number(row.raw.payout || 0) > 0;
    }

    if (win === true) return "text-green-400";
    if (win === false) return "text-red-400";
    return "text-light"; // fallback if unknown
  };

  return (
    <div className="glass rounded-2xl p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-light flex items-center gap-2">
          <Zap size={24} />
          History (Auto-Verified)
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Wallet field: auto from adapter. Read-only when connected */}
          <div className="relative w-full sm:w-96">
            <input
              value={inputWallet}
              onChange={(e) => setInputWallet(e.target.value)} // ignored when connected
              readOnly={connected}
              placeholder={
                connected ? "Wallet connected" : "Connect wallet to auto-fill, or paste address"
              }
              className={`w-full glass-dark rounded-xl px-4 py-3 pr-11 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none ${
                connected ? "opacity-80 cursor-not-allowed" : ""
              }`}
            />
            {!connected && (
              <button
                onClick={() => inputWallet && setWallet(inputWallet.trim())}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-soft hover:text-neon-pink"
                title="Search history"
              >
                <Search size={18} />
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={game}
              onChange={(e) => setGame(e.target.value as GameFilter)}
              className="glass-dark rounded-xl px-4 py-3 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all" className="bg-background">
                All games
              </option>
              <option value="dice" className="bg-background">
                Dice
              </option>
              <option value="coinflip" className="bg-background">
                Coinflip (PvP)
              </option>
              <option value="crash" className="bg-background">
                Crash
              </option>
              <option value="mines" className="bg-background">
                Mines
              </option>
              <option value="slots" className="bg-background">
                Slots
              </option>
              <option value="plinko" className="bg-background">
                Plinko
              </option>
            </select>
          </div>

          <button
            onClick={loadFirstPage}
            disabled={!wallet || isLoading || connecting}
            className="flex items-center justify-center gap-2 px-4 py-3 glass-dark rounded-xl text-soft hover:text-light transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Connection hint */}
      {!connected && (
        <div className="mb-4 text-sm text-soft">
          Connect your wallet to auto-fill the address (or paste any wallet above). Your list will
          load automatically.
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple/20">
              <th className="text-left py-3 px-4 text-soft font-medium">Game</th>
              <th className="text-left py-3 px-4 text-soft font-medium">Result</th>
              <th className="text-left py-3 px-4 text-soft font-medium">Server Seed</th>
              <th className="text-left py-3 px-4 text-soft font-medium">Client Seed</th>
              <th className="text-left py-3 px-4 text-soft font-medium">Nonce</th>
              <th className="text-left py-3 px-4 text-soft font-medium">HMAC</th>
              <th className="text-left py-3 px-4 text-soft font-medium">Time</th>
              <th className="text-left py-3 px-4 text-soft font-medium">Status</th>
              <th className="text-left py-3 px-4 text-soft font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-soft">
                  <div className="inline-flex items-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Loading…
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && currentPageItems.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-soft">
                  No results
                </td>
              </tr>
            )}

            {!isLoading &&
              currentPageItems.map((row) => {
                const idKey = isDiceRow(row.raw)
                  ? `dice-${row.raw.id}`
                  : isCoinflipRow(row.raw)
                  ? `cf-${row.raw.id}`
                  : isCrashRow(row.raw)
                  ? `cr-${row.raw.id}`
                  : isMinesRow(row.raw)
                  ? `mn-${row.raw.id}`
                  : isSlotsRow(row.raw)
                  ? `sl-${row.raw.id}`
                  : isPlinkoRow(row.raw)
                  ? `pl-${row.raw.id}`
                  : Math.random().toString(36);

                const icon = gameIcons[row.display.gameType];
                const status = row.verify;

                return (
                  <tr key={idKey} className="border-b border-purple/10 hover:bg-purple/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-neon-pink">{icon}</span>
                        <span className="text-light capitalize">{row.display.gameType}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {/* NEW: color result based on win/loss */}
                      <span className={`font-medium ${resultColorClass(row)}`}>{row.display.result}</span>
                    </td>

                    <td className="py-3 px-4">
                      {row.display.serverSeed ? (
                        <div className="flex items-center gap-2">
                          <span className="text-light font-mono text-sm">
                            {truncateHash(row.display.serverSeed)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(row.display.serverSeed!, `server-${idKey}`)}
                            className="text-soft hover:text-neon-pink transition-colors"
                          >
                            {copiedKey === `server-${idKey}` ? <CheckCircle size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-soft text-sm">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-light font-mono text-sm" title={row.display.clientSeed}>
                          {row.display.clientSeed || "—"}
                        </span>
                        {row.display.clientSeed && (
                          <button
                            onClick={() => copyToClipboard(row.display.clientSeed, `client-${idKey}`)}
                            className="text-soft hover:text-neon-pink transition-colors"
                          >
                            {copiedKey === `client-${idKey}` ? <CheckCircle size={14} /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-light font-mono">{row.display.nonce}</span>
                    </td>

                    <td className="py-3 px-4">
                      {row.display.hmac ? (
                        <div className="flex items-center gap-2">
                          <span className="text-light font-mono text-sm">
                            {truncateHash(row.display.hmac)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(row.display.hmac!, `hmac-${idKey}`)}
                            className="text-soft hover:text-neon-pink transition-colors"
                          >
                            {copiedKey === `hmac-${idKey}` ? <CheckCircle size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-soft text-sm">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-soft text-sm">{row.display.time || "—"}</span>
                    </td>

                    <td className="py-3 px-4">
                      {status.kind === "verified" && (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle size={14} />
                          Verified
                        </span>
                      )}
                      {status.kind === "pending" && (
                        <span className="text-yellow-400 flex items-center gap-1">
                          <Loader2 size={14} className="animate-spin" />
                          {status.reason}
                        </span>
                      )}
                      {status.kind === "mismatch" && (
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertTriangle size={14} />
                          {status.details}
                        </span>
                      )}
                      {status.kind === "error" && (
                        <span className="text-red-300 flex items-center gap-1">
                          <AlertTriangle size={14} />
                          {status.details}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => openManualForRow(row)}
                        className="inline-flex items-center gap-2 px-3 py-2 glass-dark rounded-lg text-soft hover:text-light"
                        title="Open manual verification prefilled from this row"
                      >
                        <ScanLine size={14} />
                        Manual verify
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination + "load more" (cursor) */}
      {items.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <TablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
          {!hasMore && <div className="text-center text-soft text-sm">No more results.</div>}
        </div>
      )}

      {/* Manual panel (prefilled from a row) */}
      {manualOpen && (
        <div id="manual-panel" className="mt-10">
          <h3 className="text-lg font-semibold text-light mb-3 flex items-center gap-2">
            <ScanLine size={18} /> Manual Verification (prefilled)
          </h3>
          <ManualVerification gameTypeHint={manualGameHint} initial={manualInitial} />
        </div>
      )}
    </div>
  );
}
