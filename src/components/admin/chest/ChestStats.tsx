"use client";

import { Gift, Users, Clock, TrendingUp, LucideIcon } from "lucide-react";
import StatsGrid from "@/components/admin/common/StatsGrid";
import { StatsGridSkeleton } from "@/components/admin/common/SkeletonLoader";

export interface ChestStatsData {
    totalChests: number;
    dailyChests: number;
    weeklyChests: number;
    premiumChests: number;
    totalClaimed: number;
    totalValue: number;
    activeUsers: number;
    claimRate: number;
}

interface ChestStatsProps {
    stats: ChestStatsData | null;
}

export default function ChestStats({ stats }: ChestStatsProps) {
    if (!stats) return <StatsGridSkeleton columns={4} />;

    const statsData = [
        {
            title: "Total Chests",
            value: stats.totalChests.toLocaleString(),
            icon: Gift,
            trend: {
                value: "+12%",
                isPositive: true,
            },
        },
        {
            title: "Daily Claims",
            value: stats.dailyChests.toLocaleString(),
            icon: Clock,
            trend: {
                value: "+8%",
                isPositive: true,
            },
        },
        {
            title: "Active Claimers",
            value: stats.activeUsers.toLocaleString(),
            icon: Users,
            trend: {
                value: "+15%",
                isPositive: true,
            },
        },
        {
            title: "Claim Rate",
            value: `${stats.claimRate.toFixed(1)}%`,
            icon: TrendingUp,
            trend: {
                value: "+5%",
                isPositive: true,
            },
        },
    ];

    return (
        <div className="mb-8">
            <StatsGrid stats={statsData} columns={4} />
        </div>
    );
}
