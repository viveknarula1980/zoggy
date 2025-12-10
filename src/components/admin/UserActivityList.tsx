"use client";

import { useState, useMemo } from "react";
import { UserActivity } from "@/utils/api/usersApi";
import ActivityPagination from "./ActivityPagination";
import { LogIn, Dice6, Trophy, Heart, DollarSign, ArrowUpRight, FileText, BarChart3 } from "lucide-react";

interface UserActivityListProps {
    activities: UserActivity[];
}

export default function UserActivityList({ activities }: UserActivityListProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const paginatedActivities = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return activities.slice(startIndex, endIndex);
    }, [activities, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(activities.length / itemsPerPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };
    const getActivityIcon = (type: string) => {
        const iconProps = { className: "w-4 h-4" };
        switch (type) {
            case "login":
                return <LogIn {...iconProps} />;
            case "bet":
                return <Dice6 {...iconProps} />;
            case "win":
                return <Trophy {...iconProps} />;
            case "loss":
                return <Heart {...iconProps} />;
            case "deposit":
                return <DollarSign {...iconProps} />;
            case "withdrawal":
                return <ArrowUpRight {...iconProps} />;
            default:
                return <FileText {...iconProps} />;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case "login":
                return "text-blue-400";
            case "bet":
                return "text-orange-400";
            case "win":
                return "text-green-400";
            case "loss":
                return "text-red-400";
            case "deposit":
                return "text-green-400";
            case "withdrawal":
                return "text-blue-400";
            default:
                return "text-gray-400";
        }
    };

    const getActivityBadge = (type: string) => {
        switch (type) {
            case "login":
                return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            case "bet":
                return "bg-orange-500/20 text-orange-400 border-orange-500/30";
            case "win":
                return "bg-green-500/20 text-green-400 border-green-500/30";
            case "loss":
                return "bg-red-500/20 text-red-400 border-red-500/30";
            case "deposit":
                return "bg-green-500/20 text-green-400 border-green-500/30";
            case "withdrawal":
                return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            default:
                return "bg-gray-500/20 text-gray-400 border-gray-500/30";
        }
    };

    const formatAmount = (amount: number | undefined, type: string) => {
        if (!amount) return "";
        const sign = type === "deposit" || type === "win" ? "+" : type === "withdrawal" || type === "bet" || type === "loss" ? "-" : "";
        return `${sign}$${amount.toFixed(2)}`;
    };

    const formatDateTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
    };

    if (activities.length === 0) {
        return (
            <div className="glass rounded-xl p-12 border border-soft/10 text-center">
                <div className="mb-4">
                    <BarChart3 className="w-16 h-16 text-soft mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-light mb-2">No recent activity</h3>
                <p className="text-soft">User activity will appear here when available</p>
            </div>
        );
    }

    return (
        <div className="glass rounded-xl border border-soft/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-soft">
                <h3 className="text-lg font-semibold text-light">Recent Activity</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-card/10 border-b border-soft/10">
                        <tr className="text-left text-sm font-medium text-soft">
                            <th className="px-6 py-4 ">Activity</th>
                            <th className="px-6 py-4 ">Game</th>
                            <th className="px-6 py-4 ">Details</th>
                            <th className="px-6 py-4 ">Amount(sol)</th>
                            <th className="px-6 py-4 ">Date</th>
                            <th className="px-6 py-4 ">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-soft/10">
                        {paginatedActivities.map((activity) => {
                            const dateTime = formatDateTime(activity.timestamp);
                            return (
                                <tr key={activity.id} className="hover:bg-card/10 transition-colors text-soft">
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={getActivityColor(activity.type)}>
                                                {getActivityIcon(activity.type)}
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getActivityBadge(activity.type)}`}>{activity.type}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 ">{activity.game ? <span className="capitalize">{activity.game}</span> : <span className="text-soft">-</span>}</td>
                                    <td className="px-6 py-4 ">{activity.details || <span className="text-soft">-</span>}</td>
                                    <td className="px-6 py-4 ">{activity.amount ? <span className={`font-medium ${getActivityColor(activity.type)}`}>{formatAmount(activity.amount, activity.type)}</span> : <span className="text-soft">-</span>}</td>
                                    <td className="px-6 py-4 ">{dateTime.date}</td>
                                    <td className="px-6 py-4 ">{dateTime.time}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <ActivityPagination currentPage={currentPage} totalPages={totalPages} totalItems={activities.length} itemsPerPage={itemsPerPage} onPageChange={handlePageChange} />
        </div>
    );
}
