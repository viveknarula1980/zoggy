"use client";

import React, { useEffect, useRef, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { io, Socket } from "socket.io-client";
import { ChevronRight, X } from "lucide-react";
import priceService from "@/utils/priceService";
import useToast from "@/utils/hooks/useToast";
import WalletConnectPopup from "@/components/wallet-connect/WalletConnectPopup"; 

// Buffer polyfill for browsers
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

interface AddFundsPopupProps {
  onClose: () => void;
  onFundsAdded: () => void; // called after confirmed deposit
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "5vgLU8GyehUkziMaKHCtyPu6YZgo11wct8rTHLdz4z1"
);

// user_vault PDA = seed("user_vault", userPubkey)
const getUserVaultPda = (pk: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("user_vault"), pk.toBuffer()], PROGRAM_ID)[0];

// small helper
function toLamports(sol: number) {
  return Math.round(sol * 1e9);
}

const AddFundsPopup = ({ onClose, onFundsAdded }: AddFundsPopupProps) => {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const socketRef = useRef<Socket | null>(null);

  const [amount, setAmount] = useState("");
  const [maxAmount] = useState("0.09744"); 
  const [solPrice, setSolPrice] = useState<number>(priceService.getCachedSolPrice() || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  
  const [showWalletPopup, setShowWalletPopup] = useState(false);

  const crossChainTokens = [
    { symbol: "BTC", icon: "₿" },
    { symbol: "ETH", icon: "Ξ" },
    { symbol: "USDC", icon: "$" },
    { symbol: "PEPE", icon: "🅿" },
  ];

  // toast helpers
  const { loading, success, error, dismiss } = useToast();
  const progressToastId = useRef<string | undefined>(undefined);

  const showOrReplaceLoading = (msg: string) => {
    if (progressToastId.current) dismiss(progressToastId.current);
    progressToastId.current = loading(msg);
  };

  const clearLoading = () => {
    if (progressToastId.current) {
      dismiss(progressToastId.current);
      progressToastId.current = undefined;
    }
  };

  const isInsufficientLamportsErr = (e: any): boolean => {
    const msg = (e?.message || "").toLowerCase();
    if (msg.includes("insufficient lamports")) return true;
    const logs: string[] | undefined =
      e?.logs || e?.value?.logs || e?.transactionMessage || e?.simulationResponse?.logs;
    if (Array.isArray(logs)) {
      return logs.some((line) => line.toLowerCase().includes("insufficient lamports"));
    }
    try {
      const maybe = JSON.parse(e?.message || "null");
      if (Array.isArray(maybe?.logs)) {
        return maybe.logs.some((l: string) => l.toLowerCase().includes("insufficient lamports"));
      }
    } catch {}
    return false;
  };

  // Setup socket + price updates
  useEffect(() => {
    const s = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = s;

    const registerNow = () => {
      s.emit("register", { player: publicKey?.toBase58() || "guest" });
    };
    s.on("connect", registerNow);
    if (s.connected) registerNow();

    const unsubscribe = priceService.subscribe((newPrice) => {
      if (typeof newPrice === "number" && !Number.isNaN(newPrice)) setSolPrice(newPrice);
    });
    priceService
      .getSolPrice()
      .then((p) => {
        if (typeof p === "number" && !Number.isNaN(p)) setSolPrice(p);
      })
      .catch(() => {});

    // Handle deposit tx from backend
    s.on("vault:deposit_tx", async ({ transactionBase64 }: { transactionBase64: string }) => {
      try {
        if (!connected || !publicKey) throw new Error("Connect your wallet first.");

        showOrReplaceLoading("Confirm in wallet & sending transaction…");

        const raw = Buffer.from(String(transactionBase64).trim(), "base64");
        const tx = VersionedTransaction.deserialize(raw);

        const signer = signTransaction ?? (window as any)?.solana?.signTransaction;
        if (!signer) throw new Error("Wallet does not support signTransaction");

        const signed = await signer(tx);
        const sig = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          maxRetries: 5,
        });

        showOrReplaceLoading("Waiting for confirmation…");

        const conf = await connection.confirmTransaction(sig, "confirmed");
        if (conf.value.err) throw new Error(`Deposit failed: ${JSON.stringify(conf.value.err)}`);

        clearLoading();
        success("Funds added successfully!");
        onFundsAdded();
        setTimeout(() => onClose(), 1500);
      } catch (e: any) {
        console.error("[vault] deposit error:", e);
        clearLoading();
        if (isInsufficientLamportsErr(e)) {
          error("You don’t have enough balance to deposit.");
        } else {
          error(e?.message || "Deposit failed. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    });

    s.on("vault:error", (e: any) => {
      console.error("WS vault error:", e);
      clearLoading();
      if (isInsufficientLamportsErr(e)) {
        error("You don’t have enough balance to deposit.");
      } else {
        error(typeof e === "string" ? e : e?.message || "Something went wrong.");
      }
      setIsSubmitting(false);
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, signTransaction, connection]);

  // ---- client-side precheck: wallet balance vs requested deposit ----
  const precheckBalance = async (neededLamports: number) => {
    if (!publicKey) return true;
    try {
      // tiny buffer for fees during normal deposits
      const FEE_BUFFER = 0.00002 * LAMPORTS_PER_SOL; // ~20k lamports
      const balance = await connection.getBalance(publicKey, "processed");
      return balance >= neededLamports + FEE_BUFFER;
    } catch {
      return true;
    }
  };

  // ---- vault existence check ----
  const checkVaultExists = async (): Promise<boolean> => {
    if (!publicKey) return false;
    try {
      const uv = getUserVaultPda(publicKey);
      const acc = await connection.getAccountInfo(uv, "confirmed");
      return !!acc;
    } catch {
      return false;
    }
  };

  /**
   * MAX button:
   * - Uses real Phantom balance
   * - Always keeps 0.02 SOL **in the wallet** (for rent/fees)
   * - Converts the remainder to USD and fills the input
   * - Everything else stays the same as your original code
   */
  const handleMaxClick = async () => {
    try {
      if (!connected || !publicKey) {
        setShowWalletPopup(true);
        return;
      }
      if (!solPrice || solPrice <= 0) {
        error("Live SOL price unavailable (CORS blocked). Please refresh or try again shortly.");
        return;
      }

      const balanceLamports = await connection.getBalance(publicKey, "processed");
      const reserveLamports = Math.round(0.02 * LAMPORTS_PER_SOL); // keep 0.02 SOL
      const spendableLamports = Math.max(0, balanceLamports - reserveLamports);

      if (spendableLamports <= 0) {
        error("Not enough SOL after reserving 0.02 SOL for network fees.");
        return;
      }

      const spendableUsd = (spendableLamports / LAMPORTS_PER_SOL) * solPrice;
      // floor to 2 decimals to avoid rounding up
      const floored = Math.floor(spendableUsd * 100) / 100;
      setAmount(floored.toFixed(2));
    } catch (e) {
      console.error("handleMaxClick error:", e);
      error("Could not fetch wallet balance.");
    }
  };

  const handleAddFunds = async () => {
    try {
      if (!connected || !publicKey) {
        setShowWalletPopup(true);
        return;
      }
      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a positive amount.");
      if (!solPrice || solPrice <= 0) {
        error("Live SOL price unavailable (CORS blocked). Please refresh or try again shortly.");
        return;
      }

      // Gate: vault must exist
      const hasVault = await checkVaultExists();
      if (!hasVault) {
        setShowWalletPopup(true);
        return;
      }

      // Convert USD amount to SOL for backend
      const solAmount = parseFloat(amount) / solPrice;
      const lamportsNeeded = toLamports(solAmount);

      // precheck wallet balance
      const ok = await precheckBalance(lamportsNeeded);
      if (!ok) {
        error("You don’t have enough balance to deposit.");
        return;
      }

      setIsSubmitting(true);
      showOrReplaceLoading("Preparing deposit…");

      socketRef.current?.emit("vault:deposit_prepare", {
        player: publicKey.toBase58(),
        amountLamports: lamportsNeeded,
      });
    } catch (e: any) {
      console.error("[vault] add funds click error:", e);
      clearLoading();
      if (isInsufficientLamportsErr(e)) {
        error("You don’t have enough balance to deposit.");
      } else {
        error(e?.message || "Could not start deposit.");
      }
      setIsSubmitting(false);
    }
  };

  const usdToSolHint =
    amount && parseFloat(amount) > 0 && solPrice
      ? `≈ ${(parseFloat(amount) / solPrice).toFixed(4)} SOL`
      : "Enter amount to see SOL equivalent";

  return (
    <>
      <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-background-secondary rounded-2xl p-4 sm:p-6 w-[90%] sm:w-[400px] max-h-[90vh] overflow-y-auto custom-scrollbar relative">
          {/* Header */}
          <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 flex justify-between items-center border-b border-soft/30">
            <h3 className="text-light text-lg sm:text-xl font-bold">Add Funds</h3>
            <button
              onClick={onClose}
              className="text-soft hover:text-neon-pink cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Amount Input - USD */}
          <div className="mb-3 sm:mb-4">
            <label className="text-light text-xs sm:text-sm mb-1.5 sm:mb-2 block">
              Amount to Add (USD)
            </label>
            <div className="relative bg-background/40 rounded-lg">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-soft text-sm sm:text-base">
                $
              </div>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent rounded-lg pl-8 pr-16 py-2.5 sm:py-3 text-sm sm:text-base text-light placeholder-soft hover:border-purple/50 focus:border-neon-pink focus:outline-none transition-colors"
              />
              <button
                onClick={handleMaxClick}
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neon-pink text-xs sm:text-sm font-medium hover:text-neon-pink/80 transition-colors"
              >
                Max
              </button>
            </div>
            <div className="text-soft text-[10px] sm:text-xs mt-1 px-1">{usdToSolHint}</div>
          </div>

          {/* Add Funds Button */}
          <button
            onClick={handleAddFunds}
            disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
            className="w-full bg-neon-pink text-light py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base hover:bg-neon-pink/90 disabled:bg-neon-pink/50 disabled:cursor-not-allowed transition-all duration-300 mb-3 sm:mb-4"
          >
            {isSubmitting ? "Processing..." : "Add Funds"}
          </button>

          {/* Cross Chain Swap Section */}
          <div className="border-t border-soft/30 pt-3 sm:pt-4">
            <div className="text-light text-sm sm:text-md font-semibold mb-2 sm:mb-3 px-1">
              Don't have Tokens on Solana?
            </div>

            <div className="bg-background/40 group flex justify-between items-center rounded-lg py-2.5 sm:py-3 px-3 sm:px-4 mb-2 sm:mb-3 hover:bg-background/60 hover:cursor-pointer">
              <div>
                <div className="text-light text-sm sm:text-md font-medium">Cross Chain Swap</div>
                <div className="flex gap-[1px]">
                  {crossChainTokens.map((token, index) => (
                    <div key={token.symbol} className="flex items-center rounded py-0.5 sm:py-1">
                      <span className="text-soft text-[10px] sm:text-xs">{token.symbol}</span>
                      {index !== crossChainTokens.length - 1 ? (
                        <span className="text-soft text-[10px] sm:text-xs">,</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                {crossChainTokens.map((token) => (
                  <div
                    key={token.symbol}
                    className="flex items-center justify-center p-1.5 sm:p-2 w-5 h-5 sm:w-6 sm:h-6 bg-background-secondary rounded-full"
                  >
                    <span className="text-sm sm:text-md">{token.icon}</span>
                  </div>
                ))}
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-neon-pink" />
              </div>
            </div>

            <button className="w-full bg-background/40 text-light py-2.5 sm:py-3 rounded-lg text-sm sm:text-base hover:bg-neon-pink hover:cursor-pointer">
              Don't Have Crypto?
            </button>
          </div>

          {/* Submitting overlay */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
              <div className="text-soft text-sm">Waiting for wallet confirmation…</div>
            </div>
          )}
        </div>
      </div>

      {}
      <WalletConnectPopup
        isOpen={showWalletPopup}
        onClose={async () => {
          setShowWalletPopup(false);
          try {
            if (connected && publicKey) {
              const uv = getUserVaultPda(publicKey);
              await connection.getAccountInfo(uv, "confirmed");
            }
          } catch {}
        }}
      />
    </>
  );
};

export default AddFundsPopup;
