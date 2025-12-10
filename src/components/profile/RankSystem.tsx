"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Crown } from "lucide-react";
import { RewardsApiService, Range, Level, UserRewardProgress } from "@/utils/api/rewardsApi";

export default function RankSystem() {
    const { connected, publicKey } = useWallet();
    const [ranges, setRanges] = useState<Range[]>([]);
    const [levels, setLevels] = useState<Level[]>([]);
    const [userProgress, setUserProgress] = useState<UserRewardProgress | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (connected && publicKey) {
            loadRewardsData();
        } else {
            setLoading(false);
        }
    }, [connected, publicKey]);

    const loadRewardsData = async () => {
        try {
            setLoading(true);
            const [rangesData, levelsData, progress] = await Promise.all([RewardsApiService.fetchRanges(), RewardsApiService.fetchLevels(), publicKey ? RewardsApiService.fetchUserProgress(publicKey.toString()) : null]);
            setRanges(rangesData.filter((range) => range.isActive));
            setLevels(levelsData.filter((level) => level.isActive));
            setUserProgress(progress);
        } catch (error) {
            console.error("Failed to load rewards data:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = (amount: number) => {
        if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
        if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
        return `$${amount.toFixed(2)}`;
    };

    const parseWageringAmount = (wagering: string) => {
        return parseFloat(wagering.replace(/[$,]/g, ""));
    };

    const getCurrentRange = () => {
        if (!userProgress?.currentLevel) return null;
        return ranges.find((range) => range.id === userProgress.currentLevel?.range_id);
    };

    const getNextLevel = () => {
        if (!userProgress?.currentLevel) {
            return levels.find((level) => level.level_number === 1);
        }
        return levels.find((level) => level.level_number === userProgress.currentLevel!.level_number + 1);
    };

    if (loading) {
        return (
            <div className="glass-card p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="text-light/60">Loading rank system...</div>
                </div>
            </div>
        );
    }

    const currentRange = getCurrentRange();
    const nextLevel = getNextLevel();
    const currentWagered = userProgress?.currentWagered || 0;

    // Calculate progress to next level
    const progressToNext = nextLevel ? Math.min((currentWagered / parseWageringAmount(nextLevel.wagering as string)) * 100, 100) : 100;

    return (
        <div className="glass-card p-6 h-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-light">Current Rank</h2>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-pink/20 to-purple-500/20 border-2 border-neon-pink/30 flex items-center justify-center">
                    <Crown className="w-8 h-8 text-neon-pink" />
                </div>
            </div>

            <div className="space-y-6">
                {/* Current Rank Info */}
                <div className="glass-dark p-4 rounded-xl">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-neon-pink to-purple-400 bg-clip-text text-transparent mb-2">{userProgress?.currentLevel ? `${currentRange?.name}` : "UNRANKED"}</h3>
                    <p className="text-light/70 text-base">{userProgress?.currentLevel ? userProgress.currentLevel.title : "Start wagering to unlock your first rank"}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-dark p-4 rounded-xl text-center">
                        <p className="text-light/60 text-sm mb-1">Total Wagered</p>
                        <p className="text-light font-bold text-xl">{formatAmount(currentWagered)}</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl text-center">
                        <p className="text-light/60 text-sm mb-1">Current Level</p>
                        <p className="text-neon-pink font-bold text-xl">{userProgress?.currentLevel?.level_number || 0}</p>
                    </div>
                </div>

                {/* Progress to Next Level */}
                {nextLevel && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-light font-semibold">Next: {nextLevel.title}</span>
                            <span className="text-neon-pink font-semibold">{formatAmount(parseWageringAmount(nextLevel.wagering as string) - currentWagered)} to go</span>
                        </div>
                        <div className="w-full bg-soft/20 rounded-full h-3 overflow-hidden">
                            <div className="bg-gradient-to-r from-neon-pink to-purple-500 h-3 rounded-full transition-all duration-500 relative" style={{ width: `${progressToNext}%` }}>
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="text-center">
                            <span className="text-light/60 text-sm">{progressToNext.toFixed(1)}% Complete</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
