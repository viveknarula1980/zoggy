"use client";

import { UserStats as StatsType } from "@/utils/api/usersApi";
import { Users, CheckCircle, Ban, UserPlus } from "lucide-react";
import StatsGrid from "./common/StatsGrid";
import { StatsGridSkeleton } from "./common/SkeletonLoader";

interface UserStatsProps {
    stats: StatsType | null;
}

export default function UserStats({ stats }: UserStatsProps) {
    if (!stats) return <StatsGridSkeleton columns={4} />;

    const statsData = [
        {
            title: "Total Users",
            value: stats.totalUsers,
            icon: Users,
            trend: { value: "All time", isPositive: true },
        },
        {
            title: "Active Users",
            value: stats.activeUsers,
            icon: CheckCircle,
            trend: { value: "Currently active", isPositive: true },
        },
        {
            title: "Banned Users",
            value: stats.bannedUsers,
            icon: Ban,
            trend: { value: "Requires attention", isPositive: false },
        },
        {
            title: "New Today",
            value: stats.newUsersToday,
            icon: UserPlus,
            trend: { value: "Last 24h", isPositive: true },
        },
    ];

    return <StatsGrid stats={statsData} />;
}
