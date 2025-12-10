"use client";

import { useState } from "react";
import { X, ArrowUpRight, Wallet, AlertTriangle, Loader2 } from "lucide-react";

interface WithdrawData {
    walletAddress: string;
    amount: number;
}

interface WithdrawConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    withdrawData: WithdrawData;
    isProcessing: boolean;
}

export default function WithdrawConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    withdrawData,
    isProcessing
}: WithdrawConfirmModalProps) {
    const [confirmAddress, setConfirmAddress] = useState("");
    const [addressError, setAddressError] = useState("");

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isProcessing) {
            onClose();
        }
    };

    const handleConfirm = () => {
        // Verify the address matches
        if (confirmAddress.trim() !== withdrawData.walletAddress) {
            setAddressError("Address does not match. Please verify and try again.");
            return;
        }

        setAddressError("");
        onConfirm();
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfirmAddress(e.target.value);
        if (addressError) {
            setAddressError("");
        }
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 8)}...${address.slice(-8)}`;
    };

    // Amount is already in USD, no conversion needed

    return (
        <div
            className="fixed inset-0 bg-background-secondary/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={handleBackdropClick}
        >
            <div className="bg-background-secondary rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        <h3 className="text-lg font-semibold text-light">Confirm Withdrawal</h3>
                    </div>
                    {!isProcessing && (
                        <button
                            onClick={onClose}
                            className="p-1 text-light/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Warning Message */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <div>
                            <p className="text-red-400 font-medium text-sm">Critical Warning</p>
                            <p className="text-red-300/70 text-sm mt-1">
                                This action cannot be undone. Please verify all details carefully before proceeding.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Transaction Details */}
                <div className="space-y-4 mb-6">
                    <div className="bg-background/30 rounded-lg p-4 border border-soft/10">
                        <h4 className="text-soft text-sm font-medium mb-3">Transaction Details</h4>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-soft text-sm">Amount:</span>
                                <div className="text-right">
                                    <p className="text-light font-medium">${withdrawData.amount.toLocaleString()} SOL</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-start">
                                <span className="text-soft text-sm">Destination:</span>
                                <div className="text-right">
                                    <p className="text-light font-medium font-mono text-sm">
                                        {formatAddress(withdrawData.walletAddress)}
                                    </p>
                                    <p className="text-soft text-xs">External Wallet</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address Verification */}
                    <div>
                        <label className="block text-sm font-medium text-soft mb-2">
                            Verify Wallet Address
                        </label>
                        <p className="text-xs text-soft mb-3">
                            Please re-enter the destination wallet address to confirm:
                        </p>
                        <div className="relative">
                            <input
                                type="text"
                                value={confirmAddress}
                                onChange={handleAddressChange}
                                placeholder="Re-enter wallet address..."
                                className={`w-full bg-background/50 rounded-lg px-4 py-3 text-light border transition-colors focus:outline-none font-mono text-sm ${addressError
                                        ? "border-red-500/50 focus:border-red-500"
                                        : "border-soft/20 focus:border-neon-pink/50"
                                    }`}
                                disabled={isProcessing}
                            />
                            <Wallet className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-soft" />
                        </div>
                        {addressError && (
                            <p className="text-red-400 text-sm mt-2">{addressError}</p>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing || !confirmAddress.trim() || confirmAddress !== withdrawData.walletAddress}
                        className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <ArrowUpRight className="w-5 h-5" />
                                Confirm Withdrawal
                            </>
                        )}
                    </button>

                    {!isProcessing && (
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-gray-500/20 hover:bg-gray-500/30 text-light border border-gray-500/30 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>

                {/* Processing State */}
                {isProcessing && (
                    <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                            <div>
                                <p className="text-blue-400 font-medium text-sm">Processing Withdrawal</p>
                                <p className="text-blue-300/70 text-sm">
                                    Please wait while we process your withdrawal request...
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
