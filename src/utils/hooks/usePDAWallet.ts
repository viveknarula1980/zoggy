"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, AccountInfo } from "@solana/web3.js";
import { io, Socket } from "socket.io-client";

/* ======================= Types ======================= */
export interface PDAWalletState {
  balance: number;            // UI shows: promo when fake on, PDA otherwise (SOL)
  fakeBalance: number | null; // Promo balance (SOL) or null if not in fake mode
  pdaBalance: number;         // PDA vault balance (SOL)
  usingFake: boolean;         // Whether we're currently showing promo balance
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface UsePDAWalletReturn extends PDAWalletState {
  refreshBalance: () => Promise<void>;
  formatBalance: (decimals?: number) => string;
  placeBet: (amountSol: number) => void;     // deduct stake
  addWinnings: (amountSol: number) => void;  // credit net win
  applyLoss?: (amountSol: number) => void;   // optional extra deduct
  resetToInitialBalance: () => void;
}

type FakeWSStatus = {
  wallet: string;
  isFake?: boolean;
  mode?: "fake" | "real";
  promoBalanceSol?: number;
  promoBalanceLamports?: number;
  effectiveBalanceSol?: number;
  effectiveBalanceLamports?: number;
  frozenLamports?: number;
  frozenSol?: number;
  withdrawalsEnabled?: boolean;
};

/* ======================= Consts / helpers ======================= */
const LAMPORTS_PER_SOL = 1e9;
const toSol = (lamports: number) => lamports / LAMPORTS_PER_SOL;

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "5vgLU8GyehUkziMaKHCtyPu6YZgo11wct8rTHLdz4z1"
);

// Base URL (no trailing slash). Socket.IO will use `${API_BASE}/socket.io`
const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).replace(/\/+$/, "");

function getUserVaultPda(user: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_vault"), user.toBuffer()],
    PROGRAM_ID
  )[0];
}

