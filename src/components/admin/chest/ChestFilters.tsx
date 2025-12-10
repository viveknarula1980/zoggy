"use client";

import { useState } from "react";
import { Search, Download, Filter } from "lucide-react";

export interface ChestFilters {
    type: string;
    status: string;
    search: string;
}

interface ChestFiltersProps {
    filters: ChestFilters;
    onFilterChange: (key: keyof ChestFilters, value: string) => void;
    onSearchChange: (value: string) => void;
    onExport: () => void;
}

export default function ChestFilters({ filters, onFilterChange, onSearchChange, onExport }: ChestFiltersProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearchChange(searchTerm);
    };

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        if (value === "") {
            onSearchChange("");
        }
    };

    return (
        <div className="glass rounded-xl p-6 border border-soft/10 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    {/* Search */}
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-soft w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by user, chest type..."
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background/50 border border-soft/20 rounded-lg text-white placeholder-soft focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                        />
                    </form>
                </div>

                {/* Quick Filters & Export */}
                <div className="flex gap-3">
                    <button
                        onClick={() => onFilterChange("status", filters.status === "available" ? 'all' : "available")} 
                        className={`px-4 py-2 rounded-lg border transition-all duration-200 ${filters.status === "available" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-background/30 text-soft border-soft/20 hover:bg-background/50"}`}
                    >
                        Available
                    </button>
                    <button onClick={() => onFilterChange("type", filters.type === "daily" ? 'all' : "daily")}  className={`px-4 py-2 rounded-lg border transition-all duration-200 ${filters.type === "daily" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-background/30 text-soft border-soft/20 hover:bg-background/50"}`}>
                        Daily
                    </button>
                    <button onClick={onExport} className="flex items-center gap-2 px-4 py-2 bg-neon-pink/20 text-neon-pink rounded-lg border border-neon-pink/30 hover:bg-neon-pink/30 transition-all duration-200">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>
        </div>
    );
}
