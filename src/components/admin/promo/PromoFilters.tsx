import { Search, Download, Filter } from "lucide-react";

export interface PromoFilters {
    type: string;
    status: string;
    trigger: string;
    search: string;
}

interface PromoFiltersProps {
    filters: PromoFilters;
    onFilterChange: (key: keyof PromoFilters, value: string) => void;
    onSearchChange: (value: string) => void;
    onExport: () => void;
}

export default function PromoFilters({ filters, onFilterChange, onSearchChange, onExport }: PromoFiltersProps) {
    return (
        <div className="glass rounded-xl p-6 border border-soft/10 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-soft w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search promos by name, code, or description..."
                            value={filters.search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background/50 border border-soft/20 rounded-lg text-white placeholder-soft focus:outline-none focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/20"
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Type Filter */}
                    <select value={filters.type} onChange={(e) => onFilterChange("type", e.target.value)} className="px-3 py-2 bg-background border border-soft/20 rounded-lg text-white focus:outline-none focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/20">
                        <option value="all">All Types</option>
                        <option value="welcome">Welcome Bonus</option>
                        <option value="deposit">Deposit Bonus</option>
                        <option value="rakeback">Rakeback</option>
                        <option value="cashback">Cashback</option>
                        <option value="free_spins">Free Spins</option>
                        <option value="reload">Reload Bonus</option>
                        <option value="seasonal">Seasonal</option>
                        <option value="vip">VIP Bonus</option>
                    </select>

                    {/* Status Filter */}
                    <select value={filters.status} onChange={(e) => onFilterChange("status", e.target.value)} className="px-3 py-2 bg-background border border-soft/20 rounded-lg text-white focus:outline-none focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/20">
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="expired">Expired</option>
                        <option value="draft">Draft</option>
                    </select>

                    {/* Trigger Filter */}
                    <select value={filters.trigger} onChange={(e) => onFilterChange("trigger", e.target.value)} className="px-3 py-2 bg-background border border-soft/20 rounded-lg text-white focus:outline-none focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/20">
                        <option value="all">All Triggers</option>
                        <option value="signup">Sign Up</option>
                        <option value="deposit">Deposit</option>
                        <option value="wager">Wager Amount</option>
                        <option value="loss">Loss Amount</option>
                        <option value="time">Time Based</option>
                        <option value="manual">Manual</option>
                        <option value="code">Promo Code</option>
                    </select>

                    {/* Export Button */}
                    <button onClick={onExport} className="flex items-center gap-2 px-4 py-2 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-lg hover:bg-neon-pink/30 transition-colors">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>
        </div>
    );
}
