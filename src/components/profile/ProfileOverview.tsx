"use client";

import { User, Clock, Crown } from "lucide-react";
import { getRankName, type UserProfile } from "@/utils/api/profileapi";

interface ProfileOverviewProps {
    profile: UserProfile | null;
    isLoading?: boolean;
}

export default function ProfileOverview({ profile, isLoading = false }: ProfileOverviewProps) {
    const formatAmount = (amount: number) => {
        if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
        if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
        return `$${amount.toFixed(2)}`;
    };

    // Get rank-based avatar image
    const getRankAvatar = (level: number) => {
        // Calculate range ID based on level (similar to rewards system)
        const rangeId = Math.max(1, Math.ceil(level / 5)); // Every 5 levels = new range
        return `/assets/Zoggy-rank-icons/avatar${rangeId}.png`;
    };

    // Show skeleton loader when loading or profile is null
    if (isLoading || !profile) {
        return (
            <div className="glass rounded-2xl p-4 md:p-6 border border-purple/20">
                <div className="animate-pulse">
                    {/* Top Section Skeleton */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-soft/20 rounded-full"></div>
                            <div>
                                <div className="h-6 bg-soft/20 rounded mb-2 w-32"></div>
                                <div className="h-4 bg-soft/20 rounded mb-1 w-40"></div>
                                <div className="h-4 bg-soft/20 rounded w-28"></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-soft/20 rounded"></div>
                            <div className="h-8 bg-soft/20 rounded w-32"></div>
                        </div>
                    </div>

                    {/* Progress Section Skeleton */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between gap-2 mb-6">
                            <div className="h-8 bg-soft/20 rounded w-24"></div>
                            <div className="h-8 bg-soft/20 rounded w-24"></div>
                        </div>
                        <div className="h-3 bg-soft/20 rounded-full mb-4"></div>
                        <div className="flex justify-between">
                            <div className="h-4 bg-soft/20 rounded w-32"></div>
                            <div className="h-4 bg-soft/20 rounded w-32"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Derived progress numbers (replace with live values when available)
    const currentWagered = profile.totalBets; // using totalBets as a stand-in
    const nextLevelRequirement = (profile.level + 1) * 1000; // example progression rule
    const progressPercentage = Math.min((currentWagered / nextLevelRequirement) * 100, 100);

    const currentRank = getRankName(profile.level);
    const nextRank = getRankName(profile.level + 1);

    return (
        <div className="glass rounded-2xl p-4 md:p-6 border border-purple/20">
            {/* Top Section - Profile Info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-neon-pink to-purple rounded-full flex items-center justify-center overflow-hidden">
                            <img
                                src={getRankAvatar(profile.level)}
                                alt={`Rank ${profile.level} Avatar`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    // Fallback to User icon if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = '<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                                }}
                            />
                        </div>

                    </div>

                    <div>
                        <div className="text-xs md:text-sm text-soft font-mono mb-1">
                            {profile.walletAddress.slice(0, 8)}...{profile.walletAddress.slice(-8)}
                        </div>
                        <div className="flex items-center gap-2 text-xs md:text-sm text-soft">
                            <Clock className="w-4 h-4" />
                            <span>Joined {new Date(profile.joinedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Current Rank Badge */}
                <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 glass border border-soft/20 text-light font-bold text-xs md:text-sm rounded-lg">
                    <Crown className="w-4 h-4 md:w-6 md:h-6 text-yellow-400" />
                    {currentRank} {profile.level}
                </div>

            </div>

            {/* Middle Section - Rank Progress */}
            <div className="mb-6 md:mb-8">
                <div className="text-center mb-4 md:mb-6">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xl md:text-3xl font-bold text-light">{formatAmount(currentWagered)}</span>

                        <span className="text-xl md:text-3xl font-bold text-soft">{formatAmount(nextLevelRequirement)}</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-soft/20 rounded-full h-2 mb-4">
                    <div
                        className="bg-soft h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>

                {/* Progress Labels */}
                <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-light font-medium">
                        {currentRank} {profile.level}
                    </span>
                    <span className="text-soft">
                        Next: {nextRank} {profile.level + 1}
                    </span>
                </div>
            </div>
        </div>
    );
}
