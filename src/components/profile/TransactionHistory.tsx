"use client";

import { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Search, Filter, Download } from "lucide-react";
import { MOCK_TRANSACTIONS, type Transaction } from "@/utils/api/profileapi";

interface TransactionHistoryProps {
  isLoading?: boolean;
}

export default function TransactionHistory({ isLoading = false }: TransactionHistoryProps) {
  const transactions: Transaction[] = MOCK_TRANSACTIONS;

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "deposit" | "withdrawal">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending" | "failed">("all");

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      (tx.txHash?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (tx.address?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (tx.amount?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (tx.type?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (tx.status?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesType = filterType === "all" || tx.type === filterType;
    const matchesStatus = filterStatus === "all" || tx.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400 bg-green-500/20";
      case "pending":
        return "text-yellow-400 bg-yellow-500/20";
      case "failed":
        return "text-red-400 bg-red-500/20";
      default:
        return "text-light/60 bg-soft/20";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Date", "Type", "Amount (USD)", "Status", "Transaction Hash", "Transaction ID"],
      ...filteredTransactions.map((tx) => [
        formatDate(tx.timestamp),
        tx.type.charAt(0).toUpperCase() + tx.type.slice(1), // Capitalize first letter
        `$${tx.amount.toFixed(2)}`, // Format as currency to match UI
        tx.status.charAt(0).toUpperCase() + tx.status.slice(1), // Capitalize first letter
        tx.txHash || "N/A",
        tx.id,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transaction_history.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-6 border border-purple/20 h-full flex flex-col">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-soft/20 rounded-xl"></div>
              <div>
                <div className="h-6 bg-soft/20 rounded mb-2 w-40"></div>
                <div className="h-4 bg-soft/20 rounded w-48"></div>
              </div>
            </div>
            <div className="h-8 bg-soft/20 rounded w-20"></div>
          </div>

          {/* Quick Stats Skeleton */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-soft/20 rounded-lg"></div>
            ))}
          </div>

          {/* Search Bar Skeleton */}
          <div className="h-10 bg-soft/20 rounded-lg mb-6"></div>

          {/* Transaction List Skeleton */}
          <div className="flex-1 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 glass rounded-lg border border-purple/20">
                <div className="w-10 h-10 bg-soft/20 rounded-full"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="h-4 bg-soft/20 rounded w-16"></div>
                    <div className="h-4 bg-soft/20 rounded w-12"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-soft/20 rounded w-24"></div>
                    <div className="h-3 bg-soft/20 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 md:p-6 border border-purple/20 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:block p-2 md:p-3 glass rounded-xl">
            <Download className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-light">Transaction History</h3>
            <p className="text-xs md:text-sm text-soft">Your deposit and withdrawal records</p>
          </div>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center space-x-2 px-3 py-2 glass rounded-lg hover:bg-soft/20 transition-colors"
        >
          <Download className="w-5 h-5 text-soft" />
          <span className="text-xs md:text-sm text-soft ">Export</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="glass rounded-lg p-2 md:p-3 border border-purple/20">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownLeft className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
            <span className="text-xs md:text-sm text-soft">Deposits</span>
          </div>
          <div className="text-sm md:text-md font-bold text-green-400">
            $
            {transactions
              .filter((tx) => tx.type === "deposit" && tx.status === "completed")
              .reduce((sum, tx) => sum + tx.amount, 0)
              .toFixed(2)}
          </div>
        </div>

        <div className="glass rounded-lg p-2 md:p-3 border border-purple/20">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
            <span className="text-xs md:text-sm text-soft">Withdrawals</span>
          </div>
          <div className="text-sm md:text-md font-bold text-red-400">
            $
            {transactions
              .filter((tx) => tx.type === "withdrawal" && tx.status === "completed")
              .reduce((sum, tx) => sum + tx.amount, 0)
              .toFixed(2)}
          </div>
        </div>

        <div className="glass rounded-lg p-2 md:p-3 border border-purple/20">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
            <span className="text-xs md:text-sm text-soft">Total</span>
          </div>
          <div className="text-sm md:text-md font-bold text-light">{transactions.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-soft" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 glass rounded-lg border border-purple/20 text-light placeholder-soft focus:outline-none focus:border-purple/50"
          />
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-2 md:gap-3 p-2 md:p-3 glass rounded-lg border border-purple/20 hover:bg-soft/10 transition-colors"
            >
              {/* Activity Icon */}
              <div
                className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border ${
                  tx.type === "deposit"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }`}
              >
                {tx.type === "deposit" ? <ArrowDownLeft className="w-4 h-4 md:w-5 md:h-5" /> : <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" />}
              </div>

              {/* Transaction Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-light text-sm">${tx.amount.toFixed(2)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-soft mt-0.5">
                  <span>{formatDate(tx.timestamp)}</span>
                  {tx.txHash && <span className="font-mono truncate ml-2">{tx.txHash}</span>}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Search className="w-12 h-12 mb-2 mx-auto text-soft/50" />
            <div className="text-lg font-medium text-light mb-1">No transactions found</div>
            <div className="text-sm text-soft">Try adjusting your filter settings</div>
          </div>
        )}
      </div>
    </div>
  );
}
