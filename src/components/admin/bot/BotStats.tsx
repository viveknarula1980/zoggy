import { Bot, Activity, Users, TrendingUp } from "lucide-react";
import StatsGrid from "../common/StatsGrid";
import { StatsGridSkeleton } from "../common/SkeletonLoader";

interface BotStatsData {
    activeUsers: number;
    totalBets: number;
    dailyVolume: number;
    winRate: number;
}

interface BotStatsProps {
    stats: BotStatsData | null;
}

export default function BotStats({ stats }: BotStatsProps) {
    if (!stats) return <StatsGridSkeleton columns={4} />;

    const statsData = [
        {
            title: "Active Bot Users",
            value: stats.activeUsers,

            icon: Bot,
            color: "border-blue-500/20",
            trend: {
                value: "+12% from yesterday",
                isPositive: true,
            },
        },
        {
            title: "Bot Bets Today",
            value: stats.totalBets,

            icon: Activity,
            color: "border-green-500/20",
            trend: {
                value: "+8% from yesterday",
                isPositive: true,
            },
        },
        {
            title: "Simulated Volume",
            value: `$${stats.dailyVolume.toLocaleString()}`,
            icon: TrendingUp,
            color: "border-purple-500/20",
            trend: {
                value: "+15% from yesterday",
                isPositive: true,
            },
        },
        {
            title: "Bot Win Rate",
            value: `${stats.winRate}%`,
            icon: Users,
            color: "border-neon-pink/20",
            trend: {
                value: "Target: 45%",
                isPositive: true,
            },
        },
    ];

    return <StatsGrid stats={statsData} columns={4} />;
}