// ---- HTTP helper for fake status fallback ----
async function fetchJson(url: string) {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function fetchFakeStatusHttp(wallet58: string): Promise<{
  usingFake: boolean;
  fakeSol: number | null;
}> {
  // primary: /admin/fake/status
  const primary = `${API_BASE}/admin/fake/status?wallet=${encodeURIComponent(wallet58)}`;
  try {
    const s = await fetchJson(primary);
    const isFake = s?.isFake ?? s?.useFake ?? (s?.mode === "fake");
    const promoLamports =
      s?.promoBalanceLamports ??
      s?.promo ??
      s?.promo_balance ??
      (s?.promoBalanceSol != null ? s.promoBalanceSol * LAMPORTS_PER_SOL : 0);
    const promoSol =
      s?.promoBalanceSol != null ? Number(s.promoBalanceSol) : toSol(Number(promoLamports || 0));

    return {
      usingFake: !!isFake,
      fakeSol: Number.isFinite(promoSol) ? promoSol : 0,
    };
  } catch {
    // fallback: /admin/fake/balance
    const fallback = `${API_BASE}/admin/fake/balance?wallet=${encodeURIComponent(wallet58)}`;
    try {
      const s = await fetchJson(fallback);
      const isFake = s?.isFake ?? s?.useFake ?? (s?.mode === "fake");
      const promoLamports =
        s?.promoBalanceLamports ??
        s?.promo ??
        s?.promo_balance ??
        (s?.promoBalanceSol != null ? s.promoBalanceSol * LAMPORTS_PER_SOL : 0);
      const promoSol =
        s?.promoBalanceSol != null ? Number(s.promoBalanceSol) : toSol(Number(promoLamports || 0));

      return {
        usingFake: !!isFake,
        fakeSol: Number.isFinite(promoSol) ? promoSol : 0,
      };
    } catch {
      return { usingFake: false, fakeSol: null };
    }
  }
}

/* ======================= Hook ======================= */
export default function usePDAWallet(): UsePDAWalletReturn {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  const abortRef = useRef({ aborted: false });
  const subIdRef = useRef<number | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEmittedRef = useRef<number>(0); // throttle updates
  const socketRef = useRef<Socket | null>(null);
  const currentWalletRef = useRef<string | null>(null);

  const [state, setState] = useState<PDAWalletState>({
    balance: 0,
    fakeBalance: null,
    pdaBalance: 0,
    usingFake: false,
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  const applyBalances = useCallback(
    (next: { pdaSol?: number; fakeSol?: number | null; usingFake?: boolean }) => {
      setState((prev) => {
        const usingFake = next.usingFake ?? prev.usingFake;
        const pdaBalance = next.pdaSol ?? prev.pdaBalance;
        const fakeBalance = usingFake ? (next.fakeSol ?? prev.fakeBalance ?? 0) : null;
        const balance = usingFake ? (fakeBalance ?? 0) : pdaBalance;

        return {
          ...prev,
          balance,
          pdaBalance,
          fakeBalance,
          usingFake,
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
        };
      });
    },
    []
  );

  const readPdaSolOnce = useCallback(
    async (pda: PublicKey) => {
      const acct = await connection.getAccountInfo(pda, "confirmed");
      return toSol(acct?.lamports ?? 0);
    },
    [connection]
  );

  // ----- Socket helpers (WS) -----
  const teardownSocket = useCallback(() => {
    const s = socketRef.current;
    if (s) {
      s.off("connect");
      s.off("disconnect");
      s.off("connect_error");
      s.off("fake:status");
      s.off("fake:update");
      s.off("fake:mode");
      s.off("fake:refresh");
      s.off("fake:error");
      s.disconnect();
    }
    socketRef.current = null;
  }, []);

  const ensureSocket = useCallback(
    (wallet58: string) => {
      if (!wallet58) {
        teardownSocket();
        return;
      }

      // Reconnect if wallet changed
      if (socketRef.current) {
        if (currentWalletRef.current === wallet58) return;
        teardownSocket();
      }

      currentWalletRef.current = wallet58;

      const s = io(API_BASE, {
        transports: ["websocket"],
        withCredentials: true,
        auth: { wallet: wallet58 }, // server can auto-scope room by wallet
      });

      s.on("connect", () => {
        // Subscribe & request immediate snapshot
        s.emit("fake:subscribe", { wallet: wallet58 });
        s.emit("fake:get", { wallet: wallet58 });
      });

      // Initial + on-demand snapshot from server
      s.on("fake:status", (payload: FakeWSStatus) => {
        if (!payload || payload.wallet !== currentWalletRef.current) return;
        const isFake = payload.isFake ?? (payload.mode === "fake");
        const fakeSol =
          payload.promoBalanceSol ??
          (payload.promoBalanceLamports != null ? toSol(payload.promoBalanceLamports) : null);
        applyBalances({
          fakeSol,
          usingFake: isFake == null ? undefined : !!isFake,
        });
      });

      // LIVE incremental updates (wins/losses/admin grants) -> instant UI update
      s.on("fake:update", (payload: FakeWSStatus) => {
        if (!payload || payload.wallet !== currentWalletRef.current) return;
        const isFake = payload.isFake ?? (payload.mode === "fake");
        const fakeSol =
          payload.promoBalanceSol ??
          (payload.promoBalanceLamports != null ? toSol(payload.promoBalanceLamports) : null);
        applyBalances({
          fakeSol,
          usingFake: isFake == null ? undefined : !!isFake,
        });
      });

      // Server explicitly toggled mode (fake <-> real)
      s.on("fake:mode", (payload: { wallet: string; enabled: boolean }) => {
        if (!payload || payload.wallet !== currentWalletRef.current) return;
        applyBalances({ usingFake: !!payload.enabled });
        // Ask for a fresh snapshot after mode flip
        s.emit("fake:get", { wallet: payload.wallet });
      });

      // Server wants client to re-pull a snapshot (e.g. after batch ops)
      s.on("fake:refresh", (payload: { wallet?: string }) => {
        const w = payload?.wallet ?? currentWalletRef.current;
        if (!w || w !== currentWalletRef.current) return;
        s.emit("fake:get", { wallet: w });
      });

      s.on("fake:error", (e: any) => {
        setState((p) => ({
          ...p,
          error: String(e?.message || "fake:error"),
          lastUpdated: new Date(),
        }));
      });

      s.on("connect_error", (err) => {
        setState((p) => ({
          ...p,
          error: err?.message || "socket connect error",
          lastUpdated: new Date(),
        }));
      });

      s.on("disconnect", () => {
        // Keep current balances; connection restarts will re-subscribe
      });

      socketRef.current = s;
    },
    [applyBalances, teardownSocket]
  );

  // ---- HTTP sync for fake balance (fallback / hard sync after game) ----
  const syncFakeFromBackend = useCallback(async () => {
    try {
      if (!connected || !publicKey) return;
      const wallet58 = publicKey.toBase58();
      const { usingFake, fakeSol } = await fetchFakeStatusHttp(wallet58);
      if (abortRef.current.aborted) return;
      applyBalances({ fakeSol, usingFake });
    } catch (e) {
      // silent fail; don't spam UI
      console.warn("[usePDAWallet] syncFakeFromBackend error:", (e as any)?.message || e);
    }
  }, [connected, publicKey, applyBalances]);

  const refreshBalance = useCallback(async () => {
    setState((p) => ({ ...p, isLoading: true, error: null }));
    try {
      if (!connected || !publicKey) {
        setState({
          balance: 0,
          fakeBalance: null,
          pdaBalance: 0,
          usingFake: false,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
        });
        teardownSocket();
        currentWalletRef.current = null;
        return;
      }

      const wallet58 = publicKey.toBase58();
      ensureSocket(wallet58); // WS up; server will push latest fake snapshot if implemented

      const pda = getUserVaultPda(publicKey);
      const pdaSol = await readPdaSolOnce(pda);
      if (abortRef.current.aborted) return;

      // Update PDA now
      applyBalances({ pdaSol });

      // Nudge WS backend (if supported)
      socketRef.current?.emit("fake:get", { wallet: wallet58 });

      // Also hard-sync fake balance via HTTP (works even if WS side not implemented)
      await syncFakeFromBackend();
    } catch (err: any) {
      if (abortRef.current.aborted) return;
      console.error("[usePDAWallet] refreshBalance error:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to refresh balances",
        lastUpdated: new Date(),
      }));
    }
  }, [
    connected,
    publicKey,
    applyBalances,
    readPdaSolOnce,
    ensureSocket,
    teardownSocket,
    syncFakeFromBackend,
  ]);

  /* ---------- live PDA subscription + polling fallback ---------- */
  const clearSubscription = useCallback(() => {
    if (subIdRef.current !== null) {
      try {
        connection.removeAccountChangeListener(subIdRef.current);
      } catch {}
    }
    subIdRef.current = null;

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, [connection]);

  const startWatchingPda = useCallback(async () => {
    clearSubscription();

    if (!connected || !publicKey) return;

    const pda = getUserVaultPda(publicKey);

    // 1) WS subscription (fast path). Requires a WS-enabled RPC URL.
    try {
      subIdRef.current = connection.onAccountChange(
        pda,
        (info: AccountInfo<Buffer>) => {
          const now = Date.now();
          if (now - lastEmittedRef.current < 250) return;
          lastEmittedRef.current = now;

          const pdaSol = toSol(info?.lamports ?? 0);
          // Update pdaBalance immediately; keep usingFake unchanged
          applyBalances({ pdaSol });
        },
        "processed"
      );
    } catch (e) {
      console.warn("[usePDAWallet] onAccountChange failed; falling back to polling:", e);
    }

    // 2) Polling fallback (also acts as a safety net if WS misses an update)
    pollTimerRef.current = setInterval(async () => {
      try {
        const current = await readPdaSolOnce(pda);
        applyBalances({ pdaSol: current });
      } catch {}
    }, 4000);
  }, [clearSubscription, connected, publicKey, connection, applyBalances, readPdaSolOnce]);

  /* ---------- optimistic helpers + backend sync ---------- */
  const placeBet = useCallback(
    (amountSol: number) => {
      if (!(amountSol > 0)) return;
      setState((prev) => {
        let nextFake = prev.fakeBalance;
        let nextPda = prev.pdaBalance;

        if (prev.usingFake) {
          nextFake = Math.max(0, (prev.fakeBalance ?? 0) - amountSol);
        } else {
          nextPda = Math.max(0, prev.pdaBalance - amountSol);
        }
        const next = prev.usingFake ? (nextFake ?? 0) : nextPda;

        window.dispatchEvent(
          new CustomEvent("betPlaced", {
            detail: { betAmount: amountSol, newBalance: next, usingFake: prev.usingFake },
          })
        );

        return {
          ...prev,
          balance: next,
          fakeBalance: nextFake,
          pdaBalance: nextPda,
          lastUpdated: new Date(),
        };
      });

      // After optimistic update, sync real promo balance from backend (especially for fake)
      if (connected && publicKey) {
        syncFakeFromBackend();
      }
    },
    [connected, publicKey, syncFakeFromBackend]
  );

  const addWinnings = useCallback(
    (amountSol: number) => {
      if (!(amountSol >= 0)) return;
      setState((prev) => {
        let nextFake = prev.fakeBalance;
        let nextPda = prev.pdaBalance;

        if (prev.usingFake) nextFake = (prev.fakeBalance ?? 0) + amountSol;
        else nextPda = prev.pdaBalance + amountSol;

        const next = prev.usingFake ? (nextFake ?? 0) : nextPda;

        window.dispatchEvent(
          new CustomEvent("gameCompleted", {
            detail: { winAmount: amountSol, newBalance: next, isWin: true, usingFake: prev.usingFake },
          })
        );

        return {
          ...prev,
          balance: next,
          fakeBalance: nextFake,
          pdaBalance: nextPda,
          lastUpdated: new Date(),
        };
      });

      if (connected && publicKey) {
        syncFakeFromBackend();
      }
    },
    [connected, publicKey, syncFakeFromBackend]
  );

  const applyLoss = useCallback(
    (amountSol: number) => {
      if (!(amountSol > 0)) return;
      setState((prev) => {
        let nextFake = prev.fakeBalance;
        let nextPda = prev.pdaBalance;

        if (prev.usingFake) nextFake = Math.max(0, (prev.fakeBalance ?? 0) - amountSol);
        else nextPda = Math.max(0, prev.pdaBalance - amountSol);

        const next = prev.usingFake ? (nextFake ?? 0) : nextPda;

        window.dispatchEvent(
          new CustomEvent("gameResolved", {
            detail: { lossAmount: amountSol, newBalance: next, isWin: false, usingFake: prev.usingFake },
          })
        );

        return {
          ...prev,
          balance: next,
          fakeBalance: nextFake,
          pdaBalance: nextPda,
          lastUpdated: new Date(),
        };
      });

      if (connected && publicKey) {
        syncFakeFromBackend();
      }
    },
    [connected, publicKey, syncFakeFromBackend]
  );

  const resetToInitialBalance = useCallback(() => {
    refreshBalance();
  }, [refreshBalance]);

  const formatBalance = useCallback(
    (decimals: number = 4) => `${state.balance.toFixed(decimals)} SOL`,
    [state.balance]
  );

  /* ---------- lifecycle ---------- */
  // Initial + explicit refresh
  useEffect(() => {
    abortRef.current.aborted = false;
    refreshBalance();
    return () => {
      abortRef.current.aborted = true;
    };
  }, [refreshBalance]);

  // Re-subscribe whenever wallet/connection changes
  useEffect(() => {
    // Socket for fake-balance
    if (connected && publicKey) {
      ensureSocket(publicKey.toBase58());
    } else {
      teardownSocket();
      currentWalletRef.current = null;
    }

    // PDA watcher
    startWatchingPda();
    return () => {
      clearSubscription();
    };
  }, [connected, publicKey, ensureSocket, teardownSocket, startWatchingPda, clearSubscription]);

  // Re-sync fake via HTTP (and optionally WS nudge) on game events
  useEffect(() => {
    if (!connected || !publicKey) return;

    const bump = () => {
      const t = setTimeout(() => {
        // Ask backend to emit current fake status (if WS is supported)
        socketRef.current?.emit("fake:get", { wallet: publicKey.toBase58() });
        // And also hard sync via HTTP
        syncFakeFromBackend();
      }, 300);
      return () => clearTimeout(t);
    };

    const onGameCompleted = () => bump();
    const onBetPlaced = () => bump();
    const onGameResolved = () => bump();

    window.addEventListener("gameCompleted", onGameCompleted);
    window.addEventListener("betPlaced", onBetPlaced);
    window.addEventListener("gameResolved", onGameResolved);

    return () => {
      window.removeEventListener("gameCompleted", onGameCompleted);
      window.removeEventListener("betPlaced", onBetPlaced);
      window.removeEventListener("gameResolved", onGameResolved);
    };
  }, [connected, publicKey, syncFakeFromBackend]);

  // 🔁 Extra: periodic polling while in FAKE mode (auto-refresh wins/losses)
  useEffect(() => {
    if (!connected || !publicKey || !state.usingFake) return;

    let stopped = false;
    const interval = setInterval(() => {
      if (stopped) return;
      syncFakeFromBackend();
    }, 3000); // every 3s; adjust if you want faster/slower

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [connected, publicKey, state.usingFake, syncFakeFromBackend]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      teardownSocket();
      currentWalletRef.current = null;
    };
  }, [teardownSocket]);

  return {
    ...state,
    refreshBalance,
    formatBalance,
    placeBet,
    addWinnings,
    applyLoss,
    resetToInitialBalance,
  };
}
