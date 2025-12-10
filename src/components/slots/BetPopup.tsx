"use client";

import React, { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { Minus, Plus } from "lucide-react";
import Modal from "@/components/common/Modal";
import { usdToSol, solToUsd } from "@/utils/currency";

interface BetPopupProps {
    isOpen: boolean;
    onClose: () => void;
    betAmount: number;
    setBetAmount: (amount: number) => void;
    onPlaceBet: () => void;
    isPlaying: boolean;
}

const BetPopup: React.FC<BetPopupProps> = ({
    isOpen,
    onClose,
    betAmount,
    setBetAmount,
    onPlaceBet,
    isPlaying,
}) => {
    // betAmount is in SOL, convert to USD for display
    const [tempBetAmount, setTempBetAmount] = useState(solToUsd(betAmount));

    // Update tempBetAmount when betAmount prop changes or popup opens
    useEffect(() => {
        if (isOpen) {
            setTempBetAmount(solToUsd(betAmount));
        }
    }, [isOpen, betAmount]);

    // Popular bet amounts (in USD)
    const popularBets = [0.20, 0.40, 0.60, 0.80, 1.00, 1.20];

    const handleBetChange = (amount: number) => {
        setTempBetAmount(Math.max(0.01, amount));
    };

    const handleConfirmBet = () => {
        // Convert USD to SOL before setting bet amount
        const nextBetSol = usdToSol(tempBetAmount);

        flushSync(() => {
            setBetAmount(nextBetSol);
        });
        onPlaceBet();
        onClose();
    };

    const handleMaxBet = () => {
        // Set to a reasonable max bet (can be adjusted based on user balance)
        setTempBetAmount(10.0);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="BET" size="md">
            <div className="space-y-4 md:space-y-6">
                {/* Popular Bets */}
                <div>
                    <h3 className="text-light font-semibold mb-2 md:mb-3 text-sm md:text-base">Popular Bets</h3>
                    <div className="grid grid-cols-3 md:grid-cols-2 gap-2 md:gap-3">
                        {popularBets.map((amount) => (
                            <button
                                key={amount}
                                onClick={() => handleBetChange(amount)}
                                className={`border rounded-lg py-2 md:py-3 px-2 md:px-4 text-center transition-all duration-200 hover:border-neon-pink/50 ${tempBetAmount === amount
                                    ? "border-neon-pink bg-neon-pink/10"
                                    : "border-soft/10 bg-background/20"
                                    }`}
                            >
                                <span className="text-light font-semibold text-sm md:text-base">$ {amount.toFixed(2)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bet Amount Controls */}
                <div>
                    <h3 className="text-light font-semibold mb-2 md:mb-3 text-sm md:text-base">Bet Amount</h3>

                    {/* Amount Display and Controls */}
                    <div className="flex px-3 md:px-4 py-2 md:py-3 justify-between bg-background/20 rounded-xl border border-soft/10 items-center mb-3 md:mb-4">
                        <button
                            onClick={() => handleBetChange(tempBetAmount - 0.1)}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-neon-pink hover:bg-neon-pink/80 transition-colors flex items-center justify-center disabled:opacity-50"
                            disabled={tempBetAmount <= 0.01}
                        >
                            <Minus className="w-4 h-4 md:w-5 md:h-5 text-light" />
                        </button>

                        <div className="text-center">
                            <div className="text-xl md:text-2xl font-bold text-light">
                                $ {tempBetAmount.toFixed(2)}
                            </div>
                        </div>

                        <button
                            onClick={() => handleBetChange(tempBetAmount + 0.1)}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-neon-pink hover:bg-neon-pink/80 transition-colors flex items-center justify-center"
                        >
                            <Plus className="w-4 h-4 md:w-5 md:h-5 text-light" />
                        </button>
                    </div>
                </div>

                {/* Confirm Button */}
                <button
                    onClick={handleConfirmBet}
                    disabled={isPlaying}
                    className="w-full py-3 md:py-4 rounded-xl bg-neon-pink hover:bg-neon-pink/80 transition-colors text-white font-bold text-sm md:text-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPlaying ? "Spinning..." : "Place Bet & Spin"}
                </button>
            </div>
        </Modal>
    );
};

export default BetPopup;
