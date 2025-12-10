// WithdrawFundsPopup.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { io, Socket } from "socket.io-client";
import { X, Wallet } from "lucide-react";
import priceService from "@/utils/priceService";

// Buffer polyfill for browsers
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

interface WithdrawFundsPopupProps {
  onClose: () => void;
  onFundsWithdrawn: () => void; // called after confirmed withdrawal
}

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
const LAMPORTS_PER_SOL = 1e9;
const DEFAULT_WITHDRAWAL_FEE_SOL = 0.001;

function toLamports(sol: number) {
  return Math.max(0, Math.round(sol * LAMPORTS_PER_SOL));
}

type VaultLockedSummary = {
  wallet: string;
  pdaLamports: number;
  baselineLockedLamports: number;
  cashExhausted: boolean;
  effectiveLockedLamports: number;
  withdrawableLamports: number;
};

export default function WithdrawFundsPopup({ onClose, onFundsWithdrawn }: WithdrawFundsPopupProps) {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [amountUsd, setAmountUsd] = useState("");
  const [solPrice, setSolPrice] = useState<number>(priceService.getCachedSolPrice());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [withdrawalFeeSol, setWithdrawalFeeSol] = useState<number>(DEFAULT_WITHDRAWAL_FEE_SOL);

  // The ONLY source of truth for totals/locked/available
  const [serverSummary, setServerSummary] = useState<VaultLockedSummary | null>(null);

  // Socket & guards
  const socketRef = useRef<Socket | null>(null);
  const processedTxsRef = useRef<Set<string>>(new Set()); // dedupe
  const pendingRef = useRef<boolean>(false);
  const signingRef = useRef<boolean>(false);
  const pendingRequestIdRef = useRef<string | null>(null);
  const bannedRef = useRef<boolean>(false); // track ban to suppress "Preparing..." text

  // ✅ Only show info text after user clicks Withdraw
  const [attempted, setAttempted] = useState(false);

  // Derived (from serverSummary)
  const totalLamports = serverSummary?.pdaLamports ?? 0;
  const lockedLamports = serverSummary?.effectiveLockedLamports ?? 0;
  const withdrawableLamports = serverSummary?.withdrawableLamports ?? 0;

  const totalSol = totalLamports / LAMPORTS_PER_SOL;
  const lockedSol = lockedLamports / LAMPORTS_PER_SOL;
  const availableSol = withdrawableLamports / LAMPORTS_PER_SOL;

  const parsedUsd = Number((amountUsd || "").trim());
  const solEquivalent = useMemo(
    () => (parsedUsd > 0 && solPrice > 0 ? parsedUsd / solPrice : 0),
    [parsedUsd, solPrice]
  );
  const totalSolWithFee = useMemo(
    () => solEquivalent + (withdrawalFeeSol || 0),
    [solEquivalent, withdrawalFeeSol]
  );
  const totalLamportsWithFee = useMemo(() => toLamports(totalSolWithFee), [totalSolWithFee]);

  // price subscription
  useEffect(() => {
    const unsub = priceService.subscribe((p: number) => {
      if (typeof p === "number" && p > 0) setSolPrice(p);
    });
    priceService.getSolPrice().then((p) => { if (p > 0) setSolPrice(p); }).catch(() => {});
    return () => { try { unsub(); } catch {} };
  }, []);

  // Clear banners on mount/open
  useEffect(() => {
    setAttempted(false);
    setInfoMsg(null);
    setErrorMsg(null);
    bannedRef.current = false;
  }, []);

  // Pull fee + locked summary from backend
  const refreshLocked = async () => {
    if (!BACKEND_URL || !publicKey) return;
    try {
      const [cfgRes, sumRes] = await Promise.all([
        fetch(`${BACKEND_URL}/vault/config`).catch(() => null),
        fetch(`${BACKEND_URL}/vault/locked?wallet=${encodeURIComponent(publicKey.toBase58())}`).catch(() => null),
      ]);
      if (cfgRes && cfgRes.ok) {
        const j = await cfgRes.json().catch(() => null);
        if (j?.withdrawalFeeSol != null) setWithdrawalFeeSol(Number(j.withdrawalFeeSol));
      }
      if (sumRes && sumRes.ok) {
        const j = await sumRes.json().catch(() => null);
        if (j && typeof j === "object") setServerSummary(j as VaultLockedSummary);
      }
    } catch {}
  };

  // Init socket
  useEffect(() => {
    if (!BACKEND_URL) return;
    const s = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = s;

    s.on("connect", () => {
      try {
        if (publicKey?.toBase58) s.emit("register", { player: publicKey.toBase58() });
      } catch {}
      refreshLocked();
    });

    s.on("vault:config", (cfg: any) => {
      try {
        if (cfg?.withdrawalFeeSol != null) setWithdrawalFeeSol(Number(cfg.withdrawalFeeSol));
      } catch {}
    });

    // unified error handler
    const handleAnyError = (e: any) => {
      const msg =
        (typeof e === "string" && e) ||
        e?.message ||
        e?.error ||
        JSON.stringify(e || "");
      const lower = (msg || "").toLowerCase();

      if (lower.includes("banned")) {
        bannedRef.current = true;
        setInfoMsg(null);
        setErrorMsg("You have been banned from this platform. Withdrawals are disabled.");
      } else {
        setErrorMsg(msg);
      }

      setIsSubmitting(false);
      pendingRef.current = false;
      signingRef.current = false;
      pendingRequestIdRef.current = null;
      refreshLocked();
    };

    s.on("vault:error", handleAnyError);
    s.on("error", handleAnyError);
    s.on("connect_error", handleAnyError);

    s.on("vault:withdraw_tx", async (payload: { transactionBase64?: string; requestId?: string }) => {
      const { transactionBase64, requestId } = payload || {};
      try {
        if (!transactionBase64) return;
        if (requestId && pendingRequestIdRef.current && requestId !== pendingRequestIdRef.current) return;
        if (processedTxsRef.current.has(transactionBase64)) return;
        processedTxsRef.current.add(transactionBase64);

        if (!connected || !publicKey) {
          setErrorMsg("Connect your wallet before approving the withdrawal transaction.");
          setIsSubmitting(false);
          pendingRef.current = false;
          pendingRequestIdRef.current = null;
          return;
        }

        if (signingRef.current) return;
        signingRef.current = true;

        const raw = Buffer.from(String(transactionBase64).trim(), "base64");
        const tx = VersionedTransaction.deserialize(raw);

        const signer = signTransaction ?? (window as any)?.solana?.signTransaction;
        if (!signer) throw new Error("Wallet does not support signTransaction for versioned transactions");

        const signed = await signer(tx);
        const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 5 });
        const conf = await connection.confirmTransaction(sig, "confirmed");
        if (conf.value.err) throw new Error(`Withdrawal failed: ${JSON.stringify(conf.value.err)}`);

        setInfoMsg("Withdrawal transaction submitted and confirmed.");
        setErrorMsg(null);
        try { onFundsWithdrawn(); } catch {}
        await refreshLocked();
      } catch (err: any) {
        setErrorMsg(String(err?.message ?? err));
      } finally {
        setIsSubmitting(false);
        pendingRef.current = false;
        signingRef.current = false;
        pendingRequestIdRef.current = null;
      }
    });

    const interval = setInterval(refreshLocked, 8000);
    return () => {
      clearInterval(interval);
      try {
        s.removeAllListeners();
        s.disconnect();
      } catch {}
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey?.toBase58()]); // re-init on wallet change

  // Max click handler: compute USD that equals withdrawable SOL (available - fee)
  function onMaxClick() {
    const withdrawableSol = Math.max(0, availableSol - (withdrawalFeeSol || 0));
    const usd = withdrawableSol * (solPrice || 1);
    setAmountUsd(usd > 0 ? usd.toFixed(2) : "0.00");
  }

  // Trigger withdraw flow
  async function handleWithdraw() {
    setErrorMsg(null);
    setInfoMsg(null);

    if (pendingRef.current) return;
    pendingRef.current = true;
    setIsSubmitting(true);

    try {
      if (!connected || !publicKey) throw new Error("Connect your wallet first.");

      const parsed = Number((amountUsd || "").trim());
      if (!amountUsd || isNaN(parsed) || parsed <= 0) throw new Error("Enter a positive USD amount to withdraw.");

      const solAmount = parsed / (solPrice || 1);
      if (solAmount <= 0) throw new Error("Amount too small after conversion.");

      if (solAmount + (withdrawalFeeSol || 0) > availableSol + 1e-12) {
        throw new Error("Insufficient available balance to cover amount + withdrawal fee.");
      }

      const clientRequestId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      pendingRequestIdRef.current = clientRequestId;

      socketRef.current?.emit("vault:withdraw_prepare", {
        player: publicKey.toBase58(),
        amountLamports: toLamports(solAmount), // server enforces allowed amount
        withdrawAddress: publicKey.toBase58(),
        clientRequestId,
      });

      // show the info line ONLY after user clicked
      setAttempted(true);

      // don't show if banned
      if (!bannedRef.current) {
        setInfoMsg("Preparing withdrawal on server. You will be prompted by your wallet to sign when ready.");
      }
    } catch (err: any) {
      setErrorMsg(String(err?.message ?? err));
      setIsSubmitting(false);
      pendingRef.current = false;
      pendingRequestIdRef.current = null;
    }
  }

  return (
    <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background-secondary rounded-2xl p-4 sm:p-6 w-[90%] sm:w-[420px] max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 flex justify-between items-center border-b border-soft/30">
          <h3 className="text-light text-lg sm:text-xl font-bold">Withdraw Funds</h3>
          <button onClick={onClose} className="text-soft hover:text-neon-pink cursor-pointer transition-colors">
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Balance Display */}
        <div className="mb-3 sm:mb-4">
          <label className="text-light text-xs sm:text-sm mb-1.5 sm:mb-2 block">Wallet Balance</label>
          <div className="p-3 bg-background/40 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-light text-sm">Available:</span>
              <div className="text-right">
                <div className="text-light font-semibold">${(availableSol * solPrice).toFixed(2)}</div>
                <div className="text-soft text-xs">{availableSol.toFixed(6)} SOL</div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-light text-sm">Locked / Pending:</span>
              <div className="text-right">
                <div className="text-light font-medium">${(lockedSol * solPrice).toFixed(2)}</div>
                <div className="text-soft text-xs">{lockedSol.toFixed(6)} SOL</div>
              </div>
            </div>

            <div className="border-t border-soft/20 mt-2 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-light text-sm font-medium">Total (on-chain):</span>
                <div className="text-right">
                  <div className="text-light font-semibold">${(totalSol * solPrice).toFixed(2)}</div>
                  <div className="text-soft text-xs">{totalSol.toFixed(6)} SOL</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Withdrawal Address */}
        <div className="mb-3 sm:mb-4">
          <label className="text-light text-xs sm:text-sm mb-1.5 sm:mb-2 block">Withdrawal Address</label>
          <div className="bg-background/40 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-neon-pink" />
              <div className="text-light text-sm font-mono">
                {publicKey ? `${publicKey.toString().slice(0, 8)}...${publicKey.toString().slice(-8)}` : "Not connected"}
              </div>
            </div>
            <div className="text-soft text-[10px] sm:text-xs mt-1">
              Funds will be sent to your connected wallet. Server builds a transaction and you sign to release funds.
            </div>
          </div>
        </div>

        {/* Amount Input (USD) */}
        <div className="mb-3 sm:mb-4">
          <label className="text-light text-xs sm:text-sm mb-1.5 sm:mb-2 block">Amount to Withdraw (USD)</label>
          <div className="relative bg-background/40 rounded-lg">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-soft text-sm sm:text-base">$</div>
            <input
              inputMode="decimal"
              type="number"
              step="0.01"
              min="0"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent rounded-lg pl-8 pr-16 py-2.5 sm:py-3 text-sm sm:text-base text-light placeholder-soft hover:border-purple/50 focus:border-neon-pink focus:outline-none transition-colors"
            />
            <button
              onClick={onMaxClick}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neon-pink text-xs sm:text-sm font-medium hover:text-neon-pink/80 transition-colors"
            >
              Max
            </button>
          </div>

          <div className="text-soft text-[10px] sm:text-xs mt-1 px-1">
            {parsedUsd > 0 ? (
              <>
                ≈ <strong>{solEquivalent.toFixed(6)}</strong> SOL + <strong>{withdrawalFeeSol.toFixed(6)}</strong> SOL fee ={" "}
                <strong>{totalSolWithFee.toFixed(6)}</strong> SOL total ({totalLamportsWithFee.toLocaleString()} lamports)
              </>
            ) : (
              <>Withdrawal fee: {withdrawalFeeSol.toFixed(6)} SOL</>
            )}
          </div>
        </div>

        {/* Error / Info */}
        {errorMsg && <div className="mb-3 text-red-400 text-sm font-medium">{errorMsg}</div>}
        {attempted && infoMsg && <div className="mb-3 text-green-300 text-sm">{infoMsg}</div>}

        {/* Withdraw Button */}
        <button
          onClick={handleWithdraw}
          disabled={
            isSubmitting ||
            !publicKey ||
            !connected ||
            !amountUsd ||
            isNaN(parsedUsd) ||
            parsedUsd <= 0 ||
            (solEquivalent + (withdrawalFeeSol || 0)) > availableSol
          }
          className="w-full bg-neon-pink text-light py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base hover:bg-neon-pink/90 disabled:bg-neon-pink/50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {isSubmitting ? "Processing..." : "Withdraw Funds"}
        </button>
      </div>
    </div>
  );
}
