"use client";

import { TransactionFilters as FiltersType } from "@/utils/api/transactionsApi";
import { Search } from "lucide-react";

interface TransactionFiltersProps {
    filters: FiltersType;
    onFilterChange: (key: keyof FiltersType, value: string) => void;
    onSearchChange: (value: string) => void;
    onExport: () => void;
}

export default function TransactionFilters({ filters, onFilterChange, onSearchChange, onExport }: TransactionFiltersProps) {
    const dropdownStyles = {
        className: "px-3 py-2 bg-background/80 border border-soft/30 rounded-lg text-white focus:outline-none focus:border-neon-pink/50 appearance-none cursor-pointer",
        style: {
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: "right 0.5rem center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "1.5em 1.5em",
            paddingRight: "2.5rem",
        },
    };

    const typeFilters = [
        {
            name: "All Types",
            value: "all",
        },

        {
            name: "Deposits",
            value: "deposit",
        },

        {
            name: "Withdrawals",
            value: "withdrawal",
        },

        {
            name: "Bets",
            value: "bet",
        },

        {
            name: "Wins",
            value: "win",
        },

        {
            name: "Losses",
            value: "loss",
        },
    ];

    const games = [
        {
            name: "All Games",
            value: "all",
        },

        {
            name: "Coinflip",
            value: "coinflip",
        },

        {
            name: "Dice",
            value: "dice",
        },

        {
            name: "Crash",
            value: "crash",
        },

        {
            name: "Mines",
            value: "mines",
        },

        {
            name: "Plinko",
            value: "plinko",
        },

        {
            name: "Slots",
            value: "slots",
        },
    ];

    const statusFilters = [
        {
            name: "All Status",
            value: "all",
        },

        {
            name: "Completed",
            value: "completed",
        },

        {
            name: "Pending",
            value: "pending",
        },

        {
            name: "Failed",
            value: "failed",
        },

        {
            name: "Cancelled",
            value: "cancelled",
        },
    ];

    return (
        <div className="glass rounded-xl p-6 border border-soft/10 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-4">
                {/* Search */}
                <div className="xl:col-span-2">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-soft w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={filters.search || ""}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-10 px-3 py-2 bg-card/20 border border-soft/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-pink/50"
                        />
                    </div>
                </div>

                {/* Type Filter */}
                <select value={filters.type || "all"} onChange={(e) => onFilterChange("type", e.target.value)} {...dropdownStyles}>
                    {typeFilters.map((type) => {
                        return (
                            <option key={type.value} value={type.value} className="bg-background text-white">
                                {type.name}
                            </option>
                        );
                    })}
                </select>

                {/* Status Filter */}
                <select value={filters.status || "all"} onChange={(e) => onFilterChange("status", e.target.value)} {...dropdownStyles}>
                    {statusFilters.map((filter) => {
                        return (
                            <option key={filter.value} value={filter.value} className="bg-background text-white">
                                {filter.name}
                            </option>
                        );
                    })}
                </select>

                {/* Game Filter */}
                <select value={filters.game || "all"} onChange={(e) => onFilterChange("game", e.target.value)} {...dropdownStyles}>
                    {games.map((game) => {
                        return (
                            <option key={game.value} value={game.value} className="bg-background text-white">
                                {game.name}
                            </option>
                        );
                    })}
                </select>

                {/* Export Button */}
                <button onClick={onExport} className="px-4 py-2 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-lg hover:bg-neon-pink/40 hover:border-neon-pink/50 cursor-pointer transition-all duration-300">
                    Export CSV
                </button>
            </div>
        </div>
    );
}
