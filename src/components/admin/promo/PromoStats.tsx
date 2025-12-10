import { Gift, TrendingUp, Users, Clock } from "lucide-react";
import StatsGrid from "../common/StatsGrid";

export interface PromoStatsData {
    totalPromos: number;
    activePromos: number;
    totalRedeemed: number;
    totalValue: number;
    weeklyRedemptions: number;
    conversionRate: number;
}

interface PromoStatsProps {
    stats: PromoStatsData | null;
}

export default function PromoStats({ stats }: PromoStatsProps) {
    if (!stats) return null;

    const statsData = [
        {
            title: "Total Promos",
            value: stats.totalPromos,
            subtitle: `${stats.activePromos} active`,
            icon: Gift,
            color: "text-blue-400",
        },
        {
            title: "Total Redeemed",
            value: stats.totalRedeemed.toLocaleString(),
            subtitle: `${stats.weeklyRedemptions} this week`,
            icon: TrendingUp,
            color: "text-green-400",
        },
        {
            title: "Total Value",
            value: `$${stats.totalValue.toLocaleString()}`,
            subtitle: "Distributed rewards",
            icon: Users,
            color: "text-purple-400",
        },
        {
            title: "Conversion Rate",
            value: `${stats.conversionRate}%`,
            subtitle: "Promo effectiveness",
            icon: Clock,
            color: "text-yellow-400",
        },
    ];

    return <StatsGrid stats={statsData} columns={4} />;
}
