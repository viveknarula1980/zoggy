"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import io, { Socket } from "socket.io-client";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";

import CoinflipControls from "@/components/coinflip/CoinflipControls";
import CoinflipGameArea from "@/components/coinflip/CoinflipGameArea";
import SectionAllWins from "@/components/sections/HomeSections/section-all-wins";
import SectionGames from "@/components/sections/HomeSections/section-games";
import { usdToSol } from "@/utils/currency";
import useToast from "@/utils/hooks/useToast";
import { useGameSounds, COINFLIP_SOUNDS } from "@/hooks/useGameSounds";

// ✅ same popup used in Dice/Slots
import WalletConnectPopup from "@/components/wallet-connect/WalletConnectPopup";

// Buffer polyfill
if (typeof window !== "undefined" && !(window as any).Buffer) (window as any).Buffer = Buffer;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_WS || "";
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet").toLowerCase(); // "mainnet" | "devnet" | "testnet"

// Use the SAME program id you’re using elsewhere
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "5vgLU8GyehUkziMaKHCtyPu6YZgo11wct8rTHLdz4z1"
);

type GameResults = {
  results: ("heads" | "tails")[];
  isWin: boolean;
  winAmount: number;
  totalFlips: number;
} | null;

// 🔧 more deterministic lamports conversion to avoid float drift between clients
function toLamports(sol: number) {
  const fixed = Number(sol.toFixed(9)); // clamp to 9 decimals (1 lamport precision)
  return Math.round(fixed * 1e9);
}

function getUserVaultPda(pk: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("user_vault"), pk.toBuffer()], PROGRAM_ID)[0];
}
function cryptoRandomSeed() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const a = new Uint8Array(16);
    window.crypto.getRandomValues(a);
    return Array.from(a).map((n) => n.toString(16).padStart(2, "0")).join("");
  }
  return Math.floor(Math.random() * 1e16).toString(16);
}
const sideNumFromLabel = (s: "heads" | "tails"): 0 | 1 => (s === "heads" ? 0 : 1);
const sideLabelFromNum = (n: number): "heads" | "tails" => (Number(n) === 0 ? "heads" : "tails");
function short(s: string, head = 6, tail = 6) {
  return s?.length > head + tail ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;
}

/* --------------------------- ERROR SHORTENING --------------------------- */
function compactFlipError(e: unknown) {
  const raw = toStringSafe(e);
  const anchorLine = findLine(raw, /AnchorError/i);
  const anchorMsg = matchGroup(anchorLine, /Error Message:\s*([^.\n]+(?:\.[^\n]*)?)/i);
  if (anchorMsg) {
    const msg = anchorMsg.trim();
    if (/insufficient/i.test(msg) && /(vault|balance|funds)/i.test(msg)) {
      return "Insufficient coins to play this game.";
    }
    return shorten(msg);
  }
  const code =
    extractNumber(raw, /Error Number:\s*(\d+)/i) ??
    extractNumber(raw, /"Custom"\s*:\s*(\d+)/i) ??
    extractHex(raw, /custom program error:\s*0x([0-9a-f]+)/i);
  if (code != null) {
    const friendly = anchorCodeMap(code);
    if (friendly) return friendly;
  }
  if (/insufficient/i.test(raw) && /(vault|balance|funds)/i.test(raw)) {
    return "Insufficient coins to play this game.";
  }
  const cleaned = stripSolanaNoise(raw);
  return shorten(cleaned || "Something went wrong.");
}
function toStringSafe(e: unknown) {
  if (!e) return "";
  if (typeof e === "string") return e;
  if (typeof (e as any)?.message === "string") return (e as any).message;
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
  const drop = [
    /^Program ComputeBudget/i,
    /^Program [1]{32}/i,
    /^Program [A-Za-z0-9]{32,} invoke \[\d+\]/,
    /^Program [A-Za-z0-9]{32,} success/i,
    /^Program [A-Za-z0-9]{32,} consumed/i,
    /^Program log:\s*Instruction:/i,
  ];
  const kept = lines.filter((l) => !drop.some((rx) => rx.test(l)));
  const msg = matchGroup(kept.join("\n"), /Error Message:\s*([^\n]+)/i);
  if (msg) return msg;
  return kept[0] || "";
}
function shorten(s: string, max = 120) {
  const oneLine = (s || "").replace(/\s+/g, " ").trim();
  return oneLine.length > max ? oneLine.slice(0, max - 1) + "…" : oneLine;
}
/* ---------------------------------------------------------------------- */

