"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ToastService from "@/utils/toastService";

import MinesControls from "@/components/mines/MinesControls";
import MinesGameArea from "@/components/mines/MinesGameArea";
import SectionAllWins from "@/components/sections/HomeSections/section-all-wins";
import SectionGames from "@/components/sections/HomeSections/section-games";

import useMines from "@/utils/hooks/uesMines"; // ✅ existing hook
import { usdToSol } from "@/utils/currency";
import { useGameSounds, MINES_SOUNDS } from "@/hooks/useGameSounds";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

// same popup flow as Dice
import WalletConnectPopup from "@/components/wallet-connect/WalletConnectPopup";
import type { MinesProvablyFairData } from "@/components/common/ProvablyFairModal";

// Buffer polyfill (browser) for PDA derivation
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !(window as any).Buffer) (window as any).Buffer = Buffer;

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "5vgLU8GyehUkziMaKHCtyPu6YZgo11wct8rTHLdz4z1"
);
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

/* -------------------- Error helpers -------------------- */
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
function match(text: string, rx: RegExp) {
  const m = rx.exec(text || "");
  return m?.[1] || null;
}
function extractAnchorMessage(raw: string) {
  const line = (raw || "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => /AnchorError/i.test(l));
  if (!line) return null;
  const msg = match(line, /Error Message:\s*([^\n]+)/i);
  return msg?.trim() || null;
}
function extractCustomCode(raw: string): number | null {
  const n1 = match(raw, /Error Number:\s*(\d+)/i);
  if (n1) return Number(n1);
  const n2 = match(raw, /"Custom"\s*:\s*(\d+)/i);
  if (n2) return Number(n2);
  const h = match(raw, /custom program error:\s*0x([0-9a-f]+)/i);
  if (h) {
    try {
      return parseInt(h, 16);
    } catch {}
  }
  return null;
}
function shorten(s: string, max = 120) {
  const one = (s || "").replace(/\s+/g, " ").trim();
  return one.length > max ? one.slice(0, max - 1) + "…" : one;
}
function stripNoise(raw: string) {
  const lines = (raw || "")
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
  const msg = match(kept.join("\n"), /Error Message:\s*([^\n]+)/i);
  if (msg) return msg;
  return kept[0] || "";
}
function compactMinesError(err: any) {
  const raw = toStringSafe(err);
  const anchorMsg = extractAnchorMessage(raw);
  if (anchorMsg) {
    if (/insufficient/i.test(anchorMsg) && /(vault|balance|funds)/i.test(anchorMsg))
      return "Insufficient coins to play this game.";
    return shorten(anchorMsg);
  }
  const code = extractCustomCode(raw);
  if (code != null) {
    const map: Record<number, string> = { 6004: "Insufficient coins to play this game." };
    if (map[code]) return map[code];
  }
  if (/insufficient/i.test(raw) && /(vault|balance|funds)/i.test(raw))
    return "Insufficient coins to play this game.";
  const cleaned = stripNoise(raw);
  return shorten(cleaned || "Something went wrong.");
}
/* ------------------------------------------------------ */

const toLamports = (sol: number) => Math.round(sol * 1e9);

const LAST_PROOF_KEY = "flipverse:lastMinesProof";

const MinesPage = () => {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();

  // Initialize game sounds
  const { soundsEnabled, toggleSounds, playSound, playLoungeSoundLoop, stopLoungeSound } =
    useGameSounds(MINES_SOUNDS);

  const suppressBanToastRef = React.useRef(false);

  // 🚫 Ban flag (used to disable actions when backend says user is banned)
  const [isBanned, setIsBanned] = useState(false);

  // UI state
  const [betAmount, setBetAmount] = useState(usdToSol(1)); // SOL
  const [gridSize, setGridSize] = useState("5x5");
  const [minesCount, setMinesCount] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playClicked, setPlayClicked] = useState(false);

  // Popup / vault state
  const [vaultActivated, setVaultActivated] = useState(false);
  const [showWalletPopup, setShowWalletPopup] = useState(false);
  const [vaultBalanceLamports, setVaultBalanceLamports] = useState<number>(0);

  // ✅ Fake/Promo (no UI indicator; used only for gating + payload flags)
  const [promoActive, setPromoActive] = useState<boolean>(false);
  const [promoBalanceLamports, setPromoBalanceLamports] = useState<number>(0);

  // Result state
  const [resultStatus, setResultStatus] = useState<"idle" | "won" | "lost">("idle");
  const [payoutSol, setPayoutSol] = useState<number | null>(null);

  // Lounge sound management - play when idle, stop when playing
  useEffect(() => {
    if (!isPlaying && resultStatus === "idle" && soundsEnabled) {
      const timer = setTimeout(() => {
        playLoungeSoundLoop();
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      stopLoungeSound();
    }
  }, [isPlaying, resultStatus, soundsEnabled, playLoungeSoundLoop, stopLoungeSound]);

  // Provably Fair
  const [provablyFairData, setProvablyFairData] = useState<MinesProvablyFairData | null>(null);
  const [proofOpen, setProofOpen] = useState(false);

  // Restore last proof (optional persistence)
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(LAST_PROOF_KEY) : null;
      if (raw && !provablyFairData) {
        setProvablyFairData(JSON.parse(raw));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist last proof (optional)
  useEffect(() => {
    try {
      if (provablyFairData) {
        localStorage.setItem(LAST_PROOF_KEY, JSON.stringify(provablyFairData));
      }
    } catch {}
  }, [provablyFairData]);

  // ---- Promo/fake status via HTTP (prefer admin endpoint) ----
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

  // Hook wiring
  const mines = useMines({
    onStarted: () => {
      setIsPlaying(true);
      setResultStatus("idle");
      setPayoutSol(null);
      // ✅ Clear the previous proof at the start of a new round (correct place)
      setProvablyFairData(null);
      setProofOpen(false);
    },
    onSafe: () => {},
    onBoom: () => {
      setResultStatus("lost");
      setIsPlaying(false);
      setPlayClicked(false);
      ToastService.gameError("💥 BOOM! Better luck next time!");
      if (promoActive && publicKey?.toBase58()) fetchPromoStatus(publicKey.toBase58());
    },
    onResolved: (payout) => {
      setResultStatus(payout > 0 ? "won" : "lost");
      setPayoutSol(payout);
      setIsPlaying(false);
      setPlayClicked(false);
      if (payout > 0) ToastService.gameWin("You won!", payout);
      if (promoActive && publicKey?.toBase58()) fetchPromoStatus(publicKey.toBase58());
    },
    onError: (_code, message) => {
      const msg = compactMinesError(message);
      console.error("[mines:error]", message);
      setIsPlaying(false);
      setPlayClicked(false);
      ToastService.gameError(msg);
    },
    // ✅ capture provably-fair proof (server emits after boom or resolve)
    onProof: (payload) => {
      const mapped: MinesProvablyFairData = {
        nonce: String(payload.nonce),
        rows: Number(payload.rows),
        cols: Number(payload.cols),
        mines: Number(payload.mines),
        opened: Array.isArray(payload.opened) ? payload.opened : [],
        bombIndices: Array.isArray(payload.bombIndices) ? payload.bombIndices : [],
        firstSafeIndex: typeof payload.firstSafeIndex === "number" ? payload.firstSafeIndex : null,
        serverSeedHex: payload.serverSeedHex ?? null,
        serverSeedHash: String(payload.serverSeedHash || ""),
        clientSeed: String(payload.clientSeed || ""),
        firstHmacHex: payload.firstHmacHex ?? null,
        formula: String(
          payload.formula || "HMAC_SHA256(serverSeed, playerPk + nonce + clientSeed)"
        ),
        payoutLamports: Number(payload.payoutLamports || 0),
        safeSteps: Number(payload.safeSteps || 0),
        tx: payload.tx,
      };
      setProvablyFairData(mapped);
    },
  });

  // ✅ Global ban toast listener + disable controls when banned
  useEffect(() => {
    const s: any = (mines as any)?.socket;
    if (!s || typeof s.on !== "function") return;

    const handleBan = (data: any) => {
      try {
        const msg =
          (typeof data === "object" && (data?.error || data?.message)) ||
          (typeof data === "string" ? data : "");
        const lower = String(msg || "").toLowerCase();
        if (lower.includes("banned") || lower.includes("user is banned")) {
          if (!suppressBanToastRef.current) {
            suppressBanToastRef.current = true;
            setIsBanned(true);          // 🔒 mark banned
            setIsPlaying(false);
            setPlayClicked(false);
            ToastService.gameError("🚫 You have been banned from this platform.");
            setTimeout(() => (suppressBanToastRef.current = false), 2000);
          }
        }
      } catch {}
    };

    s.on("error", handleBan);
    s.on("mines:error", handleBan);

    return () => {
      try {
        s.off?.("error", handleBan);
        s.off?.("mines:error", handleBan);
      } catch {}
    };
  }, [mines]);

  // ---------- Vault helpers (existence + balance) ----------
  const getUserVaultPda = (pk: PublicKey) =>
    PublicKey.findProgramAddressSync([Buffer.from("user_vault"), pk.toBuffer()], PROGRAM_ID)[0];

  const refreshVaultStatus = async () => {
    try {
      if (!connected || !publicKey) {
        setVaultActivated(false);
        setVaultBalanceLamports(0);
        return false;
      }
      // ✅ If fake balance is active, skip PDA checks; server will use fake path
      if (promoActive) {
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
      ToastService.gameError(compactMinesError(e));
      setVaultActivated(false);
      setVaultBalanceLamports(0);
      return false;
    }
  };

  useEffect(() => {
    (async () => {
      await refreshVaultStatus();
      if (publicKey?.toBase58()) await fetchPromoStatus(publicKey.toBase58());
      else {
        setPromoActive(false);
        setPromoBalanceLamports(0);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  // ---------- UI helpers ----------
  const getMaxMines = (size: string) => {
    const [rows, cols] = size.split("x").map(Number);
    return rows * cols - 1;
  };
  const maxMines = useMemo(() => getMaxMines(gridSize), [gridSize]);

  const onStartGame = async () => {
    if (isBanned) return;      // 🔒 do nothing if banned
    if (playClicked) return;   // debounce

    const [rows, cols] = gridSize.split("x").map(Number);

    if (rows <= 0 || cols <= 0) return ToastService.gameError("Invalid grid size.");
    if (minesCount < 1 || minesCount > rows * cols - 1)
      return ToastService.gameError("Please choose a valid number of mines.");
    if (betAmount <= 0) return ToastService.gameError("Bet must be greater than 0.");

    try {
      if (!connected || !publicKey) {
        setShowWalletPopup(true);
        return;
      }
      const hasVaultOrFake = await refreshVaultStatus();
      if (!hasVaultOrFake) {
        setShowWalletPopup(true);
        return;
      }

      const required = toLamports(betAmount);
      const have = promoActive ? promoBalanceLamports : vaultBalanceLamports;
      if (have < required) {
        ToastService.gameError(`Insufficient coins to play this game.`);
        return;
      }

      setPlayClicked(true);

      await mines.startGame(
        {
          rows,
          cols,
          minesCount,
          betSol: betAmount,
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
        } as any
      );
    } catch (err: any) {
      console.error("startGame failed", err);
      ToastService.gameError(compactMinesError(err));
      setPlayClicked(false);
    }
  };

  const onCashOut = async () => {
    if (isBanned) return; // 🔒 ignore if banned
    try {
      await mines.cashOut();
    } catch (err: any) {
      console.error("cashout failed", err);
      ToastService.gameError(compactMinesError(err));
    } finally {
      if (promoActive && publicKey?.toBase58()) await fetchPromoStatus(publicKey.toBase58());
      else await refreshVaultStatus();
    }
  };

  // Handle auto-reset when results auto-hide after 5 seconds
  const handleAutoReset = () => {
    setResultStatus("idle");
    setPayoutSol(null);
    setIsPlaying(false);
    setPlayClicked(false);
  };

  return (
    <div className="min-h-screen bg-background pt-4 md:pt-10">
      <div className="layout-wrapper">
        <div className="mb-6 px-4 flex justify-between">
          <button
            onClick={() => router.push("/classics")}
            className="flex items-center gap-2 text-light hover:text-neon-pink transition-colors duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:transform group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Back to Classics</span>
          </button>
        </div>

        <div className="flex flex-col-reverse lg:flex-row gap-4">
          {/* Left Controls */}
          <div className="w-full lg:w-72">
            <MinesControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              gridSize={gridSize}
              setGridSize={setGridSize}
              minesCount={minesCount}
              setMinesCount={setMinesCount}
              maxMines={maxMines}
              getMaxMines={getMaxMines}
              isPlaying={isPlaying}
              playClicked={playClicked}
              onStartGame={onStartGame}
              onCashOut={onCashOut}
              provablyFairData={provablyFairData}
              proofOpen={proofOpen}
              setProofOpen={setProofOpen}
              soundsEnabled={soundsEnabled}
              onToggleSounds={toggleSounds}
              multiplier={mines.multiplier}
              picks={mines.picks}
              isBanned={isBanned} // 🔒 pass ban flag to controls
            />
          </div>

          {/* Main Game Area */}
          <div className="flex-1">
            <MinesGameArea
              isPlaying={isPlaying}
              betAmount={betAmount}
              gridSize={gridSize}
              minesCount={minesCount}
              picks={mines.picks}
              multiplier={mines.multiplier}
              revealed={mines.revealed}
              boomIndex={mines.boomIndex}
              onOpenCell={(r, c) =>
                mines
                  .openCell(r, c)
                  .catch((e) => {
                    console.error("openCell failed", e);
                    ToastService.gameError(compactMinesError(e));
                  })
              }
              resultStatus={resultStatus}
              payoutSol={payoutSol}
              onAutoReset={handleAutoReset}
              soundsEnabled={soundsEnabled}
              playSound={playSound}
            />
          </div>
        </div>

        <div className="mt-8">
          <SectionAllWins />
        </div>

        <div className="mt-8">
          <SectionGames />
        </div>
      </div>

      {/* Same popup flow as Dice */}
      <WalletConnectPopup
        isOpen={showWalletPopup}
        onClose={async () => {
          setShowWalletPopup(false);
          await refreshVaultStatus();
          if (publicKey?.toBase58()) await fetchPromoStatus(publicKey.toBase58());
        }}
      />

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: var(--color-neon-pink);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(255, 77, 143, 0.5);
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: var(--color-neon-pink);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(255, 77, 143, 0.5);
        }
      `}</style>
    </div>
  );
};

export default MinesPage;
