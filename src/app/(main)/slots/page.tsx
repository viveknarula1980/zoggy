// app/slots/SlotsPage.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import SlotsGameArea from "@/components/slots/SlotsGameArea";
import SectionAllWins from "@/components/sections/HomeSections/section-all-wins";
import SectionGames from "@/components/sections/HomeSections/section-games";
import { usdToSol } from "@/utils/currency";

import { io, Socket } from "socket.io-client";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

// ✅ same popup as Dice
import WalletConnectPopup from "@/components/wallet-connect/WalletConnectPopup";

// ✅ toast (show errors in toast; do NOT show inline)
import useToast from "@/utils/hooks/useToast";
import { useGameSounds, SLOTS_SOUNDS } from "@/hooks/useGameSounds";

// Buffer polyfill
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !(window as any).Buffer) (window as any).Buffer = Buffer;

// =====================
// Types & constants
// =====================
const SYMBOLS = ["floki", "wif", "brett", "shiba", "bonk", "doge", "pepe", "sol", "zoggy"] as const;
type SlotSymbol = (typeof SYMBOLS)[number];

type ServerLockedMsg = {
  nonce: number | string;
  txSig: string;
  serverSeedHash?: string;
};

type ServerResolvedMsg = {
  nonce: number | string;
  roll?: number;
  outcome: string;
  grid: SlotSymbol[];
  payoutLamports: number;
  feePct: number;
  txSig: string;
};

type RevealSeedMsg = {
  nonce: number | string;
  serverSeedHex?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  firstHmacHex?: string;
  formula?: string;
};

type PFModalData =
  | {
      dicereveal_seed?: {
        nonce: string;
        clientSeed: string;
        formula: string;
        serverSeedHashed: string;
        serverSeedHex?: string;
        hmacHex?: string;
      };
    }
  | null;

type WelcomeState = {
  status?: string;
  claimed?: boolean;
  claimable?: boolean;
  usd_per_sol?: number;
  fs_count?: number;
  fs_value_usd?: number;
  fs_max_win_usd?: number;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "5vgLU8GyehUkziMaKHCtyPu6YZgo11wct8rTHLdz4z1"
);

// =====================
// Helpers
// =====================
function createRandomGrid(): SlotSymbol[] {
  return Array.from({ length: 9 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
}
function toLamports(sol: number) {
  return Math.round(sol * 1e9);
}
function getUserVaultPda(pk: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("user_vault"), pk.toBuffer()], PROGRAM_ID)[0];
}
function toStr(x: any) {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (x?.message) return String(x.message);
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}
function cryptoRandomSeed() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const a = new Uint8Array(16);
    window.crypto.getRandomValues(a);
    return Array.from(a).map((n) => n.toString(16).padStart(2, "0")).join("");
  }
  return Math.floor(Math.random() * 1e16).toString(16);
}
const usdToLamportsViaPrice = (usd: number, usdPerSol: number) =>
  Math.max(1, Math.round((Number(usd || 0) / Number(usdPerSol || 1)) * 1e9)); // guard ≥1 lamport

