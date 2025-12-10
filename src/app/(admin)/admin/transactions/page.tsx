"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import TransactionDetailsModal from "@/components/admin/transaction/TransactionDetailsModal";
import TransactionStats from "@/components/admin/transaction/TransactionStats";
import TransactionFilters from "@/components/admin/transaction/TransactionFilters";
import TransactionTable from "@/components/admin/transaction/TransactionTable";
import TransactionPagination from "@/components/admin/transaction/TransactionPagination";
import { TransactionsApiService, Transaction, TransactionFilters as FiltersType, TransactionStats as StatsType } from "@/utils/api/transactionsApi";
import { StatsGridSkeleton, FiltersSkeleton, TableSkeleton, LoadingState } from "@/components/admin/common/SkeletonLoader";
import { useAdmin } from "@/contexts/AdminContext";
import { CreditCard } from "lucide-react";

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<StatsType | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTransactions, setTotalTransactions] = useState(0);

    // Filters
    const [filters, setFilters] = useState<FiltersType>({
        type: "all",
        status: "all",
        game: "all",
        search: "",
    });

    const itemsPerPage = 10;

    // auth
    const { isAuthenticated, isLoading: authLoading } = useAdmin();
    const router = useRouter();

    // Redirect to login if unauthenticated after auth check finishes
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            try {
                router.replace("/admin/login");
            } catch {}
        }
    }, [authLoading, isAuthenticated, router]);

    // Load transactions & stats — only when authenticated
    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) return;

        loadTransactions();
        loadStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, filters, authLoading, isAuthenticated]);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            setError(null);

            const filterParams = Object.fromEntries(Object.entries(filters).filter(([key, value]) => value && value !== "all"));

            const result = await TransactionsApiService.fetchTransactions(currentPage, itemsPerPage, filterParams);
            setTransactions(result.transactions);
            setTotalPages(result.pages);
            setTotalTransactions(result.total);
        } catch (err) {
            setError("Failed to load transactions");
            console.error("Error loading transactions:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const statsData = await TransactionsApiService.fetchTransactionStats();
            setStats(statsData);
        } catch (err) {
            console.error("Error loading transaction stats:", err);
        }
    };

    const handleFilterChange = (key: keyof FiltersType, value: string) => {
        setFilters((prev: FiltersType) => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page when filters change
    };

    const handleSearchChange = (value: string) => {
        setFilters((prev: FiltersType) => ({ ...prev, search: value }));
        setCurrentPage(1);
    };

    const openTransactionDetails = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setShowDetailsModal(true);
    };

    const exportTransactions = async () => {
        try {
            const filterParams = Object.fromEntries(Object.entries(filters).filter(([key, value]) => value && value !== "all"));

            const blob = await TransactionsApiService.exportTransactions(filterParams);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Error exporting transactions:", err);
        }
    };

    // While auth is being checked, show skeleton to avoid flash (no UI changes)
    if (authLoading) {
        return (
            <div className="flex h-screen">
                <AdminSidebar />

                <div className="flex-1 flex flex-col overflow-hidden">
                    <AdminHeader title="Transactions" subtitle="Monitor and manage platform transactions" />

                    <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <StatsGridSkeleton columns={4} />
                        <FiltersSkeleton />
                        <TableSkeleton columns={7} rows={10} />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                            <div className="glass rounded-xl p-6 border border-soft/10">
                                <LoadingState message="Checking authentication..." description="Please wait" />
                            </div>
                            <div className="glass rounded-xl p-6 border border-soft/10">
                                <LoadingState message="Preparing transactions..." description="Please wait" />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // If not authenticated (authLoading false) we've already redirected; avoid UI flash.
    if (!isAuthenticated) return null;

    return (
        <div className="flex h-screen">
            <AdminSidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminHeader title="Transactions" subtitle="Monitor and manage platform transactions" />

                <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {/* Stats Cards */}
                    {stats && <TransactionStats stats={stats} />}

                    {/* Filters and Search */}
                    <TransactionFilters filters={filters} onFilterChange={handleFilterChange} onSearchChange={handleSearchChange} onExport={exportTransactions} />

                    {/* Loading State */}
                    {loading && (
                        <div className="space-y-6">
                            <StatsGridSkeleton columns={4} />
                            <FiltersSkeleton />
                            <TableSkeleton columns={7} rows={10} />
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6">
                            <p className="text-red-400">{error}</p>
                            <button onClick={loadTransactions} className="mt-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Transactions Table */}
                    {!loading && !error && (
                        <>
                            <TransactionTable transactions={transactions} onTransactionClick={openTransactionDetails} />

                            {/* Pagination */}
                            {totalPages > 1 && <TransactionPagination currentPage={currentPage} totalPages={totalPages} totalTransactions={totalTransactions} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />}
                        </>
                    )}

                    {/* Empty State */}
                    {!loading && !error && transactions.length === 0 && (
                        <div className="glass rounded-xl p-12 border border-soft/10 text-center">
                            <div className="mb-4">
                                <CreditCard className="w-16 h-16 text-soft mx-auto" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">No transactions found</h3>
                            <p className="text-soft">Try adjusting your filters or search criteria</p>
                        </div>
                    )}
                </main>
            </div>

            {/* Transaction Details Modal */}
            {showDetailsModal && selectedTransaction && (
                <TransactionDetailsModal
                    transaction={selectedTransaction}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedTransaction(null);
                    }}
                    onStatusUpdate={loadTransactions}
                />
            )}
        </div>
    );
}
