import { Search, Download } from "lucide-react";

interface RewardFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    totalRewards: number;
}

export default function RewardFilters({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, totalRewards }: RewardFiltersProps) {
    const handleExport = () => {
        // Mock export functionality
        console.log("Exporting rewards data...");
    };

    return (
        <div className="glass rounded-2xl p-6 mb-8 border border-soft/10">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-soft w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by tier name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-card/20 border border-soft/20 rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50"
                        />
                    </div>
                    {/* Quick Filters */}
                    <div className="flex gap-2">
                        <button onClick={() => setStatusFilter("active")} className={`px-5 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === "active" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-background-secondary/70 text-soft hover:bg-soft/20"}`}>
                            Active
                        </button>
                        <button onClick={() => setStatusFilter("inactive")} className={`px-5 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === "inactive" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-background-secondary/70 text-soft hover:bg-soft/20"}`}>
                            Inactive
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* <span className="text-sm text-light">
                        {totalRewards} tier{totalRewards !== 1 ? "s" : ""} found
                    </span> */}
                    <button onClick={handleExport} className="px-4 py-2 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-lg hover:bg-neon-pink/40 hover:border-neon-pink/50 cursor-pointer transition-all duration-300">
                        Export CSV
                    </button>
                </div>
            </div>
        </div>
    );
}
