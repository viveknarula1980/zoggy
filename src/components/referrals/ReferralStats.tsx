"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Users, DollarSign, Clock, BarChart3, Gamepad2 } from "lucide-react";
import { getReferralStats, type ReferralStats, getReferralLinkData, getTopGames } from "@/utils/api/referralsApi";

// Define ReferralLinkData type if not imported from elsewhere
type ReferralLinkData = {
    conversions: number;
    conversionRate: number;
    // Add other fields if needed
};

// Define TopGame type if not imported from elsewhere
type TopGame = {
    game: string;
    commission: number;
    percentage: number;
};

export default function ReferralStats() {
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [linkData, setLinkData] = useState<ReferralLinkData | null>(null);
    const [topGames, setTopGames] = useState<TopGame[] | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [s, link, tg] = await Promise.all([getReferralStats(), getReferralLinkData(), getTopGames()]);
                setStats(s);
                setLinkData(link);
                setTopGames(tg);
            } catch (error) {
                console.error("Failed to fetch referral stats:", error);
            }
        })();
    }, []);

    if (!stats || !linkData || !topGames) {
        return (
            <div className="space-y-6 glass rounded-2xl p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-soft/20 rounded mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-soft/20 rounded-2xl"></div>
                        ))}
                    </div>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="h-44 bg-soft/20 rounded-2xl"></div>
                        <div className="h-44 bg-soft/20 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BarChart3 className="text-blue-400" size={28} />
                    <h2 className="text-2xl font-bold text-white">Stats Overview</h2>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                    <TrendingUp size={16} />
                    <span className="text-sm font-medium">+{stats.weeklyGrowth}% this week</span>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Referrals */}
                <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full -mr-10 -mt-10"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <Users className="text-blue-400" size={24} />
                            <span className="text-xs text-soft bg-blue-500/20 px-2 py-1 rounded-full">ALL TIME</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{stats.totalReferrals}</div>
                        <div className="text-soft text-sm">Referrals Invited</div>
                    </div>
                </div>

                {/* Active Referrals */}
                <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/20 to-transparent rounded-full -mr-10 -mt-10"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="text-green-400" size={24} />
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            </div>
                            <span className="text-xs text-soft bg-green-500/20 px-2 py-1 rounded-full">ACTIVE</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{stats.activeReferrals}</div>
                        <div className="text-soft text-sm">Active Players</div>
                    </div>
                </div>

                {/* Total Commission */}
                <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-neon-pink/20 to-transparent rounded-full -mr-10 -mt-10"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <DollarSign className="text-neon-pink" size={24} />
                            <span className="text-xs text-soft bg-neon-pink/20 px-2 py-1 rounded-full">EARNED</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{formatCurrency(stats.totalCommission)}</div>
                        <div className="text-soft text-sm">Total Commission</div>
                    </div>
                </div>

                {/* Pending Bonuses */}
                <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-full -mr-10 -mt-10"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <Clock className="text-yellow-400" size={24} />
                            <span className="text-xs text-soft bg-yellow-500/20 px-2 py-1 rounded-full">PENDING</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{formatCurrency(stats.pendingBonuses)}</div>
                        <div className="text-soft text-sm">Pending Bonuses</div>
                    </div>
                </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Performance */}
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="text-green-400" size={20} />
                        <h3 className="text-lg font-semibold text-white">This Month</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-light">Commission Earned</span>
                            <span className="text-white font-semibold">{formatCurrency(stats.monthlyCommission)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-light">New Referrals</span>
                            <span className="text-white font-semibold">{linkData.conversions}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-light">Conversion Rate</span>
                            <span className="text-green-400 font-semibold">{linkData.conversionRate}%</span>
                        </div>
                    </div>
                </div>

                {/* Top Performing Games (now API-driven) */}
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Gamepad2 className="text-purple-400" size={20} />
                        <h3 className="text-lg font-semibold text-white">Top Games</h3>
                    </div>
                    <div className="space-y-3">
                        {topGames.map((item, index) => (
                            <div key={item.game} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 glass-dark rounded-lg flex items-center justify-center text-xs font-bold text-white">{index + 1}</div>
                                    <span className="text-white">{item.game}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-semibold">{formatCurrency(item.commission)}</div>
                                    <div className="text-soft text-xs">{item.percentage}%</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
