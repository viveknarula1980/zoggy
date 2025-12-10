"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import DiceControls from "@/components/dice/DiceControls";
import DiceGameArea from "@/components/dice/DiceGameArea";
import SectionAllWins from "@/components/sections/HomeSections/section-all-wins";
import SectionGames from "@/components/sections/HomeSections/section-games";
import { usdToSol } from "@/utils/currency";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { io, Socket } from "socket.io-client";
import useToast from "@/utils/hooks/useToast";
import { useGameSounds, DICE_SOUNDS } from "@/hooks/useGameSounds";

// ✅ wallet popup
import WalletConnectPopup from "@/components/wallet-connect/WalletConnectPopup";

// Buffer polyfill (browser)
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

type BetType = "under" | "over";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "5vgLU8GyehUkziMaKHCtyPu6YZgo11wct8rTHLdz4z1"
);

function toLamports(sol: number) {
  return Math.round(sol * 1e9);
}

/* --------------------------- ERROR SHORTENING --------------------------- */
function compactDiceError(e: any) {
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

type PFModalData = {
  dicereveal_seed?: {
    nonce: string;
    clientSeed: string;
    formula: string;
    serverSeedHashed: string;
    serverSeedHex?: string;
    hmacHex?: string;
    nonce_value?: string;
  };
} | null;

export default function DicePage() {
  const router = useRouter();
  const toast = useToast();

  const { soundsEnabled, toggleSounds, playSound, playLoungeSoundLoop, stopLoungeSound } =
    useGameSounds(DICE_SOUNDS);

  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  const [betAmount, setBetAmount] = useState(usdToSol(1));
  const [targetNumber, setTargetNumber] = useState(50);
  const [betType, setBetType] = useState<BetType>("under");

  const [isPlaying, setIsPlaying] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);

  const [resolveSig, setResolveSig] = useState<string | null>(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [provablyFairData, setProvablyFairData] = useState<PFModalData>(null);

  const [vaultActivated, setVaultActivated] = useState<boolean>(false);
  const [vaultBalanceLamports, setVaultBalanceLamports] = useState<number>(0);
  const [showWalletPopup, setShowWalletPopup] = useState<boolean>(false);

  // ✅ Fake/Promo logic (no UI; used only for gating + payload flags)
  const [promoActive, setPromoActive] = useState<boolean>(false);
  const [promoBalanceLamports, setPromoBalanceLamports] = useState<number>(0);

  // 🚫 Ban flag
  const [isBanned, setIsBanned] = useState<boolean>(false);

  // Lounge sound management - play when idle, stop when playing
  useEffect(() => {
    if (!isPlaying && !lastRoll && soundsEnabled) {
      // Game is idle, play lounge sound
      const timer = setTimeout(() => {
        playLoungeSoundLoop();
      }, 1000); // Small delay to avoid conflicts
      return () => clearTimeout(timer);
    } else {
      // Game is active or has results, stop lounge sound
      stopLoungeSound();
    }
  }, [isPlaying, lastRoll, soundsEnabled, playLoungeSoundLoop, stopLoungeSound]);

  const socketRef = useRef<Socket | null>(null);
  const lastClientSeedRef = useRef<string>(""); // keep last client seed we sent
  const nonceRef = useRef<string | null>(null);

  // derive user_vault PDA
  const getUserVaultPda = (pk: PublicKey) =>
    PublicKey.findProgramAddressSync([Buffer.from("user_vault"), pk.toBuffer()], PROGRAM_ID)[0];

  // reset ephemeral UI when bet params change
  useEffect(() => {
    setLastRoll(null);
    setResolveSig(null);
    setIsPlaying(false);
    setIsButtonDisabled(false);
  }, [targetNumber, betType, betAmount]);

  // ---- Promo/fake status via HTTP (prefer /admin/fake/status) ----
  const fetchPromoStatus = async (walletBase58: string) => {
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
  };

  // sockets for dice (errors only via toast)
  useEffect(() => {
    const s = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = s;

    // --- Handle backend ban/error event ---
    s.on("error", (data: any) => {
      if (data?.error === "User is banned") {
        setIsBanned(true);
        setIsPlaying(false);
        setIsButtonDisabled(true);
        toast.gameError("🚫 You have been banned from this platform.");
        // Give the toast a short moment before disconnecting
        setTimeout(() => s.disconnect(), 500);
      } else if (data?.error) {
        toast.gameError(data.error);
      }
    });

    const registerNow = () => {
      s.emit("register", { player: publicKey?.toBase58() || "guest" });
    };
    s.on("connect", registerNow);
    if (s.connected) registerNow();

    s.on("connect_error", (err: any) => {
      toast.gameError(compactDiceError(err));
    });
    s.io.on("error", (err: any) => {
      toast.gameError(compactDiceError(err));
    });
    s.on("reconnect_error", (err: any) => {
      toast.gameError(compactDiceError(err));
    });
    s.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        console.warn("Server disconnected (possible ban).");
      } else {
        toast.gameError(shorten(`Disconnected: ${reason}`));
      }
    });

    // backend acks/updates for promo/fake
    s.on(
      "register:ack",
      (payload: {
        promoActive?: boolean;
        promoBalanceLamports?: number;
        effectiveBalanceLamports?: number;
      } = {}) => {
        if (typeof payload.promoActive === "boolean") setPromoActive(payload.promoActive);
        const bal =
          typeof payload.effectiveBalanceLamports !== "undefined"
            ? payload.effectiveBalanceLamports
            : payload.promoBalanceLamports;
        if (typeof bal !== "undefined") setPromoBalanceLamports(Number(bal) || 0);
      }
    );
    if (publicKey?.toBase58()) s.emit("promo:status", { player: publicKey.toBase58() });
    s.on(
      "promo:status",
      (payload: {
        active?: boolean;
        balanceLamports?: number;
        effectiveBalanceLamports?: number;
      } = {}) => {
        if (typeof payload.active === "boolean") setPromoActive(payload.active);
        const bal =
          typeof payload.effectiveBalanceLamports !== "undefined"
            ? payload.effectiveBalanceLamports
            : payload.balanceLamports;
        if (typeof bal !== "undefined") setPromoBalanceLamports(Number(bal) || 0);
      }
    );
    s.on(
      "promo:update",
      (payload: {
        active?: boolean;
        balanceLamports?: number;
        effectiveBalanceLamports?: number;
      } = {}) => {
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
      (payload: { balanceLamports?: number; effectiveBalanceLamports?: number } = {}) => {
        const bal =
          typeof payload.effectiveBalanceLamports !== "undefined"
            ? payload.effectiveBalanceLamports
            : payload.balanceLamports;
        if (typeof bal !== "undefined") setPromoBalanceLamports(Number(bal) || 0);
      }
    );

    // locked (server drives animation)
    s.on(
      "dice:locked",
      async ({
        nonce,
        txSig,
        serverSeedHash,
      }: {
        nonce: number | string;
        txSig: string;
        serverSeedHash?: string;
      }) => {
        try {
          nonceRef.current = String(nonce);
          setProvablyFairData({
            dicereveal_seed: {
              nonce: String(nonce),
              clientSeed: lastClientSeedRef.current || "",
              formula: "HMAC_SHA256(serverSeed, clientSeed + nonce)",
              serverSeedHashed: serverSeedHash || "",
              serverSeedHex: "",
              hmacHex: "",
            },
          });

          if (!connected || !publicKey) return;
          s.emit("dice:resolve", {
            player: publicKey.toBase58(),
            nonce: String(nonce),
          });
        } catch (err: any) {
          toast.gameError(compactDiceError(err));
          setIsPlaying(false);
          setIsButtonDisabled(false);
        }
      }
    );

    // resolved (result)
    s.on(
      "dice:resolved",
      async (payload: {
        nonce: string | number;
        roll: number;
        win: boolean;
        payoutLamports: number;
        txSig: string;
      }) => {
        try {
          if (nonceRef.current && String(payload.nonce) !== nonceRef.current) return;
          setLastRoll(typeof payload.roll === "number" ? payload.roll : null);
          setResolveSig(payload.txSig);

          if (promoActive && publicKey?.toBase58()) fetchPromoStatus(publicKey.toBase58());
        } catch (err: any) {
          toast.gameError(compactDiceError(err));
        } finally {
          setIsPlaying(false);
          setIsButtonDisabled(false);
          nonceRef.current = null;
        }
      }
    );

    // reveal seed for PF
    s.on(
      "dice:reveal_seed",
      ({
        nonce,
        serverSeedHex,
        clientSeed,
        formula,
        hmacHex,
      }: {
        nonce: string | number;
        serverSeedHex: string;
        clientSeed: string;
        formula: string;
        hmacHex?: string;
      }) => {
        setProvablyFairData((prev) => {
          const prevSeed: Partial<NonNullable<PFModalData>["dicereveal_seed"]> =
            prev?.dicereveal_seed || {};
          return {
            dicereveal_seed: {
              ...prevSeed,
              nonce: String(nonce),
              clientSeed: clientSeed ?? prevSeed.clientSeed ?? "",
              formula: formula ?? prevSeed.formula ?? "HMAC_SHA256(serverSeed, clientSeed + nonce)",
              serverSeedHashed: prevSeed.serverSeedHashed || "",
              serverSeedHex,
              hmacHex: hmacHex || prevSeed.hmacHex || "",
            },
          };
        });
      }
    );

    s.on("dice:error", (e: any) => {
      toast.gameError(compactDiceError(e));
      setIsPlaying(false);
      setIsButtonDisabled(false);
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [BACKEND_URL, connected, publicKey, promoActive]);

  // check vault existence + balance (errors only via toast)
  useEffect(() => {
    (async () => {
      try {
        if (!connected || !publicKey) {
          setVaultActivated(false);
          setVaultBalanceLamports(0);
          return;
        }
        if (promoActive) {
          // When fake balance is active, skip PDA guard entirely.
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
        toast.gameError(compactDiceError(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, connection, promoActive]);

  // keep promo status synced with wallet
  useEffect(() => {
    const w = publicKey?.toBase58();
    if (w) fetchPromoStatus(w);
    else {
      setPromoActive(false);
      setPromoBalanceLamports(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  // refresh helper (used before play and after popup closes)
  const refreshVaultStatus = async () => {
    try {
      if (!connected || !publicKey) {
        setVaultActivated(false);
        setVaultBalanceLamports(0);
        return false;
      }
      if (promoActive) {
        // When fake balance is active, treat vault as ready.
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
      toast.gameError(compactDiceError(e));
      return false;
    }
  };

  // actions (errors only via toast)
  const handleRollDice = async () => {
    if (isBanned) {
      toast.gameError("🚫 You are banned from playing this game.");
      return;
    }

    setLastRoll(null);
    setResolveSig(null);
    setProvablyFairData(null); // clear PF data for new round
    setIsButtonDisabled(true);

    try {
      // open popup when wallet not connected
      if (!connected || !publicKey) {
        setShowWalletPopup(true);
        setIsButtonDisabled(false);
        return;
      }

      // gate: if fake balance active, we skip PDA/bonus guard entirely.
      const exists = await refreshVaultStatus();
      if (!exists) {
        setShowWalletPopup(true);
        setIsButtonDisabled(false);
        return;
      }

      if (targetNumber < 2 || targetNumber > 98) throw new Error("Target must be between 2 and 98.");

      // HARD CHECK: user must have enough balance (fake or real) before placing
      const required = toLamports(betAmount);
      const have = promoActive ? promoBalanceLamports : vaultBalanceLamports;
      if (have < required) {
        toast.gameError(`Insufficient coins to play this game.`);
        setIsButtonDisabled(false);
        return;
      }

      setIsPlaying(true);

      // send a clientSeed so the reveal can be verified (server drives animation)
      const clientSeed =
        crypto.getRandomValues(new Uint32Array(1))[0].toString(36) + Date.now().toString(36);
      lastClientSeedRef.current = clientSeed;

      // IMPORTANT: when fake balance is active, tell backend to SKIP BONUS GUARD.
      // We include multiple hints to be compatible with different backends.
      socketRef.current?.emit("dice:place", {
        player: publicKey.toBase58(),
        betAmountLamports: required,
        betType,
        targetNumber,
        clientSeed,
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
    } catch (err: any) {
      toast.gameError(compactDiceError(err));
      setIsPlaying(false);
      setIsButtonDisabled(false);
    }
  };

  // derived helpers
  const winProb = useMemo(() => {
    const p =
      betType === "under"
        ? Math.max(0, (targetNumber - 1) / 100)
        : Math.max(0, (100 - targetNumber) / 100);
    return Math.min(1, Math.max(0, p));
  }, [betType, targetNumber]);

  const calculateWinProbability = () => winProb * 100;

  const displayedPayout = useMemo(() => {
    if (winProb <= 0) return "0.0000";
    const mult = 0.99 / winProb;
    return (betAmount * mult).toFixed(4);
  }, [betAmount, winProb]);

  const isWin = useMemo(() => {
    if (lastRoll === null) return false;
    return betType === "under" ? lastRoll < targetNumber : lastRoll > targetNumber;
  }, [lastRoll, betType, targetNumber]);

  const winAmount = useMemo(() => {
    if (lastRoll === null) return 0;
    return isWin ? parseFloat(displayedPayout) - betAmount : betAmount;
  }, [lastRoll, isWin, displayedPayout, betAmount]);

  // Clear results function for auto-hide callback
  const clearResults = () => {
    setLastRoll(null);
    setResolveSig(null);
  };

  // Now also disabled if banned
  const finalButtonDisabled = isButtonDisabled || isPlaying || isBanned;

  return (
    <div className="min-h-screen bg-background pt-4 md:pt-10">
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

        {/* Game UI always visible; popup only on play attempt if needed */}
        <div className="flex flex-col-reverse lg:flex-row gap-4">
          <DiceControls
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            targetNumber={targetNumber}
            setTargetNumber={setTargetNumber}
            betType={betType}
            setBetType={setBetType}
            isPlaying={isPlaying}
            onRollDice={handleRollDice}
            calculateWinProbability={calculateWinProbability}
            calculatePayout={() => displayedPayout}
            isButtonDisabled={finalButtonDisabled}
            provablyFairData={provablyFairData}
            soundsEnabled={soundsEnabled}
            onToggleSounds={toggleSounds}
          />

          <div className="flex-1">
            <DiceGameArea
              betAmount={betAmount}
              targetNumber={targetNumber}
              betType={betType}
              lastRoll={lastRoll}
              isPlaying={isPlaying}
              isWin={isWin}
              calculateWinProbability={calculateWinProbability}
              winAmount={winAmount}
              onClearResults={clearResults}
              soundsEnabled={soundsEnabled}
              playSound={playSound}
            />
          </div>
        </div>

        {/* resolveSig kept for analytics/debug (not shown) */}
        {/* <div className="px-4 pt-2 text-xs text-zinc-400 break-all">Resolve Tx: {resolveSig}</div> */}

        <div className="mt-8">
          <SectionAllWins />
        </div>

        <div className="mt-8">
          <SectionGames />
        </div>
      </div>

      {/* Wallet + Vault popup */}
      <WalletConnectPopup
        isOpen={showWalletPopup}
        onClose={async () => {
          setShowWalletPopup(false);
          await refreshVaultStatus();
          if (publicKey?.toBase58()) fetchPromoStatus(publicKey.toBase58());
        }}
      />
    </div>
  );
}