// =====================
// Component
// =====================
export default function SlotsPage() {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  // Initialize game sounds
  const { soundsEnabled, toggleSounds, playSound, playLoungeSoundLoop, stopLoungeSound } =
    useGameSounds(SLOTS_SOUNDS);
  const toast = useToast();

  // --- UI / game state ---
  const [betAmount, setBetAmount] = useState(usdToSol(1)); // default $1 USD equiv
  const betAmountRef = useRef(usdToSol(1));
  const [autoSpin, setAutoSpin] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(10);
  const [spinsLeft, setSpinsLeft] = useState(0);

  useEffect(() => {
    betAmountRef.current = betAmount;
  }, [betAmount]);

  const [currentBetLamports, setCurrentBetLamports] = useState<number>(toLamports(usdToSol(1)));
  const [currentSpinMode, setCurrentSpinMode] = useState<"idle" | "paid" | "free">("idle");

  // --- Welcome Bonus: Free Spins state (from server) ---
  const [welcomeState, setWelcomeState] = useState<WelcomeState | null>(null);
  const [freeSpinsLocal, setFreeSpinsLocal] = useState<number>(0);
  const [fsSessionWinsLamports, setFsSessionWinsLamports] = useState<number>(0);
  const usingFreeSpinRef = useRef<boolean>(false);

  const [showBetPopup, setShowBetPopup] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const [lastWin, setLastWin] = useState(-1);
  const [grid, setGrid] = useState<SlotSymbol[]>(() =>
    Array.from({ length: 9 }, () => SYMBOLS[0])
  );

  const [serverSeedHash, setServerSeedHash] = useState("");
  const [nonce, setNonce] = useState<number>(0);

  const [depositSig, setDepositSig] = useState<string | null>(null);
  const [resolveSig, setResolveSig] = useState<string | null>(null);

  const [hasSocketError, setHasSocketError] = useState(false);
  const [resultReady, setResultReady] = useState(false);

  // 🔒 NEW: ban flag
  const [isBanned, setIsBanned] = useState(false);
  const isBannedRef = useRef(false);
  useEffect(() => {
    isBannedRef.current = isBanned;
  }, [isBanned]);

  // Lounge sound management
  useEffect(() => {
    if (!isPlaying && !resultReady && lastWin === -1 && soundsEnabled) {
      const timer = setTimeout(() => {
        playLoungeSoundLoop();
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      stopLoungeSound();
    }
  }, [isPlaying, resultReady, lastWin, soundsEnabled, playLoungeSoundLoop, stopLoungeSound]);

  const [vaultActivated, setVaultActivated] = useState<boolean>(false);
  const [showWalletPopup, setShowWalletPopup] = useState<boolean>(false);
  const [provablyFairData, setProvablyFairData] = useState<PFModalData>(null);

  const socketRef = useRef<Socket | null>(null);
  const suppressDisconnectToastRef = useRef(false);

  const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSpinRef = useRef(autoSpin);
  const spinsLeftRef = useRef(spinsLeft);
  const clientSeedRef = useRef<string>("");
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);
  useEffect(() => {
    spinsLeftRef.current = spinsLeft;
  }, [spinsLeft]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const cleanupTimers = () => {
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    animationIntervalRef.current = null;
    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    autoStopTimeoutRef.current = null;
  };

  useEffect(() => {
    setGrid(createRandomGrid());
    return () => cleanupTimers();
  }, []);

  // 🔔 Patch console.error to also toast
  useEffect(() => {
    const origError = console.error;
    const lastMsgRef = { msg: "", t: 0 };
    console.error = (...args: any[]) => {
      try {
        const msg = args.map(toStr).join(" ");
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

  // ✅ vault existence check (same as Dice)
  useEffect(() => {
    (async () => {
      try {
        if (!connected || !publicKey) {
          setVaultActivated(false);
          return;
        }
        const uv = getUserVaultPda(publicKey);
        const acc = await connection.getAccountInfo(uv, "confirmed");
        setVaultActivated(!!acc);
      } catch (e) {
        console.error(e);
        setVaultActivated(false);
      }
    })();
  }, [connected, publicKey, connection]);

  const refreshVaultStatus = async () => {
    try {
      if (!connected || !publicKey) return false;
      const uv = getUserVaultPda(publicKey);
      const acc = await connection.getAccountInfo(uv, "confirmed");
      const exists = !!acc;
      setVaultActivated(exists);
      return exists;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // --- Fetch Welcome Bonus free-spins state ---
  const loadWelcomeState = useCallback(async () => {
    try {
      if (!connected || !publicKey || !BACKEND_URL) return;
      const url = `${BACKEND_URL.replace(/\/$/, "")}/promo/welcome/state?wallet=${encodeURIComponent(
        publicKey.toBase58()
      )}`;
      const r = await fetch(url, { method: "GET" });
      if (!r.ok) throw new Error(`welcome/state ${r.status}`);
      const j: WelcomeState = await r.json();
      setWelcomeState(j || null);
      const serverCount = Number(j?.fs_count || 0);
      setFreeSpinsLocal(serverCount > 0 ? serverCount : 0);
    } catch (e) {
      console.error("Failed to load welcome bonus state", e);
    }
  }, [connected, publicKey]);

  useEffect(() => {
    void loadWelcomeState();
  }, [loadWelcomeState]);

  // --- Socket wiring ---
  useEffect(() => {
    const s = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = s;

    const register = () => s.emit("register", { player: publicKey?.toBase58() || "guest" });
    s.on("connect", register);
    if (s.connected) register();

    const onConnectError = (err: any) => {
      console.error("Socket connection error:", err);
      if (isPlayingRef.current) {
        setHasSocketError(true);
        setIsPlaying(false);
        setIsButtonDisabled(false);
        cleanupTimers();
        if (usingFreeSpinRef.current) {
          setFreeSpinsLocal((n) => n + 1);
          usingFreeSpinRef.current = false;
          setCurrentSpinMode("idle");
        }
      }
    };

    s.on("connect_error", onConnectError);
    s.on("reconnect_error", onConnectError);
    s.on("disconnect", (reason) => {
      if (suppressDisconnectToastRef.current) {
        suppressDisconnectToastRef.current = false;
        return;
      }

      console.error(`Socket disconnected: ${reason}`);
      if (isPlayingRef.current) {
        setHasSocketError(true);
        setIsPlaying(false);
        setIsButtonDisabled(false);
        cleanupTimers();
        if (usingFreeSpinRef.current) {
          setFreeSpinsLocal((n) => n + 1);
          usingFreeSpinRef.current = false;
          setCurrentSpinMode("idle");
        }
      }
    });

    // 🚫 ban handling – now also marks isBanned so user can't play
    s.on("error", (data: any) => {
      const msg = typeof data === "object" ? data?.error || data?.message : data;
      if (msg && msg.toLowerCase().includes("banned")) {
        suppressDisconnectToastRef.current = true;
        setIsBanned(true);
        setAutoSpin(false);
        setSpinsLeft(0);
        setIsPlaying(false);
        setIsButtonDisabled(true);
        cleanupTimers();
        toast.gameError("🚫 You have been banned from this platform.");
        setTimeout(() => s.disconnect(), 150);
        return;
      }
      if (msg) toast.gameError(msg);
    });

    s.on("slots:error", (data: any) => {
      const msg = typeof data === "object" ? data?.error || data?.message : data;
      if (msg && msg.toLowerCase().includes("banned")) {
        suppressDisconnectToastRef.current = true;
        setIsBanned(true);
        setAutoSpin(false);
        setSpinsLeft(0);
        setIsPlaying(false);
        setIsButtonDisabled(true);
        cleanupTimers();
        toast.gameError("🚫 You have been banned from this platform.");
        setTimeout(() => s.disconnect(), 150);
        return;
      }

      console.error(msg || "slots:error");
      setHasSocketError(true);
      setIsPlaying(false);
      setIsButtonDisabled(false);
      cleanupTimers();
      if (usingFreeSpinRef.current) {
        setFreeSpinsLocal((n) => n + 1);
        usingFreeSpinRef.current = false;
        setCurrentSpinMode("idle");
      }
    });

    // ---- LOCKED ----
    s.on("slots:locked", ({ nonce, txSig, serverSeedHash }: ServerLockedMsg) => {
      try {
        setDepositSig(txSig || null);
        setNonce(Number(nonce));
        if (serverSeedHash) setServerSeedHash(serverSeedHash);

        setProvablyFairData({
          dicereveal_seed: {
            nonce: String(nonce),
            clientSeed: clientSeedRef.current || "",
            serverSeedHashed: serverSeedHash || "",
            formula:
              "HMAC_SHA256(serverSeed, clientSeed + nonce) → RNG stream used to produce reels",
          },
        });

        if (connected && publicKey) {
          s.emit("slots:resolve", { player: publicKey.toBase58(), nonce: String(nonce) });
        }
      } catch (err: any) {
        console.error(err?.message || err || "Lock stage failed");
        setIsPlaying(false);
        setIsButtonDisabled(false);
        cleanupTimers();
        if (usingFreeSpinRef.current) {
          setFreeSpinsLocal((n) => n + 1);
          usingFreeSpinRef.current = false;
          setCurrentSpinMode("idle");
        }
      }
    });

    // ---- RESOLVED ----
    s.on("slots:resolved", (payload: ServerResolvedMsg) => {
      try {
        if (Array.isArray(payload.grid) && payload.grid.length >= 9) {
          setGrid(payload.grid.slice(0, 9));
        }
        const wonSol = (payload.payoutLamports || 0) / 1e9;
        setLastWin(wonSol);
        setResolveSig(payload.txSig);

        if (usingFreeSpinRef.current && payload.payoutLamports > 0) {
          setFsSessionWinsLamports((v) => v + Number(payload.payoutLamports || 0));
        }
      } catch (err: any) {
        console.error(err?.message || err || "Resolve display failed");
      } finally {
        setIsPlaying(false);
        setIsButtonDisabled(false);
        setResultReady(true);
        cleanupTimers();

        if (usingFreeSpinRef.current) {
          usingFreeSpinRef.current = false;
        }

        if (autoSpinRef.current && spinsLeftRef.current > 0) {
          setSpinsLeft((n) => Math.max(0, n - 1));
          setTimeout(() => {
            if (autoSpinRef.current && spinsLeftRef.current > 0 && !isBannedRef.current) {
              void spinOnce({ mode: "paid" });
            } else {
              setAutoSpin(false);
            }
          }, 300);
        } else if (autoSpinRef.current) {
          setAutoSpin(false);
        }
      }
    });

    // ---- REVEAL ----
    s.on("slots:reveal_seed", (payload: RevealSeedMsg) => {
      const { nonce, serverSeedHex, serverSeedHash, clientSeed, firstHmacHex, formula } = payload || {};
      setProvablyFairData((prev) => ({
        dicereveal_seed: {
          nonce: String(nonce ?? ""),
          clientSeed: clientSeedRef.current || clientSeed || prev?.dicereveal_seed?.clientSeed || "",
          serverSeedHashed: serverSeedHash || prev?.dicereveal_seed?.serverSeedHashed || "",
          serverSeedHex: serverSeedHex || prev?.dicereveal_seed?.serverSeedHex || "",
          hmacHex: firstHmacHex || prev?.dicereveal_seed?.hmacHex || "",
          formula:
            formula ||
            prev?.dicereveal_seed?.formula ||
            "HMAC_SHA256(serverSeed, clientSeed + nonce) → RNG stream used to produce reels",
        },
      }));
    });

    s.on("slots:error", (e: any) => {
      console.error(e?.message || e?.code || e || "slots:error");
      setHasSocketError(true);
      setIsPlaying(false);
      setIsButtonDisabled(false);
      cleanupTimers();
      if (usingFreeSpinRef.current) {
        setFreeSpinsLocal((n) => n + 1);
        usingFreeSpinRef.current = false;
        setCurrentSpinMode("idle");
      }
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, [BACKEND_URL, connected, publicKey, isPlaying]); // deps same as before

  // Clear results
  const clearResults = () => {
    setLastWin(-1);
    setResolveSig(null);
    setResultReady(false);
    setCurrentSpinMode("idle");
    setCurrentBetLamports(toLamports(betAmount));
  };

  // --- Spin triggers (gated like Dice) ---
  const spinOnce = useCallback(
    async ({ mode }: { mode: "paid" | "free" }) => {
      // ❌ if banned, do NOTHING
      if (isBannedRef.current) {
        console.error("🚫 You have been banned from this platform.");
        return;
      }

      if (isPlayingRef.current) return;

      clearResults();

      setIsPlaying(true);
      setIsButtonDisabled(true);
      setHasSocketError(false);
      setDepositSig(null);
      setProvablyFairData(null);
      cleanupTimers();

      if (!connected || !publicKey) {
        setShowWalletPopup(true);
        setIsPlaying(false);
        setIsButtonDisabled(false);
        return;
      }
      const exists = await refreshVaultStatus();
      if (!exists) {
        setShowWalletPopup(true);
        setIsPlaying(false);
        setIsButtonDisabled(false);
        return;
      }

      if (mode === "paid") {
        try {
          const uv = getUserVaultPda(publicKey);
          const balLamports = await connection.getBalance(uv, "confirmed");
          const need = toLamports(betAmountRef.current);
          if (need <= 0) {
            console.error("Bet must be greater than 0");
            setIsPlaying(false);
            setIsButtonDisabled(false);
            return;
          }
          if (balLamports < need) {
            console.error("Insufficient coins to play this game.");
            setIsPlaying(false);
            setIsButtonDisabled(false);
            return;
          }
        } catch (e) {
          console.error(e);
          setIsPlaying(false);
          setIsButtonDisabled(false);
          return;
        }
      }

      try {
        const seed = cryptoRandomSeed();
        clientSeedRef.current = seed;

        let betLamports: number;
        if (mode === "free") {
          const usdPerSol = Number(welcomeState?.usd_per_sol || 0);
          const valueUsd = Number(welcomeState?.fs_value_usd || 0);
          betLamports = usdToLamportsViaPrice(valueUsd, usdPerSol);
        } else {
          betLamports = toLamports(betAmountRef.current);
        }

        setCurrentBetLamports(betLamports);
        setCurrentSpinMode(mode);

        usingFreeSpinRef.current = mode === "free";

        socketRef.current?.emit("slots:place", {
          player: publicKey.toBase58(),
          betAmountLamports: betLamports,
          clientSeed: seed,
          welcomeFreeSpin: mode === "free",
        });
      } catch (e: any) {
        console.error(e?.message || e || "Failed to start spin");
        setIsPlaying(false);
        setIsButtonDisabled(false);
        cleanupTimers();
        if (usingFreeSpinRef.current) {
          setFreeSpinsLocal((n) => n + 1);
          usingFreeSpinRef.current = false;
          setCurrentSpinMode("idle");
        }
      }
    },
    [connected, publicKey, betAmount, connection, welcomeState]
  );

  const onSpin = async () => {
    if (isBanned) {
      console.error("🚫 You have been banned from this platform.");
      return;
    }
    setAutoSpin(false);
    setSpinsLeft(0);
    await spinOnce({ mode: "paid" });
  };

  const onAutoSpin = async () => {
    if (isPlaying || isBanned) return;

    if (!connected || !publicKey) {
      setShowWalletPopup(true);
      return;
    }
    const exists = await refreshVaultStatus();
    if (!exists) {
      setShowWalletPopup(true);
      return;
    }

    setAutoSpin(true);
    setSpinsLeft(autoSpinCount);
    await spinOnce({ mode: "paid" });
  };

  const stopAutoSpin = () => {
    setAutoSpin(false);
    setSpinsLeft(0);
    cleanupTimers();
  };

  const onFreeSpinClick = async () => {
    if (isPlaying || isBanned) return;
    if (!welcomeState || Number(freeSpinsLocal) <= 0) {
      console.error("No free spins available.");
      return;
    }

    setFreeSpinsLocal((n) => Math.max(0, n - 1));

    const vUsd = Number(welcomeState.fs_value_usd || 0);
    const capUsd = Number(welcomeState.fs_max_win_usd || 0);
    if (vUsd > 0) {
      toast.success?.(`Using FREE SPIN ($${vUsd.toFixed(2)} • cap $${capUsd.toFixed(0)})`);
    }

    await spinOnce({ mode: "free" });
  };

  const uiBetSol = isPlaying || resultReady ? currentBetLamports / 1e9 : betAmount;
  const jackpotAmount = uiBetSol * 1000;

  // ❌ block controls when banned
  const finalButtonDisabled = isButtonDisabled || isPlaying || isBanned;

  const freeSpinsToShow = Math.max(0, freeSpinsLocal ?? Number(welcomeState?.fs_count || 0));

  return (
    <div className="min-h-screen bg-background pt-10">
      <div className="max-w-[1440px] mx-auto">
        {/* Game Area with integrated buttons */}
        <div className="flex justify-center">
          <SlotsGameArea
            betAmount={uiBetSol}
            jackpotAmount={jackpotAmount}
            lastWin={lastWin}
            autoSpin={autoSpin}
            autoSpinCount={spinsLeft > 0 && autoSpin ? spinsLeft : autoSpinCount}
            symbolsGrid={grid}
            isPlaying={isPlaying}
            balance={0}
            serverSeedHash={serverSeedHash}
            clientSeed={clientSeedRef.current || "local-client-seed"}
            nonce={nonce}
            onBetClick={() => setShowBetPopup(true)}
            onAutoSpinClick={autoSpin ? stopAutoSpin : onAutoSpin}
            spinsLeft={spinsLeft}
            isButtonDisabled={finalButtonDisabled}
            showBetPopup={showBetPopup}
            onCloseBetPopup={() => setShowBetPopup(false)}
            setBetAmount={setBetAmount}
            onPlaceBet={onSpin}
            provablyFairData={provablyFairData}
            hasError={hasSocketError}
            onClearResults={clearResults}
            soundsEnabled={soundsEnabled}
            onToggleSounds={toggleSounds}
            playSound={playSound}
            freeSpins={freeSpinsToShow}
            onFreeSpinClick={onFreeSpinClick}
          />
        </div>

        <div className="mt-8">
          <SectionAllWins />
        </div>

        <div className="mt-8">
          <SectionGames />
        </div>
      </div>

      <WalletConnectPopup
        isOpen={showWalletPopup}
        onClose={async () => {
          setShowWalletPopup(false);
          await refreshVaultStatus();
          await loadWelcomeState();
        }}
      />
    </div>
  );
}
