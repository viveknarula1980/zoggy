"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import PlinkoControls from "@/components/plinko/PlinkoControls";
import PlinkoGameArea from "@/components/plinko/PlinkoGameArea";
import SectionAllWins from "@/components/sections/HomeSections/section-all-wins";
import SectionGames from "@/components/sections/HomeSections/section-games";
import plinkoMultipliers from "@/data/plinko-multipliers.json";
import { usdToSol } from "@/utils/currency";

import io, { Socket } from "socket.io-client";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import useToast from "@/utils/hooks/useToast";

// ✅ Same wallet + Smart Vault popup used in Dice
import WalletConnectPopup from "@/components/wallet-connect/WalletConnectPopup";

// Buffer polyfill (browser)
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !(window as any).Buffer) (window as any).Buffer = Buffer;

// ---------- ENV / Program IDs ----------
const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS || "";
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "5vgLU8GyehUkziMaKHCtyPu6YZgo11wct8rTHLdz4z1"
);

const VAULT_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_VAULT_PROGRAM_ID ||
    process.env.NEXT_PUBLIC_PROGRAM_ID ||
    PROGRAM_ID.toBase58()
);

// ---------- UI <-> backend difficulties (order MUST match backend DIFF_KEYS) ----------
// Backend DIFF_KEYS: ["easy","med","hard","harder","insane","extreme"]
const RISK_LEVELS = [
  { ui: "Easy", backend: "easy" },
  { ui: "Med", backend: "med" },
  { ui: "Hard", backend: "hard" },
  { ui: "Harder", backend: "harder" },
  { ui: "Insane", backend: "insane" },
  { ui: "Extreme", backend: "extreme" },
] as const;

const UI_RISKS = RISK_LEVELS.map((r) => r.ui);

// ---------- Helpers ----------
const toLamports = (sol: number) => Math.round(sol * 1e9);
const formatMultiplierLabel = (m: number) =>
  m === 0 ? "0x" : `${m % 1 ? m.toFixed(2) : m.toFixed(0)}x`;

// derive user_vault PDA (same seed & flow as Dice)
const getUserVaultPda = (owner: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("user_vault"), owner.toBuffer()],
    VAULT_PROGRAM_ID
  )[0];

/* --------------------------- ERROR SHORTENING --------------------------- */
/** Turn any backend/SC error + logs into a tiny, friendly message. */
function compactPlinkoError(e: any) {
  const raw = toStringSafe(e);

  // 1) Prefer explicit Anchor message if present
  const anchorLine = findLine(raw, /AnchorError/i);
  const anchorMsg = matchGroup(anchorLine, /Error Message:\s*([^.\n]+(?:\.[^\n]*)?)/i);
  if (anchorMsg) {
    const msg = anchorMsg.trim();
    if (/insufficient/i.test(msg) && /(vault|balance|funds)/i.test(msg)) {
      return "Insufficient coins to play this game.";
    }
    return shorten(msg);
  }

  // 2) Map by custom code (from JSON, text or hex)
  const code =
    extractNumber(raw, /Error Number:\s*(\d+)/i) ??
    extractNumber(raw, /"Custom"\s*:\s*(\d+)/i) ??
    extractHex(raw, /custom program error:\s*0x([0-9a-f]+)/i);
  if (code != null) {
    const friendly = anchorCodeMap(code);
    if (friendly) return friendly;
  }

  // 3) Phrase-based shortcut
  if (/insufficient/i.test(raw) && /(vault|balance|funds)/i.test(raw)) {
    return "Insufficient coins to play this game.";
  }

  // 4) Strip noise and collapse to one-liner
  const cleaned = stripSolanaNoise(raw);
  return shorten(cleaned || "Something went wrong.");
}

