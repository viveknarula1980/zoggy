"use client";

import { X, Gift, User, Clock, DollarSign, Hash, Calendar } from "lucide-react";
import { ChestData } from "./ChestTable";

interface ChestDetailsPopupProps {
    chest: ChestData;
    onClose: () => void;
}

export default function ChestDetailsPopup({ chest, onClose }: ChestDetailsPopupProps) {
    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "claimed":
                return "text-green-400 bg-green-500/20 border-green-500/30";
            case "available":
                return "text-blue-400 bg-blue-500/20 border-blue-500/30";
            case "expired":
                return "text-red-400 bg-red-500/20 border-red-500/30";
            default:
                return "text-soft bg-background/20 border-soft/30";
        }
    };

    const getChestTypeColor = (type: string) => {
        switch (type) {
            case "daily":
                return "text-blue-400 bg-blue-500/20";
            case "weekly":
                return "text-purple-400 bg-purple-500/20";
            case "premium":
                return "text-yellow-400 bg-yellow-500/20";
            case "bonus":
                return "text-neon-pink bg-neon-pink/20";
            default:
                return "text-soft bg-background/20";
        }
    };

    const formatUser = (user: string, walletAddress: string) => {
        if (user && user !== walletAddress) {
            return user;
        }
        return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    };

    return (
        <div className="fixed inset-0 bg-background-secondary/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-background-secondary backdrop-blur-md rounded-xl border border-soft/10 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-soft/10">
                    <div className="flex items-center gap-3">
                        <Gift className="w-6 h-6 text-neon-pink" />
                        <h2 className="text-xl font-bold text-light">Chest Details</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-background/50 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-soft hover:text-light" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-light mb-4">Chest Information</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <Hash className="w-4 h-4 text-soft" />
                                <div>
                                    <p className="text-soft text-sm">Chest ID</p>
                                    <p className="text-light font-medium">{chest.id}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Gift className="w-4 h-4 text-soft" />
                                <div>
                                    <p className="text-soft text-sm">Type</p>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getChestTypeColor(chest.chestType)}`}>{chest.chestType.charAt(0).toUpperCase() + chest.chestType.slice(1)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-soft" />
                                <div>
                                    <p className="text-soft text-sm">Status</p>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(chest.status)}`}>{chest.status.charAt(0).toUpperCase() + chest.status.slice(1)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <DollarSign className="w-4 h-4 text-soft" />
                                <div>
                                    <p className="text-soft text-sm">Reward Value</p>
                                    <p className="text-light font-medium text-lg">
                                        {chest.rewardValue} {chest.rewardType}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Details */}
                    {chest.status === "claimed" && (
                        <div className="border-t border-soft/10 pt-4 mt-6">
                            <h3 className="text-lg font-semibold text-light mb-4">Transaction Details</h3>

                            <div className="bg-background/30 border border-soft/20 rounded-lg p-4">
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <p className="text-soft text-sm">Wallet Address</p>
                                        <p className="text-light font-mono text-sm break-all">{chest.walletAddress}</p>
                                    </div>
                                    <div>
                                        <p className="text-soft text-sm">Transaction Hash</p>
                                        <p className="text-light font-mono text-sm break-all">tx_{chest.id}_claimed</p>
                                    </div>
                                    <div>
                                        <p className="text-soft text-sm">Claimed At</p>
                                        <p className="text-light text-sm">{chest.claimedAt ? formatDateTime(chest.claimedAt) : "N/A"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