// ---- base stringify (used in a couple small spots) ----
function stringifyError(e: unknown) {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  const anyE = e as any;
  if (anyE?.message && anyE?.code) return `[${anyE.code}] ${anyE.message}`;
  if (anyE?.message) return anyE.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

/** ===========================================
 * Provably Fair payload we pass to the modal.
 * Include coinflip A/B when revealed so the modal
 * can correctly infer gameType="coinflip".
 * =========================================== */
type PFModalData = {
  dicereveal_seed?: {
    nonce: string;
    clientSeed: string;
    formula: string;
    serverSeedHashed: string; // commitment (SHA-256(serverSeedHex))
    serverSeedHex?: string; // revealed after resolve
    hmacHex?: string; // optional HMAC(serverSeed, clientSeedA+'|'+clientSeedB+'|'+nonce)
    // coinflip-specific (allow inference + prefill)
    clientSeedA?: string;
    clientSeedB?: string;
    firstHmacHex?: string;
  };
} | null;

export default function CoinflipPage() {
  const router = useRouter();
  const toast = useToast();

  // Initialize game sounds
  const { soundsEnabled, toggleSounds, playSound, playLoungeSoundLoop, stopLoungeSound } =
    useGameSounds(COINFLIP_SOUNDS);

  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const player = useMemo(() => publicKey?.toBase58() ?? "", [publicKey]);

  // --- game state (no inline error UI; errors go to toast) ---
  const [betAmount, setBetAmount] = useState(usdToSol(1)); // $1 USD -> SOL
  const [pickedSide, setPickedSide] = useState<"heads" | "tails">("heads");
  const sideNum = useMemo<0 | 1>(() => sideNumFromLabel(pickedSide), [pickedSide]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [gameResults, setGameResults] = useState<GameResults>(null);
  const [serverOutcome, setServerOutcome] = useState<"heads" | "tails" | null>(null);
  const [playWithBot, setPlayWithBot] = useState(false);

  // wallet+vault / promo gating
  const [vaultActivated, setVaultActivated] = useState<boolean>(false);
  const [vaultBalanceLamports, setVaultBalanceLamports] = useState<number>(0);
  const [showWalletPopup, setShowWalletPopup] = useState<boolean>(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [provablyFairData, setProvablyFairData] = useState<PFModalData>(null);

  // ✅ Promo/fake mode (logic only; no UI)
  const [promoActive, setPromoActive] = useState<boolean>(false);
  const [promoBalanceLamports, setPromoBalanceLamports] = useState<number>(0);

  // 🚫 ban flag – used only to disable controls, no UI changes
  const [isBanned, setIsBanned] = useState(false);

  // Lounge sound management - play when idle, stop when playing
  useEffect(() => {
    if (!isPlaying && !isFlipping && !gameResults && soundsEnabled) {
      // Game is idle, play lounge sound
      const timer = setTimeout(() => {
        playLoungeSoundLoop();
      }, 1000); // Small delay to avoid conflicts
      return () => clearTimeout(timer);
    } else {
      // Game is active or has results, stop lounge sound
      stopLoungeSound();
    }
  }, [isPlaying, isFlipping, gameResults, soundsEnabled, playLoungeSoundLoop, stopLoungeSound]);

  // WS + round refs
  const socketRef = useRef<Socket | null>(null);
  const mySideRef = useRef<0 | 1>(0);
  const nonceRef = useRef<string | null>(null);
  const lastClientSeedRef = useRef<string>(""); // ✅ remember the seed we sent
  const suppressDisconnectToastRef = useRef(false);

  // ⏱️ Timing refs for performance measurement
  const requestStartTimeRef = useRef<number>(0);
  const queuedTimeRef = useRef<number>(0);
  const startingTimeRef = useRef<number>(0);

  // 🔁 Track playWithBot inside WS handlers
  const playWithBotRef = useRef(false);
  useEffect(() => {
    playWithBotRef.current = playWithBot;
  }, [playWithBot]);

  // -------- vault existence + balance (skipped in promo) --------
  useEffect(() => {
    (async () => {
      try {
        if (!connected || !publicKey) {
          setVaultActivated(false);
          setVaultBalanceLamports(0);
          return;
        }
        if (promoActive) {
          // In promo mode, **skip PDA guard completely**
          setVaultActivated(true);
          setVaultBalanceLamports(0);
          return;
        }
        const uv = getUserVaultPda(publicKey);
        const acc = await connection.getAccountInfo(uv, "confirmed");
        setVaultActivated(!!acc);

        const bal = await connection.getBalance(uv, "confirmed");
        setVaultBalanceLamports(bal);
      } catch (e) {
        setVaultActivated(false);
        setVaultBalanceLamports(0);
        toast.gameError(compactFlipError(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, connection, promoActive]);

  const refreshVaultStatus = async () => {
    try {
      if (!connected || !publicKey) {
        setVaultActivated(false);
        setVaultBalanceLamports(0);
        return false;
      }
      if (promoActive) {
        // ✅ When promo is active, pretend vault is fine; we won't use it.
        setVaultActivated(true);
        setVaultBalanceLamports(0);
        return true;
      }
      const uv = getUserVaultPda(publicKey);
      const acc = await connection.getAccountInfo(uv, "confirmed");
      const exists = !!acc;
      setVaultActivated(exists);

      const bal = await connection.getBalance(uv, "confirmed");
      setVaultBalanceLamports(bal);

      return exists;
    } catch (e) {
      toast.gameError(compactFlipError(e));
      return false;
    }
  };

  // --------------- Promo/Fake status (HTTP probe) ---------------
  const fetchPromoStatus = useCallback(
    async (walletBase58: string) => {
      if (!walletBase58) {
        setPromoActive(false);
        setPromoBalanceLamports(0);
        return;
      }
      const candidates = API_BASE
        ? [
            // prefer fake-mode endpoints
            `${API_BASE}/admin/fake/status?wallet=${encodeURIComponent(walletBase58)}`,
            `${API_BASE}/fake/status?wallet=${encodeURIComponent(walletBase58)}`,
            // legacy promo endpoints
            `${API_BASE}/users/promo/status?wallet=${encodeURIComponent(walletBase58)}`,
            `${API_BASE}/promo/status?wallet=${encodeURIComponent(walletBase58)}`,
            `${API_BASE}/users/${encodeURIComponent(walletBase58)}/promo-status`,
            `${API_BASE}/users/${encodeURIComponent(walletBase58)}/promo`,
          ]
        : [];

      for (const url of candidates) {
        try {
          const r = await fetch(url, { credentials: "include" });
          if (!r.ok) continue;
          const j = await r.json().catch(() => null);
          if (!j) continue;

          // Normalize: treat isFake true or mode:'fake' as active too
          const isFake = !!(j.isFake ?? j.is_fake);
          const mode = (j.mode ? String(j.mode) : "").toLowerCase();
          const activePromo =
            (typeof j.active === "boolean" && j.active) ||
            (typeof j.promoActive === "boolean" && j.promoActive) ||
            !!j.enabled ||
            !!j.is_active;

          const active = isFake || mode === "fake" || activePromo;

          // Prefer effectiveBalanceLamports if present
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
          /* try next */
        }
      }
      // default: not active
      setPromoActive(false);
      setPromoBalanceLamports(0);
    },
    []
  );

  // React to wallet change
  useEffect(() => {
    if (player) fetchPromoStatus(player);
    else {
      setPromoActive(false);
      setPromoBalanceLamports(0);
    }
  }, [player, fetchPromoStatus]);

  // ---------------- WebSocket ----------------
  useEffect(() => {
    const s = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = s;

    const registerIfReady = () => {
      if (player) s.emit("register", { player });
    };

    // socket lifecycle — show only compact errors
    s.on("connect_error", (err: unknown) => {
      toast.gameError(compactFlipError(err));
    });
    s.io.on("error", (err: unknown) => {
      toast.gameError(compactFlipError(err));
    });
    s.on("reconnect_error", (err: unknown) => {
      toast.gameError(compactFlipError(err));
    });
    s.on("disconnect", (reason) => {
      // 🧩 avoid duplicate toast when ban causes disconnect
      if (suppressDisconnectToastRef.current) {
        suppressDisconnectToastRef.current = false;
        return;
      }

      toast.gameError(shorten(`Disconnected: ${reason}`));
      setShowLoader(false);
      setIsFlipping(false);
    });

    // 🚫 handle user ban from backend (toast + disable buttons, no extra UI)
    s.on("error", (data: any) => {
      const msg = typeof data === "object" ? data?.error || data?.message : data;
      if (msg && msg.toLowerCase().includes("banned")) {
        suppressDisconnectToastRef.current = true;
        setIsBanned(true);
        setIsPlaying(false);
        setIsFlipping(false);
        setIsButtonDisabled(true);
        toast.gameError("🚫 You have been banned from this platform.");
        setTimeout(() => s.disconnect(), 150);
        return;
      }
      if (msg) toast.gameError(msg);
    });

    s.on("coinflip:error", (data: any) => {
      const msg = typeof data === "object" ? data?.error || data?.message : data;
      if (msg && msg.toLowerCase().includes("banned")) {
        suppressDisconnectToastRef.current = true;
        setIsBanned(true);
        setIsPlaying(false);
        setIsFlipping(false);
        setIsButtonDisabled(true);
        toast.gameError("🚫 You have been banned from this platform.");
        setTimeout(() => s.disconnect(), 150);
        return;
      }

      toast.gameError(compactFlipError(msg));
      setShowLoader(false);
      setIsPlaying(false);
      setIsFlipping(false);
      setServerOutcome(null);
      nonceRef.current = null;
      setIsButtonDisabled(false);
    });

    s.on("connect", registerIfReady);
    registerIfReady();

    // Optional: backend may ACK with promo/fake status right after register
    s.on(
      "register:ack",
      (
        payload: {
          promoActive?: boolean;
          promoBalanceLamports?: number;
          effectiveBalanceLamports?: number;
        } = {}
      ) => {
        if (typeof payload.promoActive === "boolean") setPromoActive(payload.promoActive);
        const bal =
          typeof payload.effectiveBalanceLamports !== "undefined"
            ? payload.effectiveBalanceLamports
            : payload.promoBalanceLamports;
        if (typeof bal !== "undefined") setPromoBalanceLamports(Number(bal) || 0);
      }
    );

    // Ask for promo status via WS (if supported)
    if (player) s.emit("promo:status", { player });
    s.on(
      "promo:status",
      (
        payload: {
          active?: boolean;
          balanceLamports?: number;
          effectiveBalanceLamports?: number;
        } = {}
      ) => {
        if (typeof payload.active === "boolean") setPromoActive(payload.active);
        const bal =
          typeof payload.effectiveBalanceLamports !== "undefined"
            ? payload.effectiveBalanceLamports
            : payload.balanceLamports;
        if (typeof bal !== "undefined") setPromoBalanceLamports(Number(bal) || 0);
      }
    );
    // Live promo/fake balance updates from server (optional)
    s.on(
      "promo:update",
      (
        payload: {
          active?: boolean;
          balanceLamports?: number;
          effectiveBalanceLamports?: number;
        } = {}
      ) => {
        if (typeof payload.active === "boolean") setPromoActive(payload.active);
        const bal =
          typeof payload.effectiveBalanceLamports !== "undefined"
            ? payload.effectiveBalanceLamports
            : payload.balanceLamports;
        if (typeof bal !== "undefined") setPromoBalanceLamports(Number(bal) || 0);
      }
    );
    s.on(
      "promo:balance",
      (
        payload: {
          balanceLamports?: number;
          effectiveBalanceLamports?: number;
        } = {}
      ) => {
        const bal =
          typeof payload.effectiveBalanceLamports !== "undefined"
            ? payload.effectiveBalanceLamports
            : payload.balanceLamports;
        if (typeof bal !== "undefined") setPromoBalanceLamports(Number(bal) || 0);
      }
    );

    // You're queued (server-driven animation)
    s.on("coinflip:queued", () => {
      const now = Date.now();
      const responseTime = now - requestStartTimeRef.current;
      console.log(
        `⏱️ QUEUED RESPONSE at ${new Date().toISOString()} (${now}) - Response time: ${responseTime}ms`
      );

      // 🚫 Bot mode: ignore queued state (no loader, no reset)
      if (playWithBotRef.current) {
        console.log("[coinflip] queued ignored (bot mode)");
        return;
      }

      setIsPlaying(true);
      setIsFlipping(false);
      setShowLoader(true); // show loader only by server signal
      setServerOutcome(null);
      // ❌ no local timeout — server will tell us when to stop
    });

    // Matched
    s.on("coinflip:matched", ({ nonce }: { nonce: string | number }) => {
      nonceRef.current = String(nonce);
    });

    // Locked (captures serverSeedHash commitment)
    s.on(
      "coinflip:locked",
      ({
        nonce,
        txSig: _txSig,
        role: _role,
        serverSeedHash,
      }: { nonce: string | number; txSig: string; role?: "A" | "B"; serverSeedHash?: string }) => {
        nonceRef.current = String(nonce);

        setProvablyFairData({
          dicereveal_seed: {
            nonce: String(nonce),
            clientSeed: lastClientSeedRef.current || "",
            formula:
              "HMAC_SHA256(serverSeed, clientSeedA + '|' + clientSeedB + '|' + nonce) -> first byte & 1 = outcome",
            serverSeedHashed: serverSeedHash || "",
            serverSeedHex: "",
            hmacHex: "",
          },
        });
      }
    );

    // Start animation — server decides
    s.on("coinflip:starting", ({ nonce, outcome }: { nonce: string | number; outcome: number }) => {
      if (String(nonce) !== nonceRef.current) return;

      const now = Date.now();
      const totalTime = now - requestStartTimeRef.current;
      console.log(
        `⏱️ STARTING ANIMATION at ${new Date().toISOString()} (${now}) - Total time: ${totalTime}ms`
      );

      setServerOutcome(sideLabelFromNum(outcome));
      setShowLoader(false); // server says start: hide queue loader now
      setIsFlipping(true);
    });

    // Reveal provably-fair seed + HMAC
    s.on(
      "coinflip:reveal_seed",
      ({
        nonce,
        serverSeedHex,
        serverSeedHash,
        clientSeedA,
        clientSeedB,
        formula,
        firstHmacHex,
      }: {
        nonce: string | number;
        serverSeedHex: string;
        serverSeedHash?: string;
        clientSeedA?: string;
        clientSeedB?: string;
        formula?: string;
        firstHmacHex?: string;
      }) => {
        setProvablyFairData((prev) => {
          const prevSeed = prev?.dicereveal_seed;
          return {
            dicereveal_seed: {
              nonce: String(nonce),
              clientSeed: lastClientSeedRef.current || prevSeed?.clientSeed || "",
              formula:
                formula ??
                prevSeed?.formula ??
                "HMAC_SHA256(serverSeed, clientSeedA + '|' + clientSeedB + '|' + nonce) -> first byte & 1 = outcome",
              serverSeedHashed: prevSeed?.serverSeedHashed || serverSeedHash || "",
              serverSeedHex,
              hmacHex: firstHmacHex || prevSeed?.hmacHex || "",
              clientSeedA,
              clientSeedB,
              firstHmacHex: firstHmacHex,
            },
          };
        });
      }
    );

    // Resolved
    s.on(
      "coinflip:resolved",
      ({
        nonce,
        outcome,
        payoutLamports,
      }: { nonce: string | number; outcome: number; payoutLamports: number }) => {
        if (String(nonce) !== nonceRef.current) return;

        const didWin = Number(outcome) === Number(mySideRef.current);
        const winSol = didWin ? Number(payoutLamports || 0) / LAMPORTS_PER_SOL : 0;
        const outcomeStr = sideLabelFromNum(outcome);

        setGameResults({
          results: [outcomeStr],
          isWin: didWin,
          winAmount: winSol,
          totalFlips: 1,
        });

        if (promoActive && player) fetchPromoStatus(player);

        setShowLoader(false); // ensure loader off by server end
        setIsFlipping(false);
        setIsPlaying(false);
        setServerOutcome(null);
        nonceRef.current = null;
        setIsButtonDisabled(false);
      }
    );

    // Backend / Smart-contract error (fallback handler)
    s.on("coinflip:error", (e: unknown) => {
      toast.gameError(compactFlipError(e));
      setShowLoader(false); // server-driven loader off on error
      setIsPlaying(false);
      setIsFlipping(false);
      setServerOutcome(null);
      nonceRef.current = null;
      setIsButtonDisabled(false);
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, promoActive, fetchPromoStatus]);

  // ---------------- Actions (errors only in toasts) ----------------
  const onStartGame = useCallback(async () => {
    if (isBanned) return; // 🔒 ignore clicks when banned

    setGameResults(null);
    setServerOutcome(null);
    setProvablyFairData(null); // clear PF data for new round

    // Wallet presence only (identity)
    if (!connected || !publicKey) {
      setShowWalletPopup(true);
      return;
    }

    // Guarding logic
    if (!promoActive) {
      const exists = await refreshVaultStatus();
      if (!exists) {
        setShowWalletPopup(true);
        return;
      }
    }

    try {
      const entryLamports = toLamports(betAmount);
      if (entryLamports <= 0) throw new Error("Bet must be greater than 0");

      // 🔍 helpful debug: see exactly what we send for matching
      console.log("[coinflip] join", {
        player: publicKey.toBase58(),
        betAmount,
        entryLamports,
        side: sideNum,
        promoActive,
        playWithBot,
      });

      // Hard check with effective/promo balance (client-side safety)
      const have = promoActive ? promoBalanceLamports : vaultBalanceLamports;
      if (have < entryLamports) {
        toast.gameError(`Insufficient ${promoActive ? "promo " : ""}coins to play this game.`);
        return;
      }

      mySideRef.current = sideNum;
      setIsPlaying(true);
      setIsFlipping(false);
      // ❌ do NOT set loader here; wait for server "queued" (except bot mode override)
      setIsButtonDisabled(true);

      const clientSeed = cryptoRandomSeed();
      lastClientSeedRef.current = clientSeed;

      // Log request start time
      console.log(`⏱️ REQUEST SENT at ${new Date().toISOString()} (${Date.now()})`);
      requestStartTimeRef.current = Date.now();

      socketRef.current?.emit("coinflip:join", {
        player: publicKey.toBase58(),
        side: sideNum,
        entryLamports,
        clientSeed, // used for PF reveal
        playWithBot: !!playWithBot,
        usePromo: !!promoActive,
        ...(promoActive
          ? {
              isFake: true,
              mode: "fake",
              effectiveBalanceLamports: Number(promoBalanceLamports) || 0,
            }
          : {}),
      });

      // ⚡ INSTANT ANIMATION WHEN PLAYING WITH BOT
      if (playWithBot) {
        setShowLoader(false); // make sure no loader shows
        setIsFlipping(true); // start animation immediately

        // temporary predicted result for the animation
        const predicted = Math.random() < 0.5 ? "heads" : "tails";
        setServerOutcome(predicted);
      }
    } catch (e) {
      toast.gameError(compactFlipError(e));
      setShowLoader(false);
      setIsPlaying(false);
      setIsFlipping(false);
      setIsButtonDisabled(false);
      setServerOutcome(null);
    }
  }, [
    connected,
    publicKey,
    betAmount,
    sideNum,
    playWithBot,
    toast,
    vaultBalanceLamports,
    promoActive,
    promoBalanceLamports,
    isBanned,
  ]);

  const onCashOut = () => {
    // local cancel only; buttons already disabled when banned
    setIsPlaying(false);
    setIsFlipping(false);
    setServerOutcome(null);
    setGameResults(null);
    setIsButtonDisabled(false);
  };

  const calculateWinProbability = () => 50;

  const resetGame = () => {
    setGameResults(null);
    setIsPlaying(false);
    setIsFlipping(false);
    setShowLoader(false);
    setServerOutcome(null);
    setIsButtonDisabled(false);
  };

  const clearResults = () => {
    setGameResults(null);
  };

  // ❌ Don’t disable on !connected — let onStartGame handle popup gating
  const finalButtonDisabled = isButtonDisabled || isPlaying || isFlipping || isBanned;

  return (
    <div className="min-h-screen bg-background pt-4 md:pt-10">
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-4 sm:mb-6 px-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
          <button
            onClick={() => router.push("/classics")}
            className="flex items-center gap-2 text-light hover:text-neon-pink transition-colors duration-200 group"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:transform group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm sm:text-base">Back to Classics</span>
          </button>
          {/* removed promo badge UI per request */}
        </div>

        {/* ❗ No inline error UI — errors are shown via toast only */}

        <div className="flex flex-col-reverse lg:flex-row gap-4">
          <div className="w-full lg:w-auto">
            <CoinflipControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              pickedSide={pickedSide}
              setPickedSide={(s) => setPickedSide(s as "heads" | "tails")}
              isPlaying={isPlaying}
              onStartGame={onStartGame}
              onCashOut={onCashOut}
              playWithBot={playWithBot}
              setPlayWithBot={setPlayWithBot}
              setNumberOfCoins={() => {}}
              minimumToWin={1}
              setMinimumToWin={() => {}}
              startButtonDisabled={finalButtonDisabled}
              provablyFairData={provablyFairData}
              soundsEnabled={soundsEnabled}
              onToggleSounds={toggleSounds}
              isBanned={isBanned} // 🔒 pass ban flag down
            />
          </div>

          <div className="flex-1 min-w-0">
            <CoinflipGameArea
              betAmount={betAmount}
              pickedSide={pickedSide}
              minimumToWin={1}
              calculateWinProbability={calculateWinProbability}
              isFlipping={isFlipping}
              showLoader={showLoader}
              onFlipComplete={() => {}}
              gameResults={gameResults}
              onPlayAgain={resetGame}
              desiredResult={serverOutcome ?? undefined}
              playWithBot={playWithBot}
              onClearResults={clearResults}
              soundsEnabled={soundsEnabled}
              playSound={playSound}
            />
          </div>
        </div>

        <div className="mt-6 sm:mt-8">
          <SectionAllWins />
        </div>

        <div className="mt-6 sm:mt-8">
          <SectionGames />
        </div>
      </div>

      {/* ✅ Wallet popup stays (identity), but PDA guard is ignored in promo mode */}
      <WalletConnectPopup
        isOpen={showWalletPopup}
        onClose={async () => {
          setShowWalletPopup(false);
          await refreshVaultStatus();
          if (player) fetchPromoStatus(player);
        }}
      />
    </div>
  );
}
