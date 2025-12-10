import React, { useState, useEffect } from "react";
import { formatCurrencyDisplay, solToUsd } from "@/utils/currency";

export interface GameResult {
    betAmount: number;
    isWin: boolean;
    winAmount?: number;
    multiplier?: number;
    resultText?: string; // Custom result text (e.g., "1.5x", "Mine Hit", "Crash at 2.3x")
}

interface GameResultSectionProps {
    result: GameResult | null;
    isVisible?: boolean;
    className?: string;
    compact?: boolean; // For even more compact display
    overlay?: boolean; // If true, renders as absolute positioned overlay
    autoHideDelay?: number; // Auto-hide after X milliseconds (default: 3000ms)
    onAutoHide?: () => void; // Callback when results auto-hide
}

const GameResultSection: React.FC<GameResultSectionProps> = ({
    result,
    isVisible = true,
    className = "",
    compact = false,
    overlay = true, // Default to overlay mode
    autoHideDelay = 5000, // Default 5 seconds
    onAutoHide,
}) => {
    const [shouldShow, setShouldShow] = useState(true);

    // Auto-hide after delay
    useEffect(() => {
        if (!isVisible || !result) {
            setShouldShow(true);
            return;
        }

        // Reset visibility when result changes
        setShouldShow(true);

        // Set timeout to hide
        const timer = setTimeout(() => {
            setShouldShow(false);
            // Call onAutoHide callback when results auto-hide
            if (onAutoHide) {
                onAutoHide();
            }
        }, autoHideDelay);

        return () => clearTimeout(timer);
    }, [result, isVisible, autoHideDelay]);

    if (!isVisible || !result || !shouldShow) {
        return null;
    }

    // Convert SOL amounts to USD for display
    const betUsdAmount = solToUsd(result.betAmount);
    const betDisplay = formatCurrencyDisplay(betUsdAmount);
    const winAmountDisplay = result.winAmount ? formatCurrencyDisplay(solToUsd(result.winAmount)) : null;

    // Determine result text
    let displayResult = result.resultText;
    if (!displayResult) {
        displayResult = result.isWin ? "WIN!" : "LOSE";
    }

    // Determine amount display
    const amountDisplay = result.isWin ? "+" + (winAmountDisplay?.primary || "$0.00") : "-" + betDisplay.primary;

    const amountSecondary = result.isWin ? winAmountDisplay?.secondary : betDisplay.secondary;

    if (compact) {
        return (
            <div className={`${overlay ? "absolute bottom-0 left-0 right-0" : "flex-shrink-0"} glass backdrop-blur-sm border-t rounded-b-xl px-4 p-2 transition-opacity duration-500 ${className}`}>
                <div className="flex justify-between items-center gap-4">
                    {/* Left: Bet Info */}
                    <div className="flex flex-col">
                        <span className="text-xs text-soft/80 uppercase tracking-wider mb-0.5">Bet Amount</span>
                        <span className="text-md md:text-lg font-bold text-light">{betDisplay.primary}</span>
                        {/* <span className="text-xs text-soft/60">{betDisplay.secondary}</span> */}
                    </div>

                    {/* Center: Result */}
                    <div className="flex flex-col items-center justify-center px-4">
                        <span className={`text-md md:text-2xl font-black tracking-wide ${result.isWin ? "text-green-400" : "text-red-400"}`}>{displayResult}</span>
                    </div>

                    {/* Right: Amount */}
                    <div className="flex flex-col items-end">
                        <span className="text-xs text-soft/80 uppercase tracking-wider mb-0.5">{result.isWin ? "Won" : "Lost"}</span>
                        <span className={`text-md md:text-xl font-black ${result.isWin ? "text-green-400" : "text-red-400"}`}>{amountDisplay}</span>
                        {/* {amountSecondary && <span className="text-xs text-soft/60">{amountSecondary}</span>} */}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-background-secondary/80 backdrop-blur-sm border-t border-purple/20 p-3 flex-shrink-0 ${className}`}>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                    <div className="text-soft text-xs mb-1">Bet Amount</div>
                    <div className="text-light font-semibold">{betDisplay.primary}</div>
                    <div className="text-xs text-soft">{betDisplay.secondary}</div>
                </div>
                <div>
                    <div className="text-soft text-xs mb-1">Result</div>
                    <div className={`font-semibold ${result.isWin ? "text-green-400" : "text-red-400"}`}>{displayResult}</div>
                </div>
                <div>
                    <div className="text-soft text-xs mb-1">Amount</div>
                    <div className={`font-bold ${result.isWin ? "text-green-400" : "text-red-400"}`}>{amountDisplay}</div>
                    {/* {amountSecondary && <div className="text-xs text-soft">{amountSecondary}</div>} */}
                </div>
            </div>
        </div>
    );
};

export default GameResultSection;
