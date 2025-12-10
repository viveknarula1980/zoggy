// utils/hooks/useMines.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";

if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

// Prefer explicit WS var, fall back to HTTP var, finally localhost
const WS_URL =
  process.env.NEXT_PUBLIC_BACKEND_WS ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "";

export type MinesCallbacks = {
  onStarted?: (rows: number, cols: number, mines: number, nonce: string) => void;
  onSafe?: (index: number, safeCount: number, multiplier: number) => void;
  onBoom?: (index: number, safeCount: number) => void;
  onResolved?: (payoutSol: number, safeSteps: number, tx: string) => void;
  onError?: (code: string, message: string) => void;
  /** 🚀 NEW: full proof payload (serverSeedHex/hash, bombs, opened, etc.) */
  onProof?: (payload: any) => void;
};

type Phase = "idle" | "locking" | "ready" | "over";

export default function useMines(cb: MinesCallbacks = {}) {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  const socketRef = useRef<Socket | null>(null);

  const activeNonceRef = useRef<string | null>(null);

  const boardRef = useRef<{ rows: number; cols: number; mines: number }>({
    rows: 0,
    cols: 0,
    mines: 0,
  });

  const [phase, setPhase] = useState<Phase>("idle");
  const [picks, setPicks] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [boomIndex, setBoomIndex] = useState<number | null>(null);

  const ready = phase === "ready";

  useEffect(() => {
    const s = io(WS_URL, { transports: ["websocket"] });
    socketRef.current = s;

    const register = () => {
      if (publicKey) s.emit("register", { player: publicKey.toBase58() });
    };

    s.on("connect", register);
    if (s.connected) register();

    // ✅ Server signs+sends lock tx itself → we just wait for "mines:locked"
    s.on(
      "mines:locked",
      ({
        nonce,
        rows,
        cols,
        mines,
      }: {
        nonce: string | number;
        rows: number;
        cols: number;
        mines: number;
      }) => {
        activeNonceRef.current = String(nonce);

        boardRef.current = {
          rows: Number(rows),
          cols: Number(cols),
          mines: Number(mines),
        };

        setPhase("ready");
        setPicks(0);
        setMultiplier(1);
        setRevealed(new Set());
        setBoomIndex(null);

        cb.onStarted?.(Number(rows), Number(cols), Number(mines), String(nonce));
      }
    );

    s.on(
      "mines:safe",
      ({
        nonce,
        index,
        safeCount,
        multiplier,
      }: {
        nonce: string | number;
        index: number;
        safeCount: number;
        multiplier: number;
      }) => {
        if (String(nonce) !== activeNonceRef.current) return;
        setPicks(Number(safeCount));
        setMultiplier(Number(multiplier));
        setRevealed((prev) => new Set([...prev, Number(index)]));
        cb.onSafe?.(Number(index), Number(safeCount), Number(multiplier));
      }
    );

    // 💥 BOOM (includes proof data)
    s.on("mines:boom", (payload: any) => {
      const { nonce, atIndex, atStep } = payload || {};
      if (String(nonce) !== activeNonceRef.current) return;
      setPhase("over");
      setBoomIndex(Number(atIndex));
      cb.onProof?.(payload);
      cb.onBoom?.(Number(atIndex), Number(atStep));
    });

    // 🟢 RESOLVED (includes proof data)
    s.on("mines:resolved", (payload: any) => {
      const { nonce, payoutLamports, safeSteps, tx } = payload || {};
      if (String(nonce) !== activeNonceRef.current) return;
      activeNonceRef.current = null;
      setPhase("over");
      cb.onProof?.(payload);
      cb.onResolved?.(Number(payoutLamports || 0) / 1e9, Number(safeSteps || 0), String(tx || ""));
    });

    s.on("mines:error", (e: any) => {
      cb.onError?.(String(e?.code || "ERR"), String(e?.message || ""));
      if (phase === "locking") setPhase("idle");
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [WS_URL, connected, publicKey, connection]);

  const toLamports = useCallback((sol: number) => Math.round(sol * 1e9), []);

  const startGame = useCallback(
    async ({
      rows,
      cols,
      minesCount,
      betSol,
    }: {
      rows: number;
      cols: number;
      minesCount: number;
      betSol: number;
    }) => {
      if (!connected || !publicKey) throw new Error("Connect wallet first");
      activeNonceRef.current = null;
      boardRef.current = { rows: 0, cols: 0, mines: 0 };
      setPhase("locking");

      socketRef.current?.emit("mines:place", {
        player: publicKey.toBase58(),
        betAmountLamports: toLamports(betSol),
        rows,
        cols,
        minesCount,
      });
    },
    [connected, publicKey, toLamports]
  );

  const openCell = useCallback(
    async (row: number, col: number) => {
      if (!connected || !publicKey) throw new Error("Connect wallet first");
      const nonce = activeNonceRef.current;
      if (!nonce || !ready) throw new Error('Please click "Start Game"');

      socketRef.current?.emit("mines:open", {
        nonce: Number(nonce),
        row,
        col,
      });
    },
    [connected, publicKey, ready]
  );

  const cashOut = useCallback(async () => {
    if (!connected || !publicKey) throw new Error("Connect wallet first");
    const nonce = activeNonceRef.current;
    if (!nonce || !ready) throw new Error("Round not ready yet");
    if (picks < 1) throw new Error("Open at least 1 tile before cashout");

    socketRef.current?.emit("mines:cashout", { nonce: Number(nonce) });
  }, [connected, publicKey, ready, picks]);
  return {
    socket: socketRef.current, // ✅ expose live socket instance
    startGame,
    openCell,
    cashOut,
    ready,
    phase,
    picks,
    multiplier,
    revealed,
    boomIndex,
  };

}
