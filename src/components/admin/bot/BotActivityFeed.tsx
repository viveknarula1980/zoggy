"use client";

import { useState } from "react";
import { Search, Download, Bot } from "lucide-react";
import TablePagination from "../common/TablePagination";

interface BotActivity {
    id: string;
    username: string;
    game: string;
    action: "bet" | "win" | "lose";
    amount: number;
    multiplier?: number;
    timestamp: string;
    result: number;
}

interface BotActivityFeedProps {
    activities: BotActivity[];
    onExport: () => void;
}

export default function BotActivityFeed({ activities, onExport }: BotActivityFeedProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [gameFilter, setGameFilter] = useState("all");
    const [actionFilter, setActionFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 15;

    const filteredActivities = activities.filter((activity) => {
        const matchesSearch = activity.username.toLowerCase().includes(searchTerm.toLowerCase()) || activity.game.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGame = gameFilter === "all" || activity.game === gameFilter;
        const matchesAction = actionFilter === "all" || activity.action === actionFilter;

        return matchesSearch && matchesGame && matchesAction;
    });

    const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentActivities = filteredActivities.slice(startIndex, startIndex + itemsPerPage);

    const getActionColor = (action: string) => {
        switch (action) {
            case "win":
                return "text-green-400 bg-green-500/20";
            case "lose":
                return "text-red-400 bg-red-500/20";
            case "bet":
                return "text-blue-400 bg-blue-500/20";
            default:
                return "text-gray-400 bg-gray-500/20";
        }
    };

    return (
        <div className="glass rounded-xl border border-soft/10">
            {/* Header */}
            <div className="p-6 border-b border-soft/10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h3 className="text-lg font-semibold text-light">Bot Activity Feed</h3>

                    <div className="flex flex-col md:flex-row gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-soft w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search username or game..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-background/50 border border-soft/10 rounded-lg text-light placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent w-full md:w-64"
                            />
                        </div>

                        {/* Filters */}
                        <select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} className="px-3 py-2 bg-background border border-soft/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent">
                            <option value="all">All Games</option>
                            <option value="slots">Slots</option>
                            <option value="crash">Crash</option>
                            <option value="mines">Mines</option>
                            <option value="dice">Dice</option>
                            <option value="plinko">Plinko</option>
                            <option value="coinflip">Coinflip</option>
                        </select>

                        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 bg-background border border-soft/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent">
                            <option value="all">All Actions</option>
                            <option value="bet">Bets</option>
                            <option value="win">Wins</option>
                            <option value="lose">Losses</option>
                        </select>

                        {/* Export */}
                        <button onClick={onExport} className="flex items-center space-x-2 px-4 py-2 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-lg hover:bg-neon-pink/30 transition-all duration-200">
                            <Download className="w-4 h-4" />
                            <span>Export</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Activity Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-soft/10 text-left text-sm font-medium text-light">
                            <th className="p-4">User</th>
                            <th className="p-4">Game</th>
                            <th className="p-4">Action</th>
                            <th className="p-4">Bet Amount</th>
                            <th className="p-4">Result</th>
                            <th className="p-4">Multiplier</th>
                            <th className="p-4">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentActivities.map((activity) => (
                            <tr key={activity.id} className="border-b border-soft/5 hover:bg-background/30 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-neon-pink/20 to-purple-500/20 rounded-full flex items-center justify-center">
                                            <span className="text-xs font-medium text-light">{activity.username.slice(0, 2).toUpperCase()}</span>
                                        </div>
                                        <span className="text-light font-medium">{activity.username}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-light capitalize">{activity.game}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(activity.action)}`}>{activity.action.toUpperCase()}</span>
                                </td>
                                <td className="p-4">
                                    <span className="text-light font-medium">{activity.amount.toFixed(3)} SOL</span>
                                </td>
                                <td className="p-4">
                                    <span className={`font-medium ${activity.result > 0 ? "text-green-400" : "text-red-400"}`}>
                                        {activity.result > 0 ? "+" : ""}
                                        {activity.result.toFixed(3)} SOL
                                    </span>
                                </td>
                                <td className="p-4">{activity.multiplier ? <span className="text-yellow-400 font-medium">{activity.multiplier}x</span> : <span className="text-gray-500">-</span>}</td>
                                <td className="p-4">
                                    <span className="text-soft text-sm">{activity.timestamp}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {currentActivities.length === 0 && (
                    <div className="p-12 text-center">
                        <div className="mb-4">
                            <Bot className="w-12 h-12 text-soft mx-auto" />
                        </div>
                        <h3 className="text-xl font-semibold text-light mb-2">No Bot Activity</h3>
                        <p className="text-soft">Start the bot simulation to see activity here</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {filteredActivities.length > 0 && (
                <div className="p-6 border-t border-soft/10">
                    <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            )}
        </div>
    );
}