function toStringSafe(e: any) {
  if (!e) return "";
  if (typeof e === "string") return e;
  if (typeof e?.message === "string") return e.message;
  try {
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}
function findLine(text: string, pattern: RegExp) {
  return (text || "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => pattern.test(l)) || "";
}
function matchGroup(text: string, rx: RegExp) {
  if (!text) return "";
  const m = rx.exec(text);
  return m?.[1] || "";
}
function extractNumber(text: string, rx: RegExp): number | null {
  const m = rx.exec(text || "");
  return m ? Number(m[1]) : null;
}
function extractHex(text: string, rx: RegExp): number | null {
  const m = rx.exec(text || "");
  if (!m) return null;
  try {
    return parseInt(m[1], 16);
  } catch {
    return null;
  }
}
function anchorCodeMap(code: number): string | null {
  const map: Record<number, string> = {
    6004: "Insufficient coins to play this game.", // InsufficientVault
  };
  return map[code] || null;
}
function stripSolanaNoise(text: string) {
  const lines = (text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Drop compute budget + generic invoke/success chatter
  const drop = [
    /^Program ComputeBudget/i,
    /^Program [1]{32}/i, // System program 111... lines
    /^Program [A-Za-z0-9]{32,} invoke \[\d+\]/,
    /^Program [A-Za-z0-9]{32,} success/i,
    /^Program [A-Za-z0-9]{32,} consumed/i,
    /^Program log:\s*Instruction:/i,
  ];

  const kept = lines.filter((l) => !drop.some((rx) => rx.test(l)));
  // If an "Error Message:" line exists, surface just that
  const msg = matchGroup(kept.join("\n"), /Error Message:\s*([^\n]+)/i);
  if (msg) return msg;
  // Else return first non-noise line
  return kept[0] || "";
}
function shorten(s: string, max = 120) {
  const oneLine = (s || "").replace(/\s+/g, " ").trim();
  return oneLine.length > max ? oneLine.slice(0, max - 1) + "…" : oneLine;
}
/* ---------------------------------------------------------------------- */

export default function PlinkoPage() {
  const router = useRouter();
  const toast = useToast();

  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  // ------- Game UI state -------
  const [betAmount, setBetAmount] = useState(usdToSol(1)); // $1 → SOL
  const [riskLevel, setRiskLevel] = useState<(typeof UI_RISKS)[number]>("Easy");
  const [rows, setRows] = useState(13);
  const [balls, setBalls] = useState(1);
  const [riskIndex, setRiskIndex] = useState(0);

  const [isRequesting, setIsRequesting] = useState(false); // freeze controls while server sets up
  const [isPlaying, setIsPlaying] = useState(false);
  const [dropToken, setDropToken] = useState(0);
  const [totalWin, setTotalWin] = useState(0); // gross SOL display (frontend parity)

  // ------- Smart Vault state (same as Dice) -------
  const [vaultActivated, setVaultActivated] = useState<boolean>(false);
  const [showWalletPopup, setShowWalletPopup] = useState<boolean>(false);

  // ✅ Fake/Promo (no UI indicator; gating + payload flags only)
  const [promoActive, setPromoActive] = useState<boolean>(false);
  const [promoBalanceLamports, setPromoBalanceLamports] = useState<number>(0);

  // Provably Fair Data
  const [provablyFairData, setProvablyFairData] = useState<any>(null);

  // ------- Sockets / Round gates -------
  const socketRef = useRef<Socket | null>(null);
  const nonceRef = useRef<string | null>(null);
  const serverMultisRef = useRef<number[] | null>(null);

  const pendingGrossSolRef = useRef<number | null>(null);
  const resolvedArrivedRef = useRef(false);
  const animDoneRef = useRef(false);
  const displayedThisRoundRef = useRef(false);

  const [serverSlots, setServerSlots] = useState<number[]>([]);
  const [serverSlotsToken, setServerSlotsToken] = useState(0);

  // 🔔 Patch console.error to also toast (dedup within ~1.5s)
  useEffect(() => {
    const origError = console.error;
    const lastMsgRef = { msg: "", t: 0 };
    console.error = (...args: any[]) => {
      try {
        const msg = args.map((x) => (typeof x === "string" ? x : x?.message || JSON.stringify(x))).join(" ");
        const now = Date.now();
        if (msg && (msg !== lastMsgRef.msg || now - lastMsgRef.t > 1500)) {
          if (toast?.gameError) toast.gameError(msg);
          else if (toast?.error) toast.error(msg);
          lastMsgRef.msg = msg;
          lastMsgRef.t = now;
        }
      } catch {}
      origError(...args);
    };
    return () => {
      console.error = origError;
    };
  }, [toast]);

  // ------- Multiplier labels (fallback to JSON if server hasn't sent yet) -------
  const fallbackLabelsFromJSON = useCallback((rowsParam: number, uiRisk: string) => {
    const backendKey = RISK_LEVELS.find((r) => r.ui === uiRisk)?.backend;
    if (!backendKey) return [];

    const rowKey = String(rowsParam);
    const candidates: string[] = [
      backendKey, // "easy"
      uiRisk, // "Med"
      uiRisk === "Med" ? "Medium" : "",
      backendKey[0].toUpperCase() + backendKey.slice(1),
      backendKey.toUpperCase(),
    ].filter(Boolean) as string[];

    for (const key of candidates) {
      const data: any[] | undefined = (plinkoMultipliers as any)?.[key]?.[rowKey];
      if (data && Array.isArray(data) && data.length) {
        return data.map((d: any) => formatMultiplierLabel(Number(d.multiplier)));
      }
    }
    return [];
  }, []);

  const [uiMultiplierLabels, setUiMultiplierLabels] = useState<string[]>(
    fallbackLabelsFromJSON(rows, riskLevel)
  );

  useEffect(() => {
    if (!serverMultisRef.current) {
      setUiMultiplierLabels(fallbackLabelsFromJSON(rows, riskLevel));
    }
  }, [rows, riskLevel, fallbackLabelsFromJSON]);

  // ---------- Promo/fake status via HTTP (no UI badge) ----------
  const fetchPromoStatus = useCallback(
    async (walletBase58: string) => {
      if (!walletBase58 || !API_BASE) {
        setPromoActive(false);
        setPromoBalanceLamports(0);
        return;
      }
      const candidates = [
        `${API_BASE}/admin/fake/status?wallet=${encodeURIComponent(walletBase58)}`,
        `${API_BASE}/fake/status?wallet=${encodeURIComponent(walletBase58)}`,
        `${API_BASE}/users/promo/status?wallet=${encodeURIComponent(walletBase58)}`,
        `${API_BASE}/promo/status?wallet=${encodeURIComponent(walletBase58)}`,
        `${API_BASE}/users/${encodeURIComponent(walletBase58)}/promo-status`,
        `${API_BASE}/users/${encodeURIComponent(walletBase58)}/promo`,
      ];
      for (const url of candidates) {
        try {
          const r = await fetch(url, { credentials: "include" });
          if (!r.ok) continue;
          const j = await r.json().catch(() => null);
          if (!j) continue;

          const isFake = !!(j.isFake ?? j.is_fake);
          const mode = (j.mode ? String(j.mode) : "").toLowerCase();
          const activePromo =
            (typeof j.active === "boolean" && j.active) ||
            (typeof j.promoActive === "boolean" && j.promoActive) ||
            !!j.enabled ||
            !!j.is_active;

          const active = isFake || mode === "fake" || activePromo;

          const bal =
            j.effectiveBalanceLamports ??
            j.promoBalanceLamports ??
            j.balanceLamports ??
            j.promo_balance_lamports ??
            j.balance_lamports ??
            j.balance ??
            0;

          setPromoActive(!!active);
          setPromoBalanceLamports(Number(bal) || 0);
          return;
        } catch {
          // try next
        }
      }
      setPromoActive(false);
      setPromoBalanceLamports(0);
    },
    []
  );

  // ------- Socket wiring -------
  useEffect(() => {
    const s = io(WS_URL, { transports: ["websocket"] });
    socketRef.current = s;

    const register = () => {
      if (publicKey) s.emit("register", { player: publicKey.toBase58() });
    };
    s.on("connect", register);
    if (s.connected) register();

    // All connection-level issues -> compact toast (no inline UI)
    s.on("connect_error", (e) => toast.gameError(compactPlinkoError(e)));
    s.on("reconnect_error", (e) => toast.gameError(compactPlinkoError(e)));
    s.on("disconnect", (reason) => toast.gameError(shorten(`Disconnected: ${reason}`)));
    s.on("plinko:warn", (w: any) => toast.gameError(compactPlinkoError(w)));

    // STEP 1: server confirms lock (no wallet signature required)
    s.on("plinko:locked", async ({ nonce, multipliers, serverSeedHash }) => {
      try {
        // lock labels to server multipliers
        serverMultisRef.current = Array.isArray(multipliers) ? multipliers.map((m: any) => Number(m)) : null;
        if (serverMultisRef.current) {
          setUiMultiplierLabels(serverMultisRef.current.map((m) => formatMultiplierLabel(+m)));
        } else {
          setUiMultiplierLabels(fallbackLabelsFromJSON(rows, riskLevel));
        }

        // reset round gates
        setServerSlots([]);
        setServerSlotsToken((t) => t + 1);
        displayedThisRoundRef.current = false;
        resolvedArrivedRef.current = false;
        animDoneRef.current = false;
        pendingGrossSolRef.current = null;

        nonceRef.current = String(nonce);

        // provably-fair: show commitment immediately
        setProvablyFairData({
          dicereveal_seed: {
            nonce: String(nonce),
            clientSeed: "web-ui",
            serverSeedHashed: serverSeedHash,
            serverSeedHex: undefined,
            hmacHex: undefined,
            formula:
              "HMAC_SHA256(serverSeed, clientSeed + nonce) -> RNG stream (makeRng) used to pick slots per ball",
          },
        });

        // start physics & ask server to tick/resolve
        setIsRequesting(false);
        setIsPlaying(true);
        setDropToken((t) => t + 1);

        s.emit("plinko:start_run", { nonce });
      } catch (err: any) {
        toast.gameError(compactPlinkoError(err));
        setIsRequesting(false);
        setIsPlaying(false);
        nonceRef.current = null;
        serverMultisRef.current = null;
      }
    });

    // server authoritative ticks -> enqueue slot indices
    s.on("plinko:tick", ({ nonce: n, slotIndex }) => {
      if (!nonceRef.current || String(n) !== String(nonceRef.current)) return;
      setServerSlots((prev) => [...prev, Number(slotIndex)]);
      setServerSlotsToken((t) => t + 1);
    });

    // STEP 2: resolution (gross used for UI)
    s.on("plinko:resolved", async ({ nonce: n, grossLamports }) => {
      if (!nonceRef.current || String(n) !== String(nonceRef.current)) return;

      const grossSol = Number(grossLamports || 0) / 1e9;
      pendingGrossSolRef.current = grossSol;
      resolvedArrivedRef.current = true;

      if (animDoneRef.current && !displayedThisRoundRef.current) {
        setTotalWin(grossSol);
        displayedThisRoundRef.current = true;
        setIsPlaying(false);
        nonceRef.current = null;
        serverMultisRef.current = null;
      }
    });

    // Provably-fair reveal AFTER resolve
    s.on(
      "plinko:reveal_seed",
      ({ nonce, serverSeedHex, serverSeedHash, clientSeed, firstHmacHex, formula }) => {
        setProvablyFairData({
          dicereveal_seed: {
            nonce: String(nonce),
            clientSeed: String(clientSeed || "web-ui"),
            serverSeedHashed: serverSeedHash,
            serverSeedHex: serverSeedHex || undefined,
            hmacHex: firstHmacHex || undefined, // ✅ enables “Expected HMAC” autofill
            formula: formula || "HMAC_SHA256(serverSeed, clientSeed + nonce)",
          },
        });
      }
    );

    s.on("plinko:error", (e) => {
      // ✅ Backend / Smart-contract error — ALWAYS compact toast
      toast.gameError(compactPlinkoError(e));
      setIsRequesting(false);
      setIsPlaying(false);
      nonceRef.current = null;
      serverMultisRef.current = null;
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, fallbackLabelsFromJSON, riskLevel, rows]);

  // Re-register + refresh promo when wallet changes
  useEffect(() => {
    if (socketRef.current && publicKey) {
      socketRef.current.emit("register", { player: publicKey.toBase58() });
    }
    if (publicKey?.toBase58()) fetchPromoStatus(publicKey.toBase58());
    else {
      setPromoActive(false);
      setPromoBalanceLamports(0);
    }
  }, [publicKey, fetchPromoStatus]);

  // ------- Vault existence check (skip when promoActive) -------
  useEffect(() => {
    (async () => {
      try {
        if (!connected || !publicKey) {
          setVaultActivated(false);
          return;
        }
        if (promoActive) {
          // In fake/promo mode, skip PDA checks entirely (server will use promo path)
          setVaultActivated(true);
          return;
        }
        const uv = getUserVaultPda(publicKey);
        const ai = await connection.getAccountInfo(uv, "confirmed");
        setVaultActivated(!!ai);
      } catch (e) {
        setVaultActivated(false);
        toast.gameError(compactPlinkoError(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, connection, promoActive]);

  const refreshVaultStatus = useCallback(async () => {
    try {
      if (!connected || !publicKey) return false;
      if (promoActive) {
        setVaultActivated(true);
        return true;
      }
      const uv = getUserVaultPda(publicKey);
      const ai = await connection.getAccountInfo(uv, "confirmed");
      const exists = !!ai;
      setVaultActivated(exists);
      return exists;
    } catch (e) {
      toast.gameError(compactPlinkoError(e));
      return false;
    }
  }, [connected, publicKey, connection, toast, promoActive]);

  // 🔎 VAULT balance (lamports) before play. In promo, we use promo balance.
  const getAvailableLamports = useCallback(async () => {
    if (!connected || !publicKey) return 0;
    if (promoActive) return Number(promoBalanceLamports) || 0;
    const uv = getUserVaultPda(publicKey);
    try {
      return await connection.getBalance(uv, "confirmed");
    } catch (e) {
      toast.gameError(compactPlinkoError(e));
      return 0;
    }
  }, [connected, publicKey, connection, toast, promoActive, promoBalanceLamports]);

  // ------- Actions -------
  const handleDropBalls = useCallback(async () => {
    // ✅ gate by wallet + (vault OR promo-active)
    const ready = !!publicKey && connected && (vaultActivated || promoActive);
    if (!ready) {
      setShowWalletPopup(true);
      return;
    }

    setIsRequesting(true); // freeze UI immediately

    try {
      const unit = toLamports(betAmount);
      const total = unit * balls;

      const available = await getAvailableLamports();
      if (available < total) {
        toast.gameError(`Insufficient coins to play this game.`);
        setIsRequesting(false);
        return;
      }
    } catch {
      // continue; backend validates too
    }

    // Backend diff index == our risk index (orders MATCH 1:1)
    const diffForBackend = riskIndex;

    socketRef.current?.emit("plinko:prepare_lock", {
      player: publicKey!.toBase58(),
      unitLamports: toLamports(betAmount),
      balls,
      rows,
      diff: diffForBackend,
      clientSeed: "web-ui",

      // ✅ When fake/promo balance is active, tell backend to skip bonus/welcome guards
      ...(promoActive
        ? {
            isFake: true,
            mode: "fake",
            usePromo: true,
            skipBonusGuard: true,
            skipWelcomeBonusGuard: true,
            effectiveBalanceLamports: Number(promoBalanceLamports) || 0,
          }
        : {}),
    });
  }, [
    connected,
    publicKey,
    vaultActivated,
    promoActive,
    betAmount,
    balls,
    rows,
    riskIndex,
    toast,
    getAvailableLamports,
    promoBalanceLamports,
  ]);

  return (
    <div className="min-h-screen bg-background pt-10">
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-6 px-4">
          <button
            onClick={() => router.push("/classics")}
            className="flex items-center gap-2 text-light hover:text-neon-pink transition-colors duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Back to Classics</span>
          </button>
        </div>

        {/* ❗ No inline error UI — all errors are shown via toasts only */}

        <div className="flex flex-col-reverse lg:flex-row gap-4">
          <PlinkoControls
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            riskLevel={riskLevel}
            setRiskLevel={(lvl) => {
              setRiskLevel(lvl as any);
              const idx = UI_RISKS.indexOf(lvl as any);
              if (idx >= 0) setRiskIndex(idx);
            }}
            riskIndex={riskIndex}
            setRiskIndex={(idx) => {
              setRiskIndex(idx);
              setRiskLevel(UI_RISKS[idx] as any);
            }}
            rows={rows}
            setRows={setRows}
            balls={balls}
            setBalls={setBalls}
            isPlaying={isPlaying}
            totalWin={totalWin}
            onDropBalls={handleDropBalls}
            // Keep the button enabled so clicking triggers gating & popup.
            isWalletReady={true}
            // Freeze while requesting
            isRequesting={isRequesting}
            provablyFairData={provablyFairData}
          />

          <PlinkoGameArea
            multipliers={uiMultiplierLabels}
            rows={rows}
            riskLevel={riskLevel}
            balls={balls}
            isPlaying={isPlaying}
            dropToken={dropToken}
            onBallLanded={() => {}}
            onRunComplete={() => {
              animDoneRef.current = true;
              if (resolvedArrivedRef.current && !displayedThisRoundRef.current) {
                const gross = pendingGrossSolRef.current ?? 0;
                setTotalWin(gross);
                displayedThisRoundRef.current = true;
                setIsPlaying(false);
                nonceRef.current = null;
                serverMultisRef.current = null;
              }
            }}
            serverSlots={serverSlots}
            serverSlotsToken={serverSlotsToken}
            betAmount={betAmount}
            totalWin={totalWin}
          />
        </div>

        <div className="mt-8">
          <SectionAllWins />
        </div>

        <div className="mt-8">
          <SectionGames />
        </div>
      </div>

      {/* ✅ Same popup as Dice; opens when needed */}
      <WalletConnectPopup
        isOpen={showWalletPopup}
        onClose={async () => {
          setShowWalletPopup(false);
          // refresh vault status and promo status so the next click can proceed
          await refreshVaultStatus();
          if (publicKey?.toBase58()) await fetchPromoStatus(publicKey.toBase58());
        }}
      />
    </div>
  );
}
