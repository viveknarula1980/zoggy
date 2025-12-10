"use client";

import { Search } from "lucide-react";
import { useState } from "react";

interface UserFiltersProps {
    onSearchChange: (search: string) => void;
    onStatusFilter: (status: string) => void;
    onExport: () => void;
}

export default function UserFilters({ onSearchChange, onStatusFilter, onExport }: UserFiltersProps) {
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
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("all");

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        onSearchChange(value);
    };

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status);
        onStatusFilter(status);
    };

    const quickFilters = {
        activeUsersName: "Active Users",
        activeUsersValue: "active",
        bannedUsersName: "Banned Users",
        bannedUsersValue: "banned",
        disabledUsersName: "Disabled Users",
        disabledUsersValue: "disabled",
        allUsersName: "All Users",
        allUsersValue: "all",
    };
    return (
        <div className="glass rounded-xl p-6 border border-soft/10 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-soft w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by username or wallet address..."
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-10 px-4 py-2 bg-card/20 border border-soft/30 rounded-lg text-soft placeholder-soft focus:outline-none focus:ring-2 focus:ring-neon-pink/50 focus:border-neon-pink/50"
                        />
                    </div>

                    {/* Status Filter */}
                    {/* <select value={selectedStatus} onChange={(e) => handleStatusChange(e.target.value)} {...dropdownStyles}>
                        <option value="all" className="bg-background text-soft">
                            All Status
                        </option>
                        <option value="active" className="bg-background text-soft">
                            Active
                        </option>
                        <option value="disabled" className="bg-background text-soft">
                            Disabled
                        </option>
                        <option value="banned" className="bg-background text-soft">
                            Banned
                        </option>
                    </select> */}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button onClick={onExport} className="px-4 py-2 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-lg hover:bg-neon-pink/40 hover:border-neon-pink/50 cursor-pointer transition-all duration-300">
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center flex-wrap gap-2 mt-4">
                <span className="text-sm text-gray-400">Quick filters:</span>
                <button
                    onClick={() => handleStatusChange(quickFilters.allUsersValue)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedStatus === quickFilters.allUsersValue ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-card/20 text-soft hover:bg-card/30"}`}
                >
                    {quickFilters.allUsersName}
                </button>
                <button
                    onClick={() => handleStatusChange(quickFilters.activeUsersValue)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedStatus === quickFilters.activeUsersValue ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-card/20 text-soft hover:bg-card/30"}`}
                >
                    {quickFilters.activeUsersName}
                </button>
                <button
                    onClick={() => handleStatusChange(quickFilters.bannedUsersValue)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedStatus === quickFilters.bannedUsersValue ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-card/20 text-soft hover:bg-card/30"}`}
                >
                    {quickFilters.bannedUsersName}
                </button>
                <button
                    onClick={() => handleStatusChange(quickFilters.disabledUsersValue)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedStatus === quickFilters.disabledUsersValue ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-card/20 text-soft hover:bg-card/30"}`}
                >
                    {quickFilters.disabledUsersName}
                </button>
            </div>
        </div>
    );
}
