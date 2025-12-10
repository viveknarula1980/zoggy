"use client";

import { useState } from "react";
import { Transaction, TransactionsApiService } from "@/utils/api/transactionsApi";
import { X, Copy } from "lucide-react";

interface TransactionDetailsModalProps {
    transaction: Transaction;
    onClose: () => void;
    onStatusUpdate: () => void;
}

export default function TransactionDetailsModal({ transaction, onClose, onStatusUpdate }: TransactionDetailsModalProps) {
    const [updating, setUpdating] = useState(false);

    const updateStatus = async (newStatus: Transaction["status"]) => {
        try {
            setUpdating(true);
            await TransactionsApiService.updateTransactionStatus(transaction.id, newStatus);
            onStatusUpdate();
            onClose();
        } catch (error) {
            console.error("Error updating transaction status:", error);
        } finally {
            setUpdating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "text-green-400 bg-green-500/20 border-green-500/30";
            case "pending":
                return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
            case "failed":
                return "text-red-400 bg-red-500/20 border-red-500/30";
            case "cancelled":
                return "text-gray-400 bg-gray-500/20 border-gray-500/30";
            default:
                return "text-gray-400 bg-gray-500/20 border-gray-500/30";
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
        return `${sign}${amount.toFixed(2)}`;
    };

    const canUpdateStatus = transaction.status === "pending";

    return (
        <div className="fixed inset-0 bg-background-secondary/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-background-secondary backdrop-blur-md rounded-xl border border-soft/10 w-full max-w-3xl mx-4 max-h-[90vh] custom-scrollbar overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Transaction Details</h2>
                            <div className="flex items-center mt-1 space-x-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(transaction.status)}`}>{transaction.status}</span>
                                <span className="text-soft">ID: {transaction.id}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-soft hover:text-white transition-colors cursor-pointer">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Transaction Info */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-3">Transaction Information</h3>
                        <div className="bg-background/30 rounded-lg p-4 space-y-4">
                            {/* User Information - Full Width */}
                            <div className="w-full">
                                <label className="block text-sm font-medium text-soft mb-2">User</label>
                                <div className="flex items-center space-x-2">
                                    <p className="text-base text-light font-medium break-all">{transaction.username}</p>
                                    {/* <span className="text-sm text-gray-400">ID: {transaction.userId}</span> */}
                                </div>
                            </div>

                            {/* Transaction Details - Grid Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-soft mb-2">Type</label>
                                    <p className={`text-base font-medium capitalize ${getTypeColor(transaction.type)}`}>{transaction.type}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-soft mb-2">Amount</label>
                                    <div className="flex items-baseline space-x-2">
                                        <p className={`text-base font-medium ${getTypeColor(transaction.type)}`}>{formatAmount(transaction.amount, transaction.type)}</p>
                                        <p className="text-sm text-light">{transaction.currency}</p>
                                    </div>
                                    {transaction.fees && <p className="text-sm text-soft mt-1">Fees: {transaction.fees.toFixed(2)}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-soft mb-2">Timestamp</label>
                                    <p className="text-base text-light">{new Date(transaction.timestamp).toLocaleString()}</p>
                                </div>
                            </div>

                            {transaction.game && (
                                <div>
                                    <label className="block text-sm font-medium text-soft mb-2">Game</label>
                                    <p className="text-base text-light font-medium capitalize">{transaction.game}</p>
                                </div>
                            )}

                            {transaction.description && (
                                <div>
                                    <label className="block text-sm font-medium text-soft mb-2">Description</label>
                                    <p className="text-base text-light">{transaction.description}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Blockchain Information */}
                    {(transaction.txHash || transaction.walletAddress) && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-light mb-3">Blockchain Information</h3>
                            <div className="bg-background/30 rounded-lg p-4 space-y-4">
                                {transaction.walletAddress && (
                                    <div>
                                        <label className="block text-sm font-medium text-light mb-1">Wallet Address</label>
                                        <div className="flex items-center space-x-2 rounded-lg">
                                            <p className="text-base text-light font-mono break-all">{transaction.walletAddress}</p>
                                            <button onClick={() => copyToClipboard(transaction.walletAddress!)} className="text-neon-pink hover:text-neon-pink/80 transition-colors flex-shrink-0 cursor-pointer" title="Copy to clipboard">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {transaction.txHash && (
                                    <div>
                                        <label className="block text-sm font-medium text-light mb-2">Transaction Hash</label>
                                        <div className="flex items-center space-x-2 rounded-lg">
                                            <p className="text-base text-light font-mono break-all">{transaction.txHash}</p>
                                            <button onClick={() => copyToClipboard(transaction.txHash!)} className="text-neon-pink hover:text-neon-pink/80 transition-colors flex-shrink-0 cursor-pointer" title="Copy to clipboard">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status Update Actions */}
                    {canUpdateStatus && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-light mb-3">Update Status</h3>
                            <div className="bg-background/30 rounded-lg p-4">
                                <p className="text-soft text-sm mb-4">This transaction is pending. You can manually update its status if needed.</p>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => updateStatus("completed")} disabled={updating} className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {updating ? "Updating..." : "Mark Completed"}
                                    </button>
                                    <button onClick={() => updateStatus("failed")} disabled={updating} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {updating ? "Updating..." : "Mark Failed"}
                                    </button>
                                    <button onClick={() => updateStatus("cancelled")} disabled={updating} className="px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {updating ? "Updating..." : "Cancel"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="flex-1 py-3 px-4 bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition-all duration-300">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
