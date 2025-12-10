"use client";

import { Gift } from "lucide-react";

// Simple date formatting helper
const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
};

export interface ChestData {
    id: string;
    walletAddress: string;
    chestType: "daily" | "weekly" | "premium" | "bonus";
    status: "claimed" | "available" | "expired";
    claimedAt?: string;
    expiresAt: string;
    rewardValue: number;
    rewardType: "USD" | "Points";
}

interface ChestTableProps {
    chests: ChestData[];
    onChestClick?: (chest: ChestData) => void;
}

export default function ChestTable({ chests, onChestClick }: ChestTableProps) {
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

    const formatChestType = (type: string) => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const formatUser = (user: string, walletAddress: string) => {
        if (user && user !== walletAddress) {
            return user;
        }
        return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    };

    if (chests.length === 0) {
        return (
            <div className="glass rounded-xl p-12 border border-soft/10 text-center">
                <div className="mb-4">
                    <Gift className="w-16 h-16 text-soft mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No chests found</h3>
                <p className="text-gray-400">Try adjusting your filters or search criteria</p>
            </div>
        );
    }

    return (
        <div className="glass rounded-xl border border-soft/10 overflow-hidden mb-6">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-background/50 border-b border-soft/10">
                        <tr>
                            <th className="text-left py-4 px-6 text-soft font-medium">User</th>
                            <th className="text-left py-4 px-6 text-soft font-medium">Chest Type</th>
                            <th className="text-left py-4 px-6 text-soft font-medium">Status</th>
                            <th className="text-left py-4 px-6 text-soft font-medium">Reward</th>
                            <th className="text-left py-4 px-6 text-soft font-medium">Claimed/Expires</th>
                            <th className="text-left py-4 px-6 text-soft font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chests.map((chest) => (
                            <tr key={chest.id} className="border-b border-soft/5 hover:bg-background/30 transition-colors cursor-pointer" onClick={() => onChestClick?.(chest)}>
                                <td className="py-4 px-6">
                                    <div>
                                        <p className="text-light text-sm">{chest.walletAddress}</p>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getChestTypeColor(chest.chestType)}`}>{formatChestType(chest.chestType)}</span>
                                </td>
                                <td className="py-4 px-6">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(chest.status)}`}>{chest.status.charAt(0).toUpperCase() + chest.status.slice(1)}</span>
                                </td>
                                <td className="py-4 px-6">
                                    <div>
                                        <p className="text-light font-medium">
                                            {chest.rewardValue} {chest.rewardType}
                                        </p>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <div>{chest.status === "claimed" && chest.claimedAt ? <p className="text-soft text-sm">Claimed {formatTimeAgo(chest.claimedAt)}</p> : <p className="text-soft text-sm">Expires {formatTimeAgo(chest.expiresAt)}</p>}</div>
                                </td>
                                <td className="py-4 px-6">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onChestClick?.(chest);
                                        }}
                                        className="px-3 py-1 bg-neon-pink/20 text-neon-pink rounded-lg border border-neon-pink/30 hover:bg-neon-pink/30 transition-colors text-xs"
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
