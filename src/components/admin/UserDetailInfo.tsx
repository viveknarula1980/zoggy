"use client";

import { useEffect, useState } from "react";
import { User } from "@/utils/api/usersApi";
import BalanceManagement from "./BalanceManagement";
import WithdrawalControls from "./WithdrawalControls";
import { solToUsd } from "@/utils/currency"; // ✅ convert SOL → USD
import { Copy, Check, CheckCircle, Loader2, Ban, ShieldCheck, XCircle } from "lucide-react";

interface UserDetailInfoProps {
    user: User;
    onStatusUpdate: (status: "active" | "disabled" | "banned") => void;
    updating: boolean;
}

type FakeStatus = {
    wallet: string;
    isFake: boolean;
    mode: "fake" | "real";
    promoBalanceLamports: number;
    promoBalanceSol: number;
    effectiveBalanceLamports: number;
    effectiveBalanceSol: number;
    frozenLamports: number;
    frozenSol: number;
    withdrawalsEnabled: boolean;
};

const API_BASE_RAW = (process.env.NEXT_PUBLIC_API_BASE || "http://34.63.31.167:4000").replace(/\/$/, "");

export default function UserDetailInfo({ user, onStatusUpdate, updating }: UserDetailInfoProps) {
    const [copySuccess, setCopySuccess] = useState(false);
    const [currentUser, setCurrentUser] = useState(user);
    const [balanceUpdating, setBalanceUpdating] = useState(false);
    const [withdrawalUpdating, setWithdrawalUpdating] = useState(false);

    // ---- Fake balance state ----
    const [fakeStatus, setFakeStatus] = useState<FakeStatus | null>(null);
    const [fakeLoading, setFakeLoading] = useState<boolean>(false);
    const walletForFake =
        currentUser.walletAddress ||
        (currentUser as any)?.wallet ||
        (currentUser as any)?.publicKey ||
        "";

    useEffect(() => {
        const fetchFake = async () => {
            if (!walletForFake) return;
            try {
                setFakeLoading(true);
                const res = await fetch(
                    `${API_BASE_RAW}/admin/fake/status?wallet=${encodeURIComponent(walletForFake)}`,
                    { credentials: "include" }
                );
                if (res.ok) {
                    const data = (await res.json()) as FakeStatus;
                    setFakeStatus(data);
                } else {
                    setFakeStatus(null);
                }
            } catch (e) {
                console.error("Failed to fetch fake status", e);
                setFakeStatus(null);
            } finally {
                setFakeLoading(false);
            }
        };
        fetchFake();
    }, [walletForFake, currentUser?.id]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "bg-green-500/20 text-green-400 border-green-500/30";
            case "disabled":
                return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
            case "banned":
                return "bg-red-500/20 text-red-400 border-red-500/30";
            default:
                return "bg-gray-500/20 text-gray-400 border-gray-500/30";
        }
    };

    const formatWalletAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-6)}`;
    };

    const formatUSD = (amount: number) => {
        return `$${Number(amount || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    // Handler functions for balance and withdrawal management
    const handleBalanceUpdate = (newBalance: number) => {
        setCurrentUser(prev => ({ ...prev, pdaBalance: newBalance }));
    };

    const handleWithdrawalPermissionUpdate = (withdrawalsEnabled: boolean) => {
        setCurrentUser(prev => ({ ...prev, withdrawalsEnabled }));
    };

    // Functions for API integration
    const handleEnableUser = async () => {
        // TODO: Implement API call to enable user
        console.log("Enabling user:", user.id);
        onStatusUpdate("active");
    };

    const handleDisableUser = async () => {
        // TODO: Implement API call to disable user
        console.log("Disabling user:", user.id);
        onStatusUpdate("disabled");
    };

    const handleBanUser = async () => {
        // TODO: Implement API call to ban user
        console.log("Banning user:", user.id);
        onStatusUpdate("banned");
    };

    // Compute fake balance in USD (using promo or effective — choose one; here we use promo)
    const fakeUsd = fakeStatus ? solToUsd(fakeStatus.promoBalanceSol) : 0;

    return (
        <div className="space-y-4">
            {/* User Profile Card */}
            <div className="glass rounded-xl p-6 border border-soft/10 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-neon-pink to-neon-blue rounded-full flex items-center justify-center text-xl font-bold text-white">
                            {currentUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{currentUser.username}</h2>
                            <p className="text-sm text-gray-400">ID: {currentUser.id}</p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(currentUser.status)}`}>
                        {currentUser.status.toUpperCase()}
                    </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Wallet */}
                    <div className="bg-card/20 rounded-lg p-3 flex flex-col">
                        <h3 className="text-xs font-medium text-soft mb-1">Wallet Address</h3>
                        <div className="flex items-center gap-2 truncate">
                            <span className="text-white font-mono text-sm truncate">
                                {formatWalletAddress(currentUser.walletAddress)}
                            </span>
                            <button
                                onClick={() => copyToClipboard(currentUser.walletAddress)}
                                className="text-soft hover:text-white transition-colors text-xs cursor-pointer"
                                title="Copy full address"
                            >
                                {copySuccess ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* PDA Balance */}
                    <div className="bg-card/20 rounded-lg p-3 flex flex-col">
                        <h3 className="text-xs font-medium text-soft mb-1">PDA Balance</h3>
                        <p className="text-white font-bold text-sm">
                            {formatUSD(currentUser.pdaBalance)}
                        </p>
                    </div>

                    {/* Fake/Promo Balance (USD) */}
                    <div className="bg-card/20 rounded-lg p-3 flex flex-col">
                        <h3 className="text-xs font-medium text-soft mb-1">Fake Balance</h3>
                        <p className="text-white font-bold text-sm">
                            {fakeLoading ? "Loading…" : formatUSD(fakeUsd)}
                        </p>
                    </div>

                    {/* Withdrawal Status */}
                    <div className="bg-card/20 rounded-lg p-3 flex flex-col">
                        <h3 className="text-xs font-medium text-soft mb-1">Withdrawals</h3>
                        <div className={`flex items-center gap-1 text-sm font-medium ${currentUser.withdrawalsEnabled ? "text-green-400" : "text-red-400"}`}>
                            {currentUser.withdrawalsEnabled ? (
                                <><CheckCircle className="w-4 h-4" /> Enabled</>
                            ) : (
                                <><XCircle className="w-4 h-4" /> Blocked</>
                            )}
                        </div>
                    </div>

                    {/* Favorite Game */}
                    <div className="bg-card/20 rounded-lg p-3 flex flex-col">
                        <h3 className="text-xs font-medium text-soft mb-1">Favorite Game</h3>
                        <p className="text-white text-sm capitalize">{currentUser.favoriteGame || "None"}</p>
                    </div>

                    {/* Joined */}
                    <div className="bg-card/20 rounded-lg p-3 flex flex-col">
                        <h3 className="text-xs font-medium text-soft mb-1">Joined</h3>
                        <p className="text-white text-sm">{new Date(currentUser.joinedAt).toLocaleDateString()}</p>
                    </div>

                    {/* Last Active */}
                    <div className="bg-card/20 rounded-lg p-3 flex flex-col">
                        <h3 className="text-xs font-medium text-soft mb-1">Last Active</h3>
                        <p className="text-white text-sm">{new Date(currentUser.lastActive).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* User Management Actions */}
                <div className="">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleEnableUser}
                            disabled={currentUser.status === "active" || updating}
                            className="px-3 py-2 bg-green-500/80 border border-green-500/30 text-white rounded-lg hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Enable
                        </button>
                        <button
                            onClick={handleBanUser}
                            disabled={currentUser.status === "banned" || updating}
                            className="px-3 py-2 bg-red-500/80 border border-red-500/30 text-white rounded-lg hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />} Ban
                        </button>
                    </div>
                </div>
            </div>

            {/* Gaming Statistics */}
            <div className="glass rounded-lg p-4 border border-soft/10">
                <h3 className="text-base font-semibold text-white mb-3">Gaming Statistics</h3>
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-card/20 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-white">{currentUser.totalBets.toLocaleString()}</div>
                        <div className="text-xs text-soft">Total Bets</div>
                    </div>
                    <div className="bg-card/20 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-green-400">{currentUser.totalWins.toLocaleString()}</div>
                        <div className="text-xs text-soft">Total Wins</div>
                    </div>
                    <div className="bg-card/20 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-red-400">{currentUser.totalLosses.toLocaleString()}</div>
                        <div className="text-xs text-soft">Total Losses</div>
                    </div>
                    <div className="bg-card/20 rounded-lg p-3 text-center">
                        <div className={`text-lg font-bold ${currentUser.winRate >= 50 ? "text-green-400" : currentUser.winRate >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                            {currentUser.winRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-soft">Win Rate</div>
                    </div>
                </div>
            </div>

            {/* Balance Management */}
            <BalanceManagement
                user={currentUser}
                onBalanceUpdate={handleBalanceUpdate}
                updating={balanceUpdating}
                setUpdating={setBalanceUpdating}
            />

            {/* Withdrawal Controls */}
            <WithdrawalControls
                user={currentUser}
                onWithdrawalPermissionUpdate={handleWithdrawalPermissionUpdate}
                updating={withdrawalUpdating}
                setUpdating={setWithdrawalUpdating}
            />
        </div>
    );
}
