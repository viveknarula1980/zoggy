"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Lock, Zap, Shield } from "lucide-react";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { io, Socket } from "socket.io-client";
import useToast from "@/utils/hooks/useToast"; // ✅ your existing toast hook

// ───────────────────────────────── Buffer polyfill (browser) ─────────────────────────────────
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

interface ActivateVaultStepProps {
  selectedWallet: string | null;
  onBack: () => void;
  onComplete: () => void; // will be called immediately if vault already exists
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "";

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "5vgLU8GyehUkziMaKHCtyPu6YZgo11wct8rTHLdz4z1"
);

// PDA: user_vault = seed("user_vault", userPubkey)
const getUserVaultPda = (pk: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("user_vault"), pk.toBuffer()], PROGRAM_ID)[0];

const ActivateVaultStep = ({ selectedWallet, onBack, onComplete }: ActivateVaultStepProps) => {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const socketRef = useRef<Socket | null>(null);
  const toast = useToast();

  // Control rendering so the popup never shows if the vault is already created
  const [shouldRender, setShouldRender] = useState(true);
  const completedOnceRef = useRef(false);

  // ─────────────────────────────── 1) Pre-check: skip popup if vault exists ───────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const checkVault = async () => {
      try {
        if (!connected || !publicKey) {
          setShouldRender(true);
          return;
        }
        // Quick on-chain check for the PDA account
        const uv = getUserVaultPda(publicKey);
        const acc = await connection.getAccountInfo(uv, "confirmed");

        if (!cancelled && acc) {
          // Vault already created → skip this step entirely
          if (!completedOnceRef.current) {
            completedOnceRef.current = true;
            onComplete();
          }
          setShouldRender(false);
        } else {
          setShouldRender(true);
        }
      } catch {
        if (!cancelled) setShouldRender(true);
      }
    };

    checkVault();

    const onFocus = () => checkVault();
    if (typeof window !== "undefined") window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") window.removeEventListener("focus", onFocus);
    };
  }, [connected, publicKey, connection, onComplete]);

  // ─────────────────────────────── 2) Socket setup for activation flow ───────────────────────────────
  useEffect(() => {
    const s = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = s;

    const registerNow = () => {
      s.emit("register", { player: publicKey?.toBase58() || "guest" });
    };
    s.on("connect", registerNow);
    if (s.connected) registerNow();

    s.on("vault:activate_tx", async ({ transactionBase64 }: { transactionBase64: string }) => {
      try {
        if (!connected || !publicKey) throw new Error("Connect your wallet first.");

        const raw = Buffer.from(String(transactionBase64).trim(), "base64");
        const tx = VersionedTransaction.deserialize(raw);

        const signer =
          signTransaction ?? (typeof window !== "undefined" ? (window as any)?.solana?.signTransaction : null);
        if (!signer) throw new Error("Wallet does not support signTransaction");

        const signed = await signer(tx);
        const sig = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          maxRetries: 5,
        });
        const conf = await connection.confirmTransaction(sig, "confirmed");
        if (conf.value.err) throw new Error(`Activate vault failed: ${JSON.stringify(conf.value.err)}`);

        // ✅ Double-check PDA exists
        try {
          const uv = getUserVaultPda(publicKey);
          await connection.getAccountInfo(uv, "confirmed");
        } catch {}

        toast.success("Vault activated successfully!");

        if (!completedOnceRef.current) {
          completedOnceRef.current = true;
          onComplete();
        }
      } catch (err: any) {
        console.error("[vault] activate error:", err);
        toast.error(err.message || "Vault activation failed.");
      }
    });

    s.on("vault:error", (e: any) => {
      console.error("WS vault error:", e);
      toast.error("Backend vault error. Please try again later.");
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, [connected, publicKey, signTransaction, connection, toast, onComplete]);

  // ─────────────────────────────── 3) User action with SOL balance check ───────────────────────────────
  const handleActivateClick = async () => {
    try {
      if (!connected || !publicKey) {
        toast.error("Connect your wallet first.");
        return;
      }

      // 🔥 Check user's SOL balance before triggering backend
      const rentNeeded = await connection.getMinimumBalanceForRentExemption(120); // approx UserVault.LEN
      const balance = await connection.getBalance(publicKey);

      if (balance < rentNeeded) {
        toast.error(
          "You don’t have enough SOL to activate your vault. Please deposit at least 0.04 SOL to your wallet."
        );
        return;
      }

      // Request backend to build vault transaction
      socketRef.current?.emit("vault:activate_prepare", {
        player: publicKey.toBase58(),
        initialDepositLamports: 0,
      });

      toast.info("Preparing vault activation transaction...");
    } catch (err: any) {
      console.error("[vault] activation click error:", err);
      toast.error("Something went wrong while preparing vault activation.");
    }
  };

  if (!shouldRender) return null;

  // ─────────────────────────────── UI ───────────────────────────────
  return (
    <div className="h-full">
      <div className="flex flex-col md:flex-row gap-6 h-full">
        <div className="md:w-1/2 h-[200px] md:h-full flex justify-center">
          <div className="w-full h-full glass-dark rounded-2xl flex items-center justify-center border border-purple/30 relative overflow-hidden">
            <Image
              src="/assets/Zoggy-rank-icons/avatar8.png"
              alt="Smart vault illustration"
              fill
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
              priority
            />
          </div>
        </div>

        <div className="md:w-1/2 flex flex-col gap-4 md:gap-6 py-1">
          <div className="mb-4 md:mb-8 h-full flex flex-col items-start gap-4 md:gap-6 text-left">
            <div>
              <h4 className="text-neon-pink text-sm md:text-md mb-1 font-bold">Step 2 of 3</h4>
              <h2 className="text-2xl md:text-4xl font-bold text-light">ACTIVATE SMART VAULT</h2>
            </div>
            <p className="text-soft text-sm md:text-base w-full md:w-[90%]">
              Smart vault keeps your funds in your control at all times. Using secure smart contracts, the casino never
              has access to your money.
            </p>

            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 glass-dark rounded-md flex items-center justify-center">
                  <Lock className="w-5 h-5 md:w-6 md:h-6 text-neon-pink" />
                </div>
                <div className="flex flex-col">
                  <span className="text-light font-medium text-sm md:text-base">Full control over your</span>
                  <span className="text-soft text-xs md:text-sm">funds at all times</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 glass-dark rounded-md flex items-center justify-center">
                  <Zap className="w-5 h-5 md:w-6 md:h-6 text-neon-pink" />
                </div>
                <div className="flex flex-col">
                  <span className="text-light font-medium text-sm md:text-base">Instant on-chain</span>
                  <span className="text-soft text-xs md:text-sm">settlement</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 glass-dark rounded-md flex items-center justify-center">
                  <Shield className="w-5 h-5 md:w-6 md:h-6 text-neon-pink" />
                </div>
                <div className="flex flex-col">
                  <span className="text-light font-medium text-sm md:text-base">No account or KYC</span>
                  <span className="text-soft text-xs md:text-sm">required</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={handleActivateClick}
              className="w-full bg-neon-pink text-light py-2.5 md:py-4 rounded-xl font-semibold text-base md:text-lg hover:bg-neon-pink/80 hover:cursor-pointer transition-all duration-300"
            >
              Activate Smart Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivateVaultStep;
