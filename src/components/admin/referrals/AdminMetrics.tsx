"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Users, DollarSign, AlertTriangle } from "lucide-react";
import { getAdminMetrics, getTopAffiliates, type AdminMetrics as AdminMetricsType, type TopAffiliate } from "@/utils/api/adminReferralsApi";
import { StatsGridSkeleton } from "../common/SkeletonLoader";

export default function AdminMetrics() {
    const [metrics, setMetrics] = useState<AdminMetricsType | null>(null);
    const [topAffiliates, setTopAffiliates] = useState<TopAffiliate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [metricsData, topAffiliatesData] = await Promise.all([getAdminMetrics(), getTopAffiliates()]);
                setMetrics(metricsData);
                setTopAffiliates(topAffiliatesData);
            } catch (error) {
                console.error("Failed to fetch admin metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading || !metrics) {
        return (
            <div className="space-y-6">
                <StatsGridSkeleton columns={4} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass rounded-xl p-6 border border-soft/10">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-soft/20 rounded w-1/3"></div>
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex justify-between">
                                        <div className="h-3 bg-soft/20 rounded w-1/2"></div>
                                        <div className="h-3 bg-soft/20 rounded w-1/4"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="glass rounded-xl p-6 border border-soft/10">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-soft/20 rounded w-1/3"></div>
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-soft/10 rounded-lg">
                                        <div className="w-8 h-8 bg-soft/20 rounded-full"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-soft/20 rounded w-3/4"></div>
                                            <div className="h-2 bg-soft/20 rounded w-1/2"></div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-3 bg-soft/20 rounded w-16"></div>
                                            <div className="h-2 bg-soft/20 rounded w-12"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Users className="text-blue-400" size={24} />
                        <span className="text-xs text-soft bg-blue-500/20 px-2 py-1 rounded-full">TOTAL</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{metrics.totalAffiliates}</div>
                    <div className="text-soft text-sm">Total Affiliates</div>
                    <div className="text-green-400 text-xs mt-2">
                        {metrics.activeAffiliates} active ({((metrics.activeAffiliates / metrics.totalAffiliates) * 100).toFixed(1)}%)
                    </div>
                </div>

                <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <DollarSign className="text-green-400" size={24} />
                        <span className="text-xs text-soft bg-green-500/20 px-2 py-1 rounded-full">PAID</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{formatCurrency(metrics.totalCommissionsPaid)}</div>
                    <div className="text-soft text-sm">Total Commissions Paid</div>
                </div>

                <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <AlertTriangle className="text-yellow-400" size={24} />
                        <span className="text-xs text-soft bg-yellow-500/20 px-2 py-1 rounded-full">PENDING</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{formatCurrency(metrics.pendingPayouts)}</div>
                    <div className="text-soft text-sm">Pending Payouts</div>
                </div>

                <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <TrendingUp className="text-neon-pink" size={24} />
                        <span className="text-xs text-soft bg-neon-pink/20 px-2 py-1 rounded-full">REVENUE</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{formatCurrency(metrics.netGamingRevenue)}</div>
                    <div className="text-soft text-sm">Net Gaming Revenue</div>
                </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Revenue Overview</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-soft">Total Deposits Generated</span>
                            <span className="text-white font-semibold">{formatCurrency(metrics.totalDepositsGenerated)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-soft">Average Commission Rate</span>
                            <span className="text-green-400 font-semibold">{metrics.averageCommissionRate}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-soft">Commission to Revenue Ratio</span>
                            <span className="text-blue-400 font-semibold">{((metrics.totalCommissionsPaid / metrics.netGamingRevenue) * 100).toFixed(2)}%</span>
                        </div>
                    </div>
                </div>

                <div className="glass-card rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Top Performing Affiliates</h3>
                    <div className="space-y-3">
                        {topAffiliates.map((affiliate, index) => (
                            <div key={affiliate.affiliateId} className="flex items-center justify-between p-3 glass-dark rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-neon-pink to-purple rounded-full flex items-center justify-center text-white text-sm font-bold">{index + 1}</div>
                                    <div>
                                        <div className="text-white font-medium">{affiliate.affiliateId}</div>
                                        <div className="text-soft text-xs font-mono">
                                            {affiliate.walletAddress.slice(0, 8)}...{affiliate.walletAddress.slice(-8)}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-semibold">{formatCurrency(affiliate.commissionEarned)}</div>
                                    <div className="text-soft text-xs">{affiliate.referralCount} referrals</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
