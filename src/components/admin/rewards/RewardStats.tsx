import { RewardTier } from "@/utils/api/rewardsApi";
import { Trophy, CheckCircle, DollarSign, Users } from "lucide-react";
import StatsGrid from "../common/StatsGrid";

interface RewardStatsProps {
    rewards: RewardTier[];
}

export default function RewardStats({ rewards }: RewardStatsProps) {
    const totalTiers = rewards.length;
    const activeTiers = rewards.filter(r => r.isActive).length;
    const totalRewardsPaid = rewards.reduce((sum, r) => sum + (r.totalClaimed * r.rewardAmount), 0);
    const totalUsers = rewards.reduce((sum, r) => sum + r.totalUsers, 0);

    const formatAmount = (amount: number) => {
        if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
        if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
        return `$${amount.toFixed(2)}`;
    };

    const statsData = [
        {
            title: "Total Tiers",
            value: totalTiers,
            icon: Trophy,
            color: "border-purple-500/30",
        },
        {
            title: "Active Tiers",
            value: activeTiers,
            icon: CheckCircle,
            color: "border-green-500/30",
        },
        {
            title: "Total Rewards Paid",
            value: formatAmount(totalRewardsPaid),
            icon: DollarSign,
            color: "border-yellow-500/30",
        },
        {
            title: "Total Users",
            value: totalUsers.toLocaleString(),
            icon: Users,
            color: "border-blue-500/30",
        },
    ];

    return <StatsGrid stats={statsData} />;
}
