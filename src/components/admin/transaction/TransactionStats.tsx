"use client";

import { TransactionStats as StatsType } from "@/utils/api/transactionsApi";
import { DollarSign, TrendingUp, Clock, BarChart3 } from "lucide-react";
import StatsGrid from "../common/StatsGrid";
import { StatsGridSkeleton } from "../common/SkeletonLoader";

interface TransactionStatsProps {
    stats: StatsType | null;
}

export default function TransactionStats({ stats }: TransactionStatsProps) {
    if (!stats) return <StatsGridSkeleton columns={4} />;

    const statsData = [
        {
            title: "Total Volume",
            value: `$${stats.totalVolume.toLocaleString()}`,
            icon: DollarSign,
            trend: { value: "All time", isPositive: true }
        },
        {
            title: "Daily Volume",
            value: `$${stats.dailyVolume.toLocaleString()}`,
            icon: TrendingUp,
            trend: { value: "Last 24h", isPositive: true }
        },
        {
            title: "Pending",
            value: stats.pendingTransactions,
            icon: Clock,
            trend: { value: "Requires attention", isPositive: false }
        },
        {
            title: "Weekly Volume",
            value: `$${stats.weeklyVolume.toLocaleString()}`,
            icon: BarChart3,
            trend: { value: "Last 7 days", isPositive: true }
        }
    ];

    return <StatsGrid stats={statsData} />;
}
