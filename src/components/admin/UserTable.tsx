"use client";

import { User } from "@/utils/api/usersApi";
import { Copy, Users } from "lucide-react";

interface UserTableProps {
    users: User[];
    onUserClick: (user: User) => void;
}

export default function UserTable({ users, onUserClick }: UserTableProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "text-green-400";
            case "disabled":
                return "text-yellow-400";
            case "banned":
                return "text-red-400";
            default:
                return "text-gray-400";
        }
    };

    const getStatusBadge = (status: string) => {
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
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatBalance = (balance: number) => {
        return `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (users.length === 0) {
        return (
            <div className="glass rounded-xl p-12 border border-soft/10 text-center">
                <div className="mb-4">
                    <Users className="w-16 h-16 text-soft mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No users found</h3>
                <p className="text-soft">Try adjusting your filters or search criteria</p>
            </div>
        );
    }

    return (
        <div className="glass rounded-xl border border-soft/10 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-card/20 border-b border-border/30">
                        <tr className="text-left text-sm font-medium text-soft">
                            <th className="px-6 py-4">Wallet Address</th>
                            <th className="px-6 py-4">PDA Balance</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Win Rate</th>
                            <th className="px-6 py-4">Total Bets</th>
                            <th className="px-6 py-4">Last Active</th>
                            <th className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-soft/20">
                        {users.map((user) => (
                            <tr key={user.id} className="over:bg-background-secondary/30 transition-colors">
                                <td className="px-6 py-4 text-sm text-soft font-mono">
                                    <div className="flex items-center gap-2">
                                        <span>{formatWalletAddress(user.walletAddress)}</span>
                                        <button onClick={() => navigator.clipboard.writeText(user.walletAddress)} className="text-soft hover:text-white cursor-pointer transition-colors" title="Copy full address">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-white">{formatBalance(user.pdaBalance)}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(user.status)}`}>{user.status.toUpperCase()}</span>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className={`font-medium ${user.winRate >= 50 ? "text-green-400" : user.winRate >= 40 ? "text-yellow-400" : "text-red-400"}`}>{user.winRate.toFixed(1)}%</span>
                                        <span className="text-xs text-soft">
                                            {user.totalWins}W / {user.totalLosses}L
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-soft">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{user.totalBets.toLocaleString()}</span>
                                        {user.favoriteGame && <span className="text-xs text-soft capitalize">Fav: {user.favoriteGame}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-soft">{new Date(user.lastActive).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-sm">
                                    <button onClick={() => onUserClick(user)} className="text-neon-pink hover:text-neon-pink/80 transition-colors font-medium">
                                        Manage
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
