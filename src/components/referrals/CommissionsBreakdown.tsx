"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart3, Filter, Calendar, TrendingUp, DollarSign, Gamepad2 } from "lucide-react";
import { getCommissionData, getGameBreakdown, getReferralStats, type CommissionData, type GameBreakdown, type ReferralStats } from "@/utils/api/referralsApi";
import CommissionClaiming from "./CommissionClaiming";

export default function CommissionsBreakdown() {
    const [selectedPeriod, setSelectedPeriod] = useState("week");
    const [selectedGame, setSelectedGame] = useState("all");
    const [commissionData, setCommissionData] = useState<CommissionData | null>(null);
    const [gameBreakdown, setGameBreakdown] = useState<GameBreakdown[] | null>(null);
    const [stats, setStats] = useState<ReferralStats | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [commissions, games, s] = await Promise.all([getCommissionData(), getGameBreakdown(), getReferralStats()]);
                setCommissionData(commissions);
                setGameBreakdown(games);
                setStats(s);
            } catch (error) {
                console.error("Failed to fetch commission data:", error);
            }
        })();
    }, []);

    const week = commissionData?.week ?? [];
    const maxAmount = useMemo(() => (week.length ? Math.max(...week.map((d) => d.amount)) : 0), [week]);
    const weeklyTotal = useMemo(() => week.reduce((sum, d) => sum + d.amount, 0), [week]);
    const avgDaily = useMemo(() => (week.length ? weeklyTotal / week.length : 0), [week, weeklyTotal]);
    const growthPct = useMemo(() => {
        if (!week.length || week.length < 2) return 0;
        const first = week[0].amount || 0;
        const last = week[week.length - 1].amount || 0;
        const denom = Math.max(first, 1);
        return ((last - first) / denom) * 100;
    }, [week]);
    const topGameShare = useMemo(() => (gameBreakdown?.length ? Math.max(...gameBreakdown.map((g) => g.percentage)) : 0), [gameBreakdown]);

    if (!commissionData || !gameBreakdown || !stats) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-soft/20 rounded mb-4"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="h-96 bg-soft/20 rounded-2xl"></div>
                        <div className="h-96 bg-soft/20 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <DollarSign className="text-green-400" size={28} />
                    <h2 className="text-2xl font-bold text-white">Referral Bonus & Commission Breakdown</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Earnings Chart */}
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="text-blue-400" size={20} />
                            <h3 className="text-lg font-semibold text-white">Daily Bonus Earnings</h3>
                        </div>
                        <div className={`flex items-center gap-2 ${growthPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                            <TrendingUp size={16} />
                            <span className="text-sm">
                                {growthPct >= 0 ? "+" : ""}
                                {growthPct.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="space-y-4">
                        {week.map((data, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="w-12 text-light text-sm">{data.day}</div>
                                <div className="flex-1 flex items-center gap-3">
                                    <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-neon-pink to-purple transition-all duration-500" style={{ width: `${maxAmount ? (data.amount / maxAmount) * 100 : 0}%` }}></div>
                                    </div>
                                    <div className="w-20 text-white font-semibold text-sm text-right">${data.amount.toFixed(2)}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="mt-6 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center">
                            <span className="text-light">Weekly Total Bonus</span>
                            <span className="text-xl font-bold text-white">${weeklyTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Game Breakdown */}
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Gamepad2 className="text-purple-400" size={20} />
                        <h3 className="text-lg font-semibold text-white">Game Breakdown</h3>
                    </div>

                    <div className="space-y-4">
                        {gameBreakdown.map((game, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className={`w-4 h-4 rounded-full ${game.color}`}></div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-white font-medium">{game.game}</span>
                                        <span className="text-white font-semibold">${game.amount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                                            <div className={`h-full ${game.color} transition-all duration-500`} style={{ width: `${game.percentage}%` }}></div>
                                        </div>
                                        <span className="text-light text-sm w-12">{game.percentage}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-light">Total Bonus</span>
                            <span className="text-white font-semibold">${gameBreakdown.reduce((sum, g) => sum + g.amount, 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-light">Best Performing</span>
                            <span className="text-green-400 font-semibold">{gameBreakdown.sort((a, b) => b.percentage - a.percentage)[0]?.game}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Metrics (computed or API-fed, no hardcoding) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-neon-pink mb-1">${avgDaily.toFixed(2)}</div>
                    <div className="text-light text-sm">Avg Daily</div>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                    <div className={`text-2xl font-bold mb-1 ${growthPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {growthPct >= 0 ? "+" : ""}
                        {growthPct.toFixed(1)}%
                    </div>
                    <div className="text-soft text-sm">Growth Rate</div>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">{topGameShare.toFixed(1)}%</div>
                    <div className="text-light text-sm">Top Game Share</div>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400 mb-1">${stats.monthlyCommission.toFixed(2)}</div>
                    <div className="text-soft text-sm">This Month</div>
                </div>
            </div>

            {/* Commission Claiming Section */}
            <CommissionClaiming />

        </div>
    );
}
