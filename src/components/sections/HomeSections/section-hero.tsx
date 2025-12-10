"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { claimWelcomeBonus, fetchWelcomeState } from "@/utils/api/profileapi";
import ToastService from "@/utils/toastService";
import WalletConnectPopup from "@/components/wallet-connect/WalletConnectPopup";
import { Scale, Lock, Zap, UserCircle } from "lucide-react";

type Props = {
    walletAddress?: string; // optional if you already have it in app state
};

const featureCards = [
    { icon: Scale, title: "PROVABLY FAIR IN", subtitle: "HOUSE GAMES", variant: "purple" as const },
    { icon: Lock, title: "NON CUSTODIAL", subtitle: "SMART VAULT", variant: "pink" as const },
    { icon: Zap, title: "WINS INSTANTLY", subtitle: "SETTLED ON-CHAIN", variant: "purple" as const },
    { icon: UserCircle, title: "ACCOUNTLESS", subtitle: "NO REGISTRATION", variant: "pink" as const },
];

// Static class map to avoid Tailwind purge issues with dynamic strings
const VARIANT_BORDER_CLASS: Record<"pink" | "purple", string> = {
    pink: "border-neon-pink/20 hover:border-neon-pink/50 bg-neon-pink/20",
    purple: "border-purple/20 hover:border-purple/50 bg-purple/20",
};

function useEffectiveWalletAddress(explicit?: string) {
    const [addr, setAddr] = useState<string>(explicit || "");

    useEffect(() => {
        if (explicit) {
            setAddr(explicit);
            return;
        }
        const read = () => {
            try {
                const w = window as any;
                const pk =
                    w?.solana?.publicKey?.toBase58?.() ||
                    w?.phantom?.solana?.publicKey?.toBase58?.() ||
                    "";
                const fromLS =
                    localStorage.getItem("wallet") ||
                    localStorage.getItem("pubkey") ||
                    localStorage.getItem("walletAddress") ||
                    "";
                setAddr(pk || fromLS || "");
            } catch {
                setAddr("");
            }
        };
        read();

        const w = window as any;
        const handler = () => read();
        w?.solana?.on?.("connect", handler);
        w?.solana?.on?.("accountChanged", handler);
        return () => {
            w?.solana?.off?.("connect", handler);
            w?.solana?.off?.("accountChanged", handler);
        };
    }, [explicit]);

    return addr;
}

/**
 * --- Helper utils (no UI changes) ---
 */

// Try to read Solana logs from a SendTransactionError (or similar object)
async function readSolanaLogs(err: any): Promise<string[]> {
    try {
        if (err?.getLogs && typeof err.getLogs === "function") {
            const logs = await err.getLogs();
            if (Array.isArray(logs)) return logs;
        }
    } catch {
        // ignore
    }
    if (Array.isArray(err?.logs)) return err.logs as string[];
    return [];
}

// Decide whether the error/logs indicate an insufficient vault balance
function includesInsufficientVault(text: string) {
    const s = (text || "").toLowerCase();
    return (
        s.includes("insufficient lamports") ||
        s.includes("insufficient funds") ||
        (s.includes("insufficient") && (s.includes("lamports") || s.includes("funds") || s.includes("balance") || s.includes("vault")))
    );
}

function isVaultInsufficientFromLogs(logs: string[]) {
    const joined = (logs || []).join("\n").toLowerCase();
    return includesInsufficientVault(joined);
}

function isVaultInsufficientFromAny(err: any) {
    if (!err) return false;
    // strings
    if (typeof err === "string") return includesInsufficientVault(err);
    // typical fields
    if (includesInsufficientVault(err?.message || "")) return true;
    if (includesInsufficientVault(err?.error || "")) return true;
    if (includesInsufficientVault(err?.reason || "")) return true;
    if (includesInsufficientVault(err?.code || "")) return true;
    return false;
}

