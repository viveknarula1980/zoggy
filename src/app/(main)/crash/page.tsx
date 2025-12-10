// app/crash/CrashPage.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import io, { Socket } from "socket.io-client";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import CrashControls from "@/components/crash/CrashControls";
import CrashGameArea from "@/components/crash/CrashGameArea";
import SectionAllWins from "@/components/sections/HomeSections/section-all-wins";
import SectionGames from "@/components/sections/HomeSections/section-games";
import { usdToSol } from "@/utils/currency";
import { useGameSounds, CRASH_SOUNDS } from "@/hooks/useGameSounds";

// ✅ Wallet + Smart Vault popup (same component used on Dice/Plinko)
import WalletConnectPopup from "@/components/wallet-connect/WalletConnectPopup";

// ✅ toast (show errors in toast; no inline error UI)
import useToast from "@/utils/hooks/useToast";

// Buffer polyfill (browser) for PDA derivation
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !(window as any).Buffer) (window as any).Buffer = Buffer;

// ---------- ENV ----------
const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS || "";
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "5vgLU8GyehUkziMaKHCtyPu6YZgo11wct8rTHLdz4z1"
);

// Use a dedicated VAULT_PROGRAM_ID if you have one; otherwise fall back to PROGRAM_ID
const VAULT_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_VAULT_PROGRAM_ID ||
    process.env.NEXT_PUBLIC_PROGRAM_ID ||
    PROGRAM_ID.toBase58()
);

// ---------- Helpers ----------
const getUserVaultPda = (owner: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("user_vault"), owner.toBuffer()], VAULT_PROGRAM_ID)[0];

const toLamports = (sol: number) => Math.round(sol * 1e9);
const toStr = (x: unknown) => {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof (x as any)?.message === "string") return String((x as any).message);
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
};

// small helper: cryptographically-strong client seed
function cryptoRandomSeed() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const a = new Uint8Array(16);
    window.crypto.getRandomValues(a);
    return Array.from(a).map((n) => n.toString(16).padStart(2, "0")).join("");
  }
  return Math.floor(Math.random() * 1e16).toString(16);
}

// modal data type (same shape used elsewhere; includes hmac for HMAC check tab)
type PFModalData =
  | {
      dicereveal_seed?: {
        nonce: string;
        clientSeed: string;
        formula: string;
        serverSeedHashed: string; // SHA-256(serverSeedHex) commitment
        serverSeedHex?: string; // revealed after resolve
        hmacHex?: string; // HMAC(serverSeed, clientSeed+nonce) used for crash point derivation
      };
    }
  | null;

