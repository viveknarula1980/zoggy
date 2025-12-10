"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { Lock, Zap, RefreshCw } from "lucide-react";
import AddFundsPopup from "./AddFundsPopup";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import priceService from "@/utils/priceService";

// Buffer polyfill (for PDA derivation)
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

interface AddFundsStepProps {
  selectedWallet: string | null;
  onBack: () => void;
  onComplete: () => void;
}

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "5vgLU8GyehUkziMaKHCtyPu6YZgo11wct8rTHLdz4z1"
);

// user_vault PDA = seed("user_vault", userPubkey)
const getUserVaultPda = (pk: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("user_vault"), pk.toBuffer()], PROGRAM_ID)[0];

const USD_THRESHOLD = 1; // if vault > $1, skip this step

const AddFundsStep = ({ selectedWallet, onBack, onComplete }: AddFundsStepProps) => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();

  const [showAddFundsPopup, setShowAddFundsPopup] = useState(false);

  // hidden logic (no UI changes)
  const [solPrice, setSolPrice] = useState<number>(priceService.getCachedSolPrice() || 0);
  const [vaultLamports, setVaultLamports] = useState<number | null>(null);
  const completedOnceRef = useRef(false);

  // Subscribe to SOL price (gracefully ignore failures)
  useEffect(() => {
    const unsub = priceService.subscribe((p) => {
      if (typeof p === "number" && !Number.isNaN(p)) setSolPrice(p);
    });
    priceService.getSolPrice().then((p) => {
      if (typeof p === "number" && !Number.isNaN(p)) setSolPrice(p);
    }).catch(() => {});
    return () => unsub();
  }, []);

  // Fetch vault balance (and whether vault exists)
  const refreshVaultBalance = async (): Promise<number> => {
    try {
      if (!connected || !publicKey) {
        setVaultLamports(0);
        return 0;
      }
      const uv = getUserVaultPda(publicKey);
      const acc = await connection.getAccountInfo(uv, "confirmed");
      if (!acc) {
        setVaultLamports(0); // vault not created yet
        return 0;
      }
      const bal = await connection.getBalance(uv, "confirmed");
      setVaultLamports(bal);
      return bal;
    } catch {
      setVaultLamports(0);
      return 0;
    }
  };

  // Initial + wallet-change check (+ focus re-check)
  useEffect(() => {
    refreshVaultBalance();
    const onFocus = () => refreshVaultBalance();
    if (typeof window !== "undefined") window.addEventListener("focus", onFocus);
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  // Auto-skip this step when vault USD value > threshold
  useEffect(() => {
    if (completedOnceRef.current) return;
    if (vaultLamports == null || solPrice <= 0) return; // need both values to decide
    const usd = (vaultLamports / 1e9) * solPrice;
    if (usd > USD_THRESHOLD) {
      completedOnceRef.current = true;
      onComplete(); // advance to next step
    }
  }, [vaultLamports, solPrice, onComplete]);

  const handleAddFundsClick = () => setShowAddFundsPopup(true);
  const handlePopupClose = () => setShowAddFundsPopup(false);

  const handleFundsAdded = async () => {
    setShowAddFundsPopup(false);
    // Refresh and re-check threshold using fresh values (avoid brief blank/flicker)
    const bal = await refreshVaultBalance();
    const price = solPrice;
    if (price > 0) {
      const usd = (bal / 1e9) * price;
      if (usd > USD_THRESHOLD) {
        completedOnceRef.current = true;
        onComplete();
      }
    } else {
      // If price unknown, assume success and move on
      completedOnceRef.current = true;
      onComplete();
    }
  };

  // IMPORTANT: Do NOT return null while checking; render the UI immediately to avoid blank flicker.
  // Parent will unmount this step after onComplete(), so no extra UI changes are needed.

  return (
    <>
      <div className="h-full">
        <div className="flex flex-col md:flex-row gap-6 h-full">
          <div className="md:w-1/2 h-[200px] md:h-full flex justify-center">
            <div className="w-full h-full glass-dark rounded-2xl flex items-center justify-center border border-purple/30 relative overflow-hidden">
              <Image
                src="/assets/Zoggy-rank-icons/avatar8.png"
                alt="Add funds illustration"
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
            </div>
          </div>
          {/* Description */}
          <div className="md:w-1/2 flex flex-col gap-4 md:gap-6 py-1">
            <div className="mb-4 md:mb-8 h-full flex flex-col items-start gap-4 md:gap-6 text-left">
              <div>
                <h4 className="text-neon-pink text-sm md:text-md mb-1 font-bold">Step 3 of 3</h4>
                <h2 className="text-2xl md:text-4xl font-bold text-light">ADD FUNDS</h2>
              </div>
              <p className="text-soft w-full md:w-[90%] text-sm md:text-base">
                Add funds to your smart vault to start playing. You maintain full control over your funds at all times.
              </p>
              {/* Features list */}
              <div className="space-y-4 md:space-y-6 w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 glass-dark rounded-md flex items-center justify-center">
                    <Lock className="w-5 h-5 md:w-6 md:h-6 text-neon-pink" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-light font-medium text-sm md:text-base">Secure on-chain</span>
                    <span className="text-soft text-xs md:text-sm">transactions</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 glass-dark rounded-md flex items-center justify-center">
                    <Zap className="w-5 h-5 md:w-6 md:h-6 text-neon-pink" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-light font-medium text-sm md:text-base">Multiple token</span>
                    <span className="text-soft text-xs md:text-sm">support</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 glass-dark rounded-md flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 md:w-6 md:h-6 text-neon-pink" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-light font-medium text-sm md:text-base">Cross-chain swap</span>
                    <span className="text-soft text-xs md:text-sm">available</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Action buttons */}
            <div className="">
              <button
                onClick={handleAddFundsClick}
                className="w-full bg-neon-pink text-light py-3 md:py-4 rounded-xl font-semibold text-base md:text-lg hover:bg-neon-pink/80 hover:cursor-pointer transition-all duration-300"
              >
                Add Funds
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Funds Popup */}
      {showAddFundsPopup && (
        <AddFundsPopup onClose={handlePopupClose} onFundsAdded={handleFundsAdded} />
      )}
    </>
  );
};

export default AddFundsStep;
