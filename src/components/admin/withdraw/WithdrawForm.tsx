"use client";

import { useState } from "react";
import { ArrowUpRight, Wallet, AlertCircle } from "lucide-react";

interface WithdrawData {
    walletAddress: string;
    amount: number;
}

interface WithdrawFormProps {
    onSubmit: (data: WithdrawData) => void;
    disabled?: boolean;
}

export default function WithdrawForm({ onSubmit, disabled = false }: WithdrawFormProps) {
    const [walletAddress, setWalletAddress] = useState("");
    const [amount, setAmount] = useState("");
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        // Validate wallet address
        if (!walletAddress.trim()) {
            newErrors.walletAddress = "Wallet address is required";
        } else if (walletAddress.length < 32) {
            newErrors.walletAddress = "Invalid wallet address format";
        }

        // Validate amount
        if (!amount.trim()) {
            newErrors.amount = "Amount is required";
        } else {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                newErrors.amount = "Amount must be greater than 0";
            } else if (numAmount > 125075) { // Mock balance check in USD
                newErrors.amount = "Insufficient balance";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        onSubmit({
            walletAddress: walletAddress.trim(),
            amount: parseFloat(amount)
        });
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Only allow numbers and decimal point
        if (value === "" || /^\d*\.?\d*$/.test(value)) {
            setAmount(value);
            // Clear amount error when user starts typing
            if (errors.amount) {
                setErrors(prev => ({ ...prev, amount: "" }));
            }
        }
    };

    const handleWalletAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setWalletAddress(value);
        // Clear wallet address error when user starts typing
        if (errors.walletAddress) {
            setErrors(prev => ({ ...prev, walletAddress: "" }));
        }
    };

    const setMaxAmount = () => {
        setAmount("125075"); // Mock max balance in USD
        if (errors.amount) {
            setErrors(prev => ({ ...prev, amount: "" }));
        }
    };

    return (
        <div className="glass rounded-xl p-4 border border-soft/10">
            <div className="flex items-center gap-3 mb-4">
                <h3 className="text-base font-semibold text-light">Withdraw Details</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Wallet Address */}
                <div>
                    <label className="block text-sm font-medium text-soft mb-2">
                        Destination Wallet Address
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={walletAddress}
                            onChange={handleWalletAddressChange}
                            placeholder="Enter wallet address..."
                            className={`w-full bg-background/50 rounded-lg px-4 py-3 text-light border transition-colors focus:outline-none ${
                                errors.walletAddress 
                                    ? "border-red-500/50 focus:border-red-500" 
                                    : "border-soft/20 focus:border-neon-pink/50"
                            }`}
                            disabled={disabled}
                        />
                        <Wallet className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-soft" />
                    </div>
                    {errors.walletAddress && (
                        <div className="flex items-center gap-2 mt-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <p className="text-red-400 text-sm">{errors.walletAddress}</p>
                        </div>
                    )}
                </div>

                {/* Amount */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-soft">
                            Amount (SOL)
                        </label>
                        <button
                            type="button"
                            onClick={setMaxAmount}
                            className="text-xs text-neon-pink hover:text-neon-pink/80 transition-colors"
                            disabled={disabled}
                        >
                            Use Max
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={amount}
                            onChange={handleAmountChange}
                            placeholder="0.00"
                            className={`w-full bg-background/50 rounded-lg px-4 py-3 text-light border transition-colors focus:outline-none ${
                                errors.amount 
                                    ? "border-red-500/50 focus:border-red-500" 
                                    : "border-soft/20 focus:border-neon-pink/50"
                            }`}
                            disabled={disabled}
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-soft text-sm">
                            SOL
                        </span>
                    </div>
                    {errors.amount && (
                        <div className="flex items-center gap-2 mt-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <p className="text-red-400 text-sm">{errors.amount}</p>
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={disabled || !walletAddress || !amount}
                    className="w-full bg-neon-pink hover:bg-neon-pink/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <ArrowUpRight className="w-5 h-5" />
                    {disabled ? "Processing..." : "Withdraw Funds"}
                </button>
            </form>
        </div>
    );
}