export default function CrashPage() {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const toast = useToast();

  // Initialize game sounds
  const { soundsEnabled, toggleSounds, playSound } = useGameSounds(CRASH_SOUNDS);

  const [betAmount, setBetAmount] = useState(usdToSol(1));
  const [autoMode, setAutoMode] = useState(false);
  const [multiplierTarget, setMultiplierTarget] = useState(2);

  const [isPlaying, setIsPlaying] = useState(false);
  const [nonce, setNonce] = useState<string | null>(null);
  const [startTs, setStartTs] = useState<number | null>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState(0);
  // keep state but don't render errors inline
  const [_errorMsg, setErrorMsg] = useState<string | null>(null);

  const [gameResult, setGameResult] = useState<{
    type: "win" | "loss" | null;
    multiplier: number | null;
    winAmount: number;
  }>({ type: null, multiplier: null, winAmount: 0 });

  // Provably Fair Data (shown in common modal)
  const [provablyFairData, setProvablyFairData] = useState<PFModalData>(null);

  // ------- Smart Vault state -------
  const [vaultActivated, setVaultActivated] = useState<boolean>(false);
  const [showWalletPopup, setShowWalletPopup] = useState<boolean>(false);

  // ------- Fake/Promo (logic only; no UI) -------
  const [promoActive, setPromoActive] = useState<boolean>(false);
  const [promoBalanceLamports, setPromoBalanceLamports] = useState<number>(0);

  // --------- refs for latest values inside socket listeners ---------
  const socketRef = useRef<Socket | null>(null);
  const nonceRef = useRef<string | null>(null);
  const autoModeRef = useRef(false);
  const targetRef = useRef(2);
  const isPlayingRef = useRef(false);
  const suppressDisconnectToastRef = useRef(false);
  const lastClientSeedRef = useRef<string>(""); // ✅ remember client seed for PF modal

  useEffect(() => {
    nonceRef.current = nonce;
  }, [nonce]);
  useEffect(() => {
    autoModeRef.current = autoMode;
  }, [autoMode]);
  useEffect(() => {
    targetRef.current = multiplierTarget;
  }, [multiplierTarget]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // 🔔 Patch console.error to also toast (dedup within ~1.5s)
  useEffect(() => {
    const origError = console.error;
    const lastMsgRef = { msg: "", t: 0 };
    console.error = (...args: unknown[]) => {
      try {
        const msg = args.map(toStr).join(" ");
        const now = Date.now();
        if (msg && (msg !== lastMsgRef.msg || now - lastMsgRef.t > 1500)) {
          if ((toast as any)?.gameError) (toast as any).gameError(msg);
          else if ((toast as any)?.error) (toast as any).error(msg);
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

  // ---------- connect socket ONCE ----------
  useEffect(() => {
    const s = io(WS_URL, { transports: ["websocket"] });
    socketRef.current = s;

    s.on("connect_error", (e: unknown) => {
  console.error(`WS connect error: ${toStr(e)}`);
});
s.on("reconnect_error", (e: unknown) => {
  console.error(`WS reconnect error: ${toStr(e)}`);
});
s.on("disconnect", (reason) => {
  // suppress duplicate toast if ban triggered disconnect
  if (suppressDisconnectToastRef.current) {
    suppressDisconnectToastRef.current = false;
    return;
  }
  console.error(`Disconnected: ${reason}`);
});

// 🚫 handle user ban (toast only)
s.on("error", (data: any) => {
  const msg = typeof data === "object" ? data?.error || data?.message : data;
  if (msg && msg.toLowerCase().includes("banned")) {
    suppressDisconnectToastRef.current = true;
    toast.gameError("You have been banned from this platform.");
    setTimeout(() => s.disconnect(), 150);
    return;
  }
  if (msg) toast.gameError(msg);
});

s.on("crash:error", (data: any) => {
  const msg = typeof data === "object" ? data?.error || data?.message : data;
  if (msg && msg.toLowerCase().includes("banned")) {
    suppressDisconnectToastRef.current = true;
    toast.gameError("You have been banned from this platform.");
    setTimeout(() => s.disconnect(), 150);
    return;
  }
  console.error(msg || "crash:error");
  setIsPlaying(false);
});


    // ----- Optional: backend may ACK with promo/fake info on register -----
    s.on(
      "register:ack",
      (payload: { promoActive?: boolean; promoBalanceLamports?: number; effectiveBalanceLamports?: number } = {}
      ) => {
        if (typeof payload.promoActive === "boolean") setPromoActive(payload.promoActive);
        const bal =
          typeof payload.effectiveBalanceLamports !== "undefined"
            ? payload.effectiveBalanceLamports
            : payload.promoBalanceLamports;
        if (typeof bal !== "undefined") setPromoBalanceLamports(Number(bal) || 0);
      }
    );
    // Ask + listen for promo updates if your backend emits these generic events
    if (publicKey) s.emit("promo:status", { player: publicKey.toBase58() });
    s.on(
      "promo:status",
      (payload: { active?: boolean; balanceLamports?: number; effectiveBalanceLamports?: number } = {}
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
      "promo:update",
      (payload: { active?: boolean; balanceLamports?: number; effectiveBalanceLamports?: number } = {}
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
      (payload: { balanceLamports?: number; effectiveBalanceLamports?: number } = {}
      ) => {
        const bal =
          typeof payload.effectiveBalanceLamports !== "undefined"
            ? payload.effectiveBalanceLamports
            : payload.balanceLamports;
        if (typeof bal !== "undefined") setPromoBalanceLamports(Number(bal) || 0);
      }
    );

    // ---- server confirms lock (round started) ----
    s.on(
      "crash:locked",
      ({
        nonce: n,
        serverSeedHash,
      }: {
        nonce: string;
        txSig?: string;
        serverSeedHash?: string;
      }) => {
        console.log(`Crash game locked: nonce=${n}, serverSeedHash=${serverSeedHash}`);
        setNonce(n);
        setIsPlaying(true);
        setGameResult({ type: null, multiplier: null, winAmount: 0 });
        setCurrentMultiplier(0);
        setStartTs(Date.now());

        // store commitment + our clientSeed for the modal
        setProvablyFairData({
          dicereveal_seed: {
            nonce: String(n),
            clientSeed: lastClientSeedRef.current || "",
            serverSeedHashed: serverSeedHash || "",
            serverSeedHex: "",
            hmacHex: "",
            formula:
              "HMAC_SHA256(serverSeed, clientSeed + nonce) → first 8 bytes → u64 >> 11 / 2^53 → multiplier",
          },
        });
      }
    );

    // ---- live ticks (server-driven animation) ----
    s.on("crash:tick", ({ nonce: n, multiplier }: { nonce: string; multiplier: number }) => {
      if (!nonceRef.current || String(n) !== String(nonceRef.current)) {
        console.log(`Tick ignored: nonce mismatch. Expected: ${nonceRef.current}, Got: ${n}`);
        return;
      }

      const m = Number(multiplier) || 0;
      console.log(`Crash tick received: multiplier=${m}x, nonce=${n}`);
      setCurrentMultiplier(m);

      // client auto-cashout gate
      if (autoModeRef.current && isPlayingRef.current && m >= targetRef.current) {
        s.emit("crash:cashout", {
          player: publicKey?.toBase58(),
          nonce: nonceRef.current,
          atMultiplier: m,
        });
      }
    });

    //crashed (loss)
    s.on("crash:crashed", ({ nonce: n, finalMultiplier }: { nonce: string; finalMultiplier: number }) => {
      if (!nonceRef.current || String(n) !== String(nonceRef.current)) return;
      console.log(`Crash game crashed: finalMultiplier=${finalMultiplier}x, nonce=${n}`);
      setIsPlaying(false);
      const m = Number(finalMultiplier) || 0;
      setGameResult({ type: "loss", multiplier: m, winAmount: betAmount });
      setNonce(null);

      // If fake balance is used server-side, refresh it optimistically:
      if (promoActive && publicKey?.toBase58()) fetchPromoStatus(publicKey.toBase58());

      // Auto re-bet if auto mode is still enabled
      if (autoModeRef.current && publicKey) {
        setTimeout(() => {
          if (autoModeRef.current && !isPlayingRef.current) {
            const seed = cryptoRandomSeed();
            lastClientSeedRef.current = seed;

            s.emit("crash:prepare_lock", {
              player: publicKey.toBase58(),
              betAmountLamports: toLamports(betAmount),
              clientSeed: seed,
              ...(promoActive
                ? {
                    isFake: true,
                    mode: "fake",
                    effectiveBalanceLamports: Number(promoBalanceLamports) || 0,
                  }
                : {}),
            });
          }
        }, 2000);
      }
    });

    //resolved (win or loss)
    s.on(
      "crash:resolved",
      (payload: {
        nonce: string | number;
        multiplierBps?: number | string;
        payoutLamports?: number | string;
        serverSeedHex?: string;
        hmacHex?: string;
        clientSeed?: string;
        formula?: string;
      }) => {
        const { nonce: n, multiplierBps, payoutLamports } = payload;
        if (!nonceRef.current || String(n) !== String(nonceRef.current)) return;

        const m = (Number(multiplierBps) || 10000) / 10000;
        const payout = Number(payoutLamports) / 1e9; // net profit only
        const isWin = payout > 0;

        setIsPlaying(false);
        setGameResult({
          type: isWin ? "win" : "loss",
          multiplier: m,
          winAmount: isWin ? payout : betAmount,
        });
        setNonce(null);

        // If the backend already included reveal fields, fill them now too
        if (payload.serverSeedHex) {
          setProvablyFairData((prev) => ({
            dicereveal_seed: {
              nonce: String(n),
              clientSeed:
                lastClientSeedRef.current || payload.clientSeed || prev?.dicereveal_seed?.clientSeed || "",
              formula:
                payload.formula ||
                prev?.dicereveal_seed?.formula ||
                "HMAC_SHA256(serverSeed, clientSeed + nonce) → first 8 bytes → u64 >> 11 / 2^53 → multiplier",
              serverSeedHashed: prev?.dicereveal_seed?.serverSeedHashed || "",
              serverSeedHex: payload.serverSeedHex,
              hmacHex: payload.hmacHex || "",
            },
          }));
        }

        // If fake balance is used server-side, refresh it optimistically:
        if (promoActive && publicKey?.toBase58()) fetchPromoStatus(publicKey.toBase58());

        // Auto re-bet if auto mode is still enabled
        if (autoModeRef.current && publicKey) {
          setTimeout(() => {
            if (autoModeRef.current && !isPlayingRef.current) {
              const seed = cryptoRandomSeed();
              lastClientSeedRef.current = seed;

              s.emit("crash:prepare_lock", {
                player: publicKey.toBase58(),
                betAmountLamports: toLamports(betAmount),
                clientSeed: seed,
                ...(promoActive
                  ? {
                      isFake: true,
                      mode: "fake",
                      effectiveBalanceLamports: Number(promoBalanceLamports) || 0,
                    }
                  : {}),
              });
            }
          }, 2000);
        }
      }
    );

    // dedicated reveal event (server emits right after resolve)
    s.on(
      "crash:reveal_seed",
      (payload: {
        nonce: string | number;
        serverSeedHex: string;
        clientSeed?: string;
        formula?: string;
        hmacHex?: string;
      }) => {
        const { nonce: n, serverSeedHex, clientSeed, formula, hmacHex } = payload || {};
        setProvablyFairData((prev) => ({
          dicereveal_seed: {
            nonce: String(n),
            clientSeed: lastClientSeedRef.current || clientSeed || prev?.dicereveal_seed?.clientSeed || "",
            formula:
              formula ||
              prev?.dicereveal_seed?.formula ||
              "HMAC_SHA256(serverSeed, clientSeed + nonce) → first 8 bytes → u64 >> 11 / 2^53 → multiplier",
            serverSeedHashed: prev?.dicereveal_seed?.serverSeedHashed || "",
            serverSeedHex: serverSeedHex || prev?.dicereveal_seed?.serverSeedHex || "",
            hmacHex: hmacHex || prev?.dicereveal_seed?.hmacHex || "",
          },
        }));
      }
    );

    s.on("crash/error", (e: unknown) => {
      setErrorMsg(`${toStr((e as any)?.code || "ERR")}: ${toStr((e as any)?.message || "")}`);
      console.error(`${toStr((e as any)?.code || "ERR")}: ${toStr((e as any)?.message || "")}`);
      setIsPlaying(false);
    });

    return () => {
      try {
        s.removeAllListeners();
        s.disconnect();
      } catch {}
      socketRef.current = null;
    };
  }, [publicKey, promoActive, promoBalanceLamports, betAmount]);

  // (re)register player when wallet changes
  useEffect(() => {
    if (socketRef.current && publicKey) {
      socketRef.current.emit("register", { player: publicKey.toBase58() });
    }
  }, [publicKey]);

  // Fake/Promo status (HTTP probe) 
  const fetchPromoStatus = useCallback(
    async (walletBase58: string) => {
      if (!walletBase58) {
        setPromoActive(false);
        setPromoBalanceLamports(0);
        return;
      }
      const candidates = API_BASE
        ? [
            `${API_BASE}/admin/fake/status?wallet=${encodeURIComponent(walletBase58)}`,
            `${API_BASE}/fake/status?wallet=${encodeURIComponent(walletBase58)}`,
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

          // treat isFake or mode:'fake' as active too
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

  // ---------- Vault existence check ----------
  useEffect(() => {
    (async () => {
      try {
        if (!connected || !publicKey) {
          setVaultActivated(false);
          return;
        }
        if (promoActive) {
          // skip PDA guard when in fake/promo mode
          setVaultActivated(true);
          return;
        }
        const uv = getUserVaultPda(publicKey);
        const ai = await connection.getAccountInfo(uv, "confirmed");
        setVaultActivated(!!ai);
      } catch (e) {
        console.error(e);
        setVaultActivated(false);
      }
    })();
  }, [connected, publicKey, connection, promoActive]);

  const refreshVaultStatus = useCallback(async () => {
    try {
      if (!connected || !publicKey) {
        setVaultActivated(false);
        return false;
      }
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
      console.error(e);
      setVaultActivated(false);
      return false;
    }
  }, [connected, publicKey, connection, promoActive]);

  // Keep fake/promo status synced with wallet
  useEffect(() => {
    if (publicKey?.toBase58()) fetchPromoStatus(publicKey.toBase58());
    else {
      setPromoActive(false);
      setPromoBalanceLamports(0);
    }
  }, [publicKey, fetchPromoStatus]);

  // ---------- actions ----------
  // Clear results function for auto-hide and manual clearing
  const clearResults = useCallback(() => {
    setGameResult({ type: null, multiplier: null, winAmount: 0 });
    setProvablyFairData(null);
  }, []);

  const handleStartGame = useCallback(async () => {
    clearResults(); // ✅ clear results immediately when starting new game
    setProvablyFairData(null); // ✅ clear PF data at the start of a new round

    // ✅ Gate by wallet + vault. If not ready, open popup.
    const isReady = !!publicKey && connected && (promoActive || vaultActivated);
    if (!isReady) {
      setShowWalletPopup(true);
      return;
    }

    // ✅ Balance guard before placing — use promo/fake balance if active
    try {
      const need = toLamports(betAmount);
      if (need <= 0) {
        console.error("Bet must be greater than 0");
        return;
      }

      if (promoActive) {
        if (promoBalanceLamports < need) {
          console.error("Insufficient coins to play this game.");
          return;
        }
      } else {
        const uv = getUserVaultPda(publicKey!);
        const bal = await connection.getBalance(uv, "confirmed");
        if (bal < need) {
          console.error("Insufficient coins to play this game.");
          return;
        }
      }
    } catch (e) {
      console.error(e);
      return;
    }

    // Generate and keep a per-round clientSeed
    const seed = cryptoRandomSeed();
    lastClientSeedRef.current = seed;

    socketRef.current?.emit("crash:prepare_lock", {
      player: publicKey!.toBase58(),
      betAmountLamports: toLamports(betAmount),
      clientSeed: seed, // ✅ important for provable fairness
      ...(promoActive
        ? {
            isFake: true,
            mode: "fake",
            effectiveBalanceLamports: Number(promoBalanceLamports) || 0,
          }
        : {}),
    });
  }, [
    connected,
    publicKey,
    vaultActivated,
    betAmount,
    connection,
    promoActive,
    promoBalanceLamports,
    clearResults,
  ]);

  const handleCashOut = useCallback(
    (at?: number) => {
      if (!connected || !publicKey || !nonceRef.current) return;
      socketRef.current?.emit("crash:cashout", {
        player: publicKey.toBase58(),
        nonce: nonceRef.current,
        atMultiplier: at ?? currentMultiplier,
      });
    },
    [connected, publicKey, currentMultiplier]
  );

  const handleStopAuto = useCallback(() => setAutoMode(false), []);

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

        {/* ❗ No inline error UI — errors go to toast via console.error */}

        <div className="flex flex-col-reverse lg:flex-row gap-4">
          <CrashControls
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            multiplier={multiplierTarget}
            setMultiplier={setMultiplierTarget}
            autoMode={autoMode}
            setAutoMode={setAutoMode}
            isPlaying={isPlaying}
            onStartGame={handleStartGame}
            onCashOut={() => handleCashOut()}
            onStopAuto={handleStopAuto}
            currentMultiplier={currentMultiplier}
            provablyFairData={provablyFairData}
            soundsEnabled={soundsEnabled}
            onToggleSounds={toggleSounds}
          />

          <div className="flex-1">
            <CrashGameArea
              betAmount={betAmount}
              isPlaying={isPlaying}
              startTs={startTs}
              multiplier={currentMultiplier}
              crashed={!isPlaying && !!gameResult.type && gameResult.type === "loss"}
              onCashOut={handleCashOut}
              onClearResults={clearResults}
              gameResult={gameResult}
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

      {/* ✅ Smart Vault popup — opens when wallet or vault isn't ready */}
      <WalletConnectPopup
        isOpen={showWalletPopup}
        onClose={async () => {
          setShowWalletPopup(false);
          await refreshVaultStatus(); // so user can hit Start immediately after closing
          if (publicKey?.toBase58()) fetchPromoStatus(publicKey.toBase58());
        }}
      />
    </div>
  );
}