const SectionHero: React.FC<Props> = ({ walletAddress }) => {
    const effectiveWallet = useEffectiveWalletAddress(walletAddress);

    const [isClaimingBonus, setIsClaimingBonus] = useState(false);
    const [isWalletPopupOpen, setIsWalletPopupOpen] = useState(false);

    const handleClaimBonus = async () => {
        if (isClaimingBonus) return;

        if (!effectiveWallet) {
            ToastService.error("Please connect your wallet to claim the welcome bonus.");
            setIsWalletPopupOpen(true);
            return;
        }

        setIsClaimingBonus(true);

        try {
            // Check current state first
            const state = await fetchWelcomeState(effectiveWallet);

            if (state?.status === "active" || state?.status === "cleared") {
                ToastService.info("Welcome bonus already claimed!");
                return;
            }

            if (!state || state.status === "none") {
                ToastService.error("Make your first deposit to unlock your welcome bonus.");
                return;
            }

            if (state.status !== "eligible") {
                ToastService.error("Welcome bonus not available for claiming.");
                return;
            }

            // Claim the bonus
            const result: any = await claimWelcomeBonus(effectiveWallet);

            // If API returns a structured failure, check for insufficient vault and surface the special toast
            if (!result?.ok) {
                // Try logs if the backend passed through a SendTransactionError-like object in result.error
                const maybeLogs = await readSolanaLogs(result?.error);
                if (isVaultInsufficientFromAny(result) || isVaultInsufficientFromAny(result?.error) || isVaultInsufficientFromLogs(maybeLogs)) {
                    ToastService.error("Game vault dont have enough balance please contact admin");
                    // Optional: dev console for debugging
                    if (maybeLogs?.length) console.error("Transaction logs:", maybeLogs);
                    return;
                }
                throw new Error(result?.error || "Could not claim the welcome bonus.");
            }

            if (result.alreadyClaimed) {
                ToastService.info("Welcome bonus already claimed!");
                return;
            }

            const amount = Math.floor(result.bonusUsd || 0);
            ToastService.success(`Welcome bonus claimed! $${amount} credited to your account.`, {
                duration: 5000,
            });
        } catch (error: any) {
            // If it's a SendTransactionError (web3.js), call getLogs() for full details,
            // and detect the "insufficient lamports/funds" case to show the custom toast.
            try {
                const logs = await readSolanaLogs(error);
                if (isVaultInsufficientFromLogs(logs)) {
                    ToastService.error("Game vault dont have enough balance please contact admin");
                    console.error("Transaction logs:", logs);
                    return;
                }
            } catch {
                // ignore log read failure
            }

            // Fallback: check standard fields / messages
            if (isVaultInsufficientFromAny(error)) {
                ToastService.error("Game vault dont have enough balance please contact admin");
                return;
            }

            // Example message you shared (simulation failed) will still surface here if not insufficient-balance
            // You could optionally hide raw details from users; keeping as generic for safety.
            ToastService.error(error?.message || "Failed to claim welcome bonus. Please try again.");
        } finally {
            setIsClaimingBonus(false);
        }
    };

    return (
        <section className="relative flex items-center justify-center my-3 overflow-hidden">
            <div className="glass border border-purple/20 rounded-2xl max-w-[1440px] w-full mx-auto relative overflow-hidden z-10">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-neon-pink/10 rounded-full filter blur-3xl" />
                <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-purple/10 rounded-full filter blur-3xl" />

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    {/* Welcome Bonus Card */}
                    <div className="md:w-full">
                        {/* Desktop Banner */}
                        <div className="hidden md:block">
                            <Image
                                src="/assets/banners/banner.png"
                                alt="Welcome Banner"
                                width={1440}
                                height={400}
                                priority
                                quality={90}
                                className="w-full h-auto rounded-t-xl cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={handleClaimBonus}
                            />
                        </div>

                        {/* Mobile Banner */}
                        <div className="block md:hidden">
                            <Image
                                src="/assets/banners/mobile/banner-1.png"
                                alt="Welcome Banner"
                                width={768}
                                height={400}
                                priority
                                quality={90}
                                className="w-full h-auto rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={handleClaimBonus}
                            />
                        </div>

                        {/* Feature icons */}
                        <div className="grid md:grid-cols-4 gap-4 mt-6 px-4 pb-4">
                            {featureCards.map((card, i) => {
                                const isPink = card.variant === "pink";
                                const classes = VARIANT_BORDER_CLASS[isPink ? "pink" : "purple"];
                                const IconComponent = card.icon;
                                return (
                                    <div
                                        key={i}
                                        className={`glass-card border rounded-lg p-3 flex items-center gap-3 transition-all duration-300 group ${classes}`}
                                    >
                                        <div
                                            className={`w-10 h-10 rounded-full ${
                                                isPink ? "bg-neon-pink/20" : "bg-purple/20"
                                            } flex items-center justify-center group-hover:shadow-glow transition-all`}
                                        >
                                            <IconComponent className={`w-5 h-5 ${isPink ? "text-neon-pink" : "text-purple"}`} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-soft">{card.title}</p>
                                            <p className="text-base font-bold">{card.subtitle}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Wallet Connect Popup */}
            <WalletConnectPopup
                isOpen={isWalletPopupOpen}
                onClose={() => setIsWalletPopupOpen(false)}
            />
        </section>
    );
};

export default SectionHero;
