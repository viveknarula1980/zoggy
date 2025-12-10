"use client";
import React, { useState, useRef, useEffect } from "react";
import { Wallet, AlertCircle, RotateCcw, Plus, Minus } from "lucide-react";
import usePDAWallet from "@/utils/hooks/usePDAWallet";
import { formatCurrencyDisplay, solToUsd } from "@/utils/currency";
interface PDAWalletDisplayProps {
    className?: string;
    showResetButton?: boolean; // For testing/demo purposes
    onAddFunds?: () => void;
    onWithdrawFunds?: () => void;
}

const PDAWalletDisplay: React.FC<PDAWalletDisplayProps> = ({ className = "", showResetButton = false, onAddFunds, onWithdrawFunds }) => {
    const { balance, isLoading, error, formatBalance, resetToInitialBalance } = usePDAWallet();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Convert SOL balance to USD for display using real-time price
    const usdBalance = solToUsd(balance);
    const currencyDisplay = formatCurrencyDisplay(usdBalance);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleOptionClick = (action: string) => {
        setIsDropdownOpen(false);

        switch (action) {
            case "add-funds":
                onAddFunds?.();
                break;
            case "withdraw-funds":
                onWithdrawFunds?.();
                break;
        }
    };

    // Check if className contains 'relative' to handle different positioning
    const isRelative = className.includes("relative");

    // Match the navbar wallet styling: same height, colors, and structure
    const baseClasses = isRelative
        ? `flex gap-1 sm:gap-2 items-center w-20 sm:w-32 md:w-40 h-9 sm:h-10 md:h-12 bg-background-secondary hover:bg-background-secondary/30 text-light px-2 sm:px-3 md:px-6 py-2 rounded-lg sm:rounded-xl border border-purple/30 transition-all duration-300 cursor-pointer ${className}`
        : `absolute top-4 left-4 bg-background-secondary/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple/30 ${className}`;

    // For now, PDA wallet is always "connected" since we're using dummy data
    // Later this will check actual PDA wallet connection status

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                className={baseClasses}
                onClick={() => isRelative && setIsDropdownOpen(!isDropdownOpen)}
            >
                {isRelative ? (
                    // Navbar style - horizontal layout matching wallet button
                    <>
                        <Wallet size={20} className="hidden md:block text-neon-pink" />
                        <div className="flex flex-col justify-center">
                            {isLoading ? (
                                <span className="text-xs text-gray-400">Loading...</span>
                            ) : error ? (
                                <div className="flex items-center gap-1">
                                    <AlertCircle size={12} className="text-red-400" />
                                    <span className="text-xs text-red-400">Error</span>
                                </div>
                            ) : (
                                <>
                                    <div className="hidden sm:block">
                                        <span className="text-sm font-medium text-light">{currencyDisplay.primary}</span>
                                        <div className="text-xs text-soft">{currencyDisplay.secondary}</div>
                                    </div>
                                    <div className="block sm:hidden">
                                        <span className="text-sm font-medium text-light">{currencyDisplay.primary}</span>
                                    </div>
                                    {showResetButton && (
                                        <button onClick={resetToInitialBalance} className="absolute -top-1 -right-1 p-0.5 rounded hover:bg-purple/30 transition-colors" title="Reset balance to 100 SOL">
                                            <RotateCcw size={8} className="text-gray-400 hover:text-light" />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    // Game area style - vertical layout (original)
                    <div className="text-center">
                        {isLoading ? (
                            <>
                                <div className="text-lg font-bold text-gray-400">...</div>
                                <div className="text-xs text-soft">Loading</div>
                            </>
                        ) : error ? (
                            <>
                                <div className="text-lg font-bold text-red-400 flex items-center justify-center gap-1">
                                    <AlertCircle size={16} />
                                    Error
                                </div>
                                <div className="text-xs text-soft">PDA Balance</div>
                            </>
                        ) : (
                            <>
                                <div className="text-lg font-bold text-light">{currencyDisplay.primary}</div>
                                <div className="text-xs text-soft">{currencyDisplay.secondary}</div>
                                <div className="text-xs text-soft flex items-center justify-center gap-1">
                                    PDA Balance
                                    {showResetButton && (
                                        <button onClick={resetToInitialBalance} className="p-1 rounded hover:bg-purple/20 transition-colors" title="Reset balance to 100 SOL">
                                            <RotateCcw size={10} className="text-soft hover:text-light" />
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Dropdown Menu - Only show when in navbar (isRelative) */}
            {isRelative && isDropdownOpen && (
                <div className="absolute right-0 top-14 w-48 px-2 py-2 rounded-xl border border-soft/10 bg-[#17132d] backdrop-blur-md drop-shadow-2xl z-50">
                    <div className="flex flex-col gap-1">
                        {/* Add Funds Option */}
                        <button
                            onClick={() => handleOptionClick("add-funds")}
                            className="flex items-center gap-3 w-full text-left px-3 py-2 text-soft hover:text-light hover:bg-soft/10 rounded-lg transition-all duration-200"
                        >
                            <Plus size={16} />
                            <span className="text-sm">Add Funds</span>
                        </button>

                        {/* Withdraw Funds Option */}
                        <button
                            onClick={() => handleOptionClick("withdraw-funds")}
                            className="flex items-center gap-3 w-full text-left px-3 py-2 text-soft hover:text-light hover:bg-soft/10 rounded-lg transition-all duration-200"
                        >
                            <Minus size={16} />
                            <span className="text-sm">Withdraw Funds</span>
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default PDAWalletDisplay;
