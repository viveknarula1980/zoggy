"use client";

import { useState, useEffect } from "react";
import { Search, Filter, MoreVertical, Ban, CheckCircle, AlertTriangle } from "lucide-react";
import { getAffiliates, updateAffiliateStatus, type AdminAffiliate } from "@/utils/api/adminReferralsApi";
import { TableSkeleton, FiltersSkeleton } from "../common/SkeletonLoader";

export default function AffiliateList() {
    const [affiliates, setAffiliates] = useState<AdminAffiliate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        const fetchAffiliates = async () => {
            try {
                const data = await getAffiliates();
                setAffiliates(data);
            } catch (error) {
                console.error("Failed to fetch affiliates:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAffiliates();
    }, []);

    const handleStatusUpdate = async (affiliateId: string, newStatus: "active" | "suspended" | "banned") => {
        try {
            await updateAffiliateStatus(affiliateId, newStatus);
            setAffiliates((prev) => prev.map((affiliate) => (affiliate.id === affiliateId ? { ...affiliate, status: newStatus } : affiliate)));
        } catch (error) {
            console.error("Failed to update affiliate status:", error);
        }
    };

    const filteredAffiliates = affiliates.filter((affiliate) => {
        const matchesSearch = affiliate.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()) || affiliate.affiliateId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || affiliate.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "text-green-400 bg-green-400/20";
            case "suspended":
                return "text-yellow-400 bg-yellow-400/20";
            case "banned":
                return "text-red-400 bg-red-400/20";
            default:
                return "text-gray-400 bg-gray-400/20";
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="h-6 bg-soft/20 rounded w-48 animate-pulse"></div>
                    <div className="h-4 bg-soft/20 rounded w-32 animate-pulse"></div>
                </div>
                <FiltersSkeleton />
                <TableSkeleton columns={6} rows={8} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Affiliate Management</h2>
                <div className="text-sm text-soft">
                    {filteredAffiliates.length} of {affiliates.length} affiliates
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-soft" size={16} />
                    <input
                        type="text"
                        placeholder="Search by wallet address or affiliate ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-glass-dark border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-neon-pink/50 focus:outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-soft" />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-background border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                    </select>
                </div>
            </div>

            {/* Affiliates Table */}
            <div className="glass rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-background-secondary/50">
                            <tr className="text-light font-medium text-left">
                                <th className="p-4 ">Affiliate</th>
                                <th className="p-4 ">Referrals</th>
                                <th className="p-4 ">Earnings</th>
                                <th className="p-4 ">Balance</th>
                                <th className="p-4 ">Status</th>
                                <th className="p-4 ">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAffiliates.map((affiliate, index) => (
                                <tr key={affiliate.id} className={`border-t border-soft/10 hover:bg-background-secondary/30 transition-colors`}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-neon-pink to-purple rounded-full flex items-center justify-center text-white text-sm font-bold">{affiliate.affiliateId.slice(-2)}</div>
                                            <div>
                                                <div className="text-white font-medium">{affiliate.affiliateId}</div>
                                                <div className="text-soft text-xs font-mono">
                                                    {affiliate.walletAddress.slice(0, 8)}...{affiliate.walletAddress.slice(-8)}
                                                </div>
                                                {affiliate.fraudFlags.length > 0 && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <AlertTriangle size={12} className="text-red-400" />
                                                        <span className="text-red-400 text-xs">{affiliate.fraudFlags.length} flag(s)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-white font-semibold">{affiliate.totalReferrals}</div>
                                        <div className="text-soft text-xs">{affiliate.activeReferrals} active</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-white font-semibold">{formatCurrency(affiliate.lifetimeEarnings)}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-neon-pink font-semibold">{formatCurrency(affiliate.currentBalance)}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(affiliate.status)}`}>{affiliate.status.charAt(0).toUpperCase() + affiliate.status.slice(1)}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {affiliate.status === "active" && (
                                                <button onClick={() => handleStatusUpdate(affiliate.id, "suspended")} className="p-2 text-yellow-400 hover:bg-yellow-400/20 rounded-lg transition-colors" title="Suspend">
                                                    <AlertTriangle size={16} />
                                                </button>
                                            )}
                                            {affiliate.status === "suspended" && (
                                                <button onClick={() => handleStatusUpdate(affiliate.id, "active")} className="p-2 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors" title="Activate">
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => handleStatusUpdate(affiliate.id, "banned")} className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors" title="Ban">
                                                <Ban size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredAffiliates.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-soft mb-2">No affiliates found</div>
                        <div className="text-soft text-sm">Try adjusting your search or filters</div>
                    </div>
                )}
            </div>
        </div>
    );
}
