"use client";

import { Transaction } from "@/utils/api/transactionsApi";
import { CreditCard } from "lucide-react";

interface TransactionTableProps {
    transactions: Transaction[];
    onTransactionClick: (transaction: Transaction) => void;
}

export default function TransactionTable({ transactions, onTransactionClick }: TransactionTableProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "text-green-400";
            case "pending":
                return "text-yellow-400";
            case "failed":
                return "text-red-400";
            case "cancelled":
                return "text-gray-400";
            default:
                return "text-gray-400";
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "deposit":
                return "text-green-400";
            case "withdrawal":
                return "text-blue-400";
            case "bet":
                return "text-orange-400";
            case "win":
                return "text-green-400";
            case "loss":
                return "text-red-400";
            default:
                return "text-gray-400";
        }
    };

    const formatAmount = (amount: number, type: string) => {
        const sign = type === "deposit" || type === "win" ? "+" : type === "withdrawal" || type === "bet" || type === "loss" ? "-" : "";
        return `${sign}$${amount.toFixed(2)}`;
    };

    if (transactions.length === 0) {
        return (
            <div className="glass rounded-xl p-12 border border-soft/10 text-center">
                <div className="mb-4">
                    <CreditCard className="w-16 h-16 text-soft mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No transactions found</h3>
                <p className="text-soft">Try adjusting your filters or search criteria</p>
            </div>
        );
    }

    return (
        <div className="glass rounded-xl border border-soft/10 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-background-secondary/50 border-b border-border/30">
                        <tr className="text-left text-sm font-medium text-soft">
                            <th className="px-6 py-4">Transaction ID</th>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Game</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Time</th>
                            <th className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-soft/10">
                        {transactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-background-secondary/30 transition-colors">
                                <td className="px-6 py-4 text-sm text-light font-mono">{transaction.id}</td>
                                <td className="px-6 py-4 text-sm text-light">{transaction.username}</td>
                                <td className="px-6 py-4 text-sm text-light ">
                                    <span className={`capitalize ${getTypeColor(transaction.type)}`}>{transaction.type}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-light">{transaction.game ? <span className="capitalize">{transaction.game}</span> : <span className="text-soft">-</span>}</td>
                                <td className="px-6 py-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className={`font-medium ${getTypeColor(transaction.type)}`}>{formatAmount(transaction.amount, transaction.type)}</span>
                                        {transaction.currency !== "SOL" && <span className="text-xs text-light">{transaction.currency}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            transaction.status === "completed" ? "bg-green-500/20 text-green-400" : transaction.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : transaction.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-light/20 text-light"
                                        }`}
                                    >
                                        {transaction.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-light">{new Date(transaction.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm">
                                    <button onClick={() => onTransactionClick(transaction)} className="px-3 py-1 bg-neon-pink/20 text-neon-pink rounded-lg border border-neon-pink/30 hover:bg-neon-pink/30 transition-colors text-xs">
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
