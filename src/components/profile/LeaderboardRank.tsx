// app/components/profile/LeaderboardRank.tsx
"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Trophy, Medal, Award, TrendingUp, Users, User2Icon } from "lucide-react";
import { MOCK_LEADERBOARD, getMockUserRank, type LeaderboardEntry, fetchRankSummary, type RankSummary } from "@/utils/api/profileapi";

interface LeaderboardRankProps {
    isLoading?: boolean;
}

export default function LeaderboardRank({ isLoading = false }: LeaderboardRankProps) {
    const { publicKey } = useWallet();

    const leaderboardData: LeaderboardEntry[] = MOCK_LEADERBOARD;
    const userRank: LeaderboardEntry = getMockUserRank(publicKey?.toString());
    const [summary, setSummary] = useState<RankSummary | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (publicKey) {
                const s = await fetchRankSummary(publicKey.toString());
                if (mounted) setSummary(s);
            } else {
                setSummary(null);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [publicKey]);

    const formatAmount = (amount: number) => {
        if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
        if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
        return `$${amount.toFixed(2)}`;
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-soft" />;
        if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
        return <span className="text-light/60 font-bold text-md">#{rank}</span>;
    };

    if (isLoading) {
        return (
            <div className="glass rounded-2xl p-4 md:p-6 border border-purple/20 h-full flex flex-col">
                <div className="animate-pulse">
                    {/* Header Skeleton */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-soft/20 rounded-xl"></div>
                            <div>
                                <div className="h-6 bg-soft/20 rounded mb-2 w-40"></div>
                                <div className="h-4 bg-soft/20 rounded w-48"></div>
                            </div>
                        </div>
                    </div>

                    {/* User Rank Skeleton */}
                    <div className="h-16 bg-soft/20 rounded-xl mb-6"></div>

                    {/* Top Players Header Skeleton */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 bg-soft/20 rounded"></div>
                        <div className="h-6 bg-soft/20 rounded w-32"></div>
                    </div>

                    {/* Top Players List Skeleton */}
                    <div className="flex-1 space-y-2 mb-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 glass rounded-lg border border-purple/20">
                                <div className="w-10 h-10 bg-soft/20 rounded-full"></div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="h-4 bg-soft/20 rounded w-24"></div>
                                        <div className="h-4 bg-soft/20 rounded w-16"></div>
                                    </div>
                                    <div className="h-3 bg-soft/20 rounded w-20"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Stats Skeleton */}
                    <div className="grid grid-cols-3 gap-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-soft/20 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass rounded-2xl p-4 md:p-6 border border-purple/20 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="hidden md:block p-2 md:p-3 glass rounded-xl">
                        <Users className="w-5 h-5 md:w-6 md:h-6 text-soft" />
                    </div>
                    <div>
                        <h3 className="text-lg md:text-xl font-bold text-light">Leaderboard Rank</h3>
                        <p className="text-xs md:text-sm text-soft">Your position among players</p>
                    </div>
                </div>
            </div>
            {/* User's Current Rank */}
            <div className="glass rounded-xl p-2 md:p-3 border border-purple/20 mb-4 md:mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border bg-purple/20 text-purple-400 border-purple/30">
                            <User2Icon className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="text-sm md:text-md font-bold text-purple-400">{userRank.rank ? `#${userRank.rank}` : "—"}</div>
                        <div className="text-xs md:text-sm text-soft">{userRank.username}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm md:text-md font-bold text-light">{formatAmount(userRank.totalWagered)}</div>
                        <div className="text-xs md:text-sm text-soft">wagered</div>
                    </div>
                </div>
            </div>

            {/* Top 5 Leaderboard */}
            <div className="flex-1 space-y-1 mb-4 md:mb-6">
                <h4 className="text-lg md:text-xl font-semibold text-light flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                    Top Players
                </h4>

                {leaderboardData.slice(0, 5).map((entry) => (
                    <div key={entry.rank} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 glass rounded-lg border border-purple/20 hover:bg-soft/10 transition-colors">
                        {/* Rank Icon */}
                        <div className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border ${entry.rank <= 3 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : entry.rank <= 10 ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-gray-500/20 text-soft border-soft/30"}`}>{getRankIcon(entry.rank)}</div>

                        {/* Player Details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-light text-sm truncate">{entry.username}</span>
                                <span className="text-sm font-bold text-light ml-2">{formatAmount(entry.totalWagered)}</span>
                            </div>
                            <div className="text-xs text-soft truncate">
                            {entry.currentLevel && entry.currentLevel.trim() !== "" && entry.currentLevel !== "Unranked"
                             ? entry.currentLevel : "New Blood"}
                               </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Stats (REAL) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                <div className="glass rounded-lg p-2 md:p-3 border border-purple/20">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                        <span className="text-xs md:text-sm text-soft">Best Rank</span>
                    </div>
                    <div className="text-sm md:text-md font-bold text-yellow-400">{summary?.bestRank ? `#${summary.bestRank}` : "—"}</div>
                </div>

                <div className="glass rounded-lg p-2 md:p-3 border border-purple/20">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                        <span className="text-xs md:text-sm text-soft">Change (7d)</span>
                    </div>
                    <div className="text-sm md:text-md font-bold text-green-400">{summary?.change != null ? (summary.change >= 0 ? `+${summary.change}` : `${summary.change}`) : "—"}</div>
                </div>

                <div className="glass rounded-lg p-2 md:p-3 border border-purple/20">
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                        <span className="text-xs md:text-sm text-soft">Players</span>
                    </div>
                    <div className="text-sm md:text-md font-bold text-light">{summary?.playersCount != null ? summary.playersCount.toLocaleString() : "—"}</div>
                </div>
            </div>
        </div>
    );
}
