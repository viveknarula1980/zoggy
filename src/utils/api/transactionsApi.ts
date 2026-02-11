export interface Transaction {
    id: number;
    username: string;
    userId?: number;
    type: string;
    game: string | null;
    amount: number;
    currency: string;
    status: string;
    timestamp: string;
    payout: number;
    fees?: number;
    description?: string; // ✅ Add this to resolve the build error
    walletAddress?: string;
    txHash?: string;
}

export interface TransactionStats {
    totalVolume: number;
    dailyVolume: number;
    weeklyVolume: number;
    pendingTransactions: number;
}

export interface TransactionFilters {
    type?: string;
    status?: string;
    game?: string;
    search?: string;
}

const API_URL = 
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_ADMIN_URL ||
  "";

export const TransactionsApiService = {
    async fetchTransactions(page = 1, limit = 20, filters: Record<string, string> = {}) {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
            ...filters,
        });

        const res = await fetch(`${API_URL}/admin/transactions?${params}`);
        if (!res.ok) throw new Error("Failed to fetch transactions");
        return res.json();
    },

    async fetchTransactionStats() {
        const res = await fetch(`${API_URL}/admin/transaction-stats`);
        if (!res.ok) throw new Error("Failed to fetch transaction stats");
        return res.json();
    },

    async exportTransactions(filters: Record<string, string> = {}) {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_URL}/admin/transactions/export?${params}`);
        if (!res.ok) throw new Error("Failed to export transactions");
        return res.blob();
    },

    async updateTransactionStatus(id: number, newStatus: string) {
        const res = await fetch(`${API_URL}/admin/transactions/${id}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) throw new Error("Failed to update transaction status");
        return res.json();
    },
};
