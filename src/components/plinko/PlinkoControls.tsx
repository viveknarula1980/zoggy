// components/plinko/PlinkoControls.tsx
"use client";

import React, { useState } from "react";
import { Target } from "lucide-react";
import { formatCurrencyDisplay, solToUsd, usdToSol } from "@/utils/currency";
import ProvablyFairButton from "@/components/common/ProvablyFairButton";
import ProvablyFairModal from "@/components/common/ProvablyFairModal";

interface PlinkoControlsProps {
  betAmount: number;
  setBetAmount: (amount: number) => void;

  riskLevel: string;
  setRiskLevel: (level: string) => void;
  riskIndex: number;
  setRiskIndex: (index: number) => void;

  rows: number;
  setRows: (rows: number) => void;

  balls: number;
  setBalls: (balls: number) => void;

  isPlaying?: boolean;
  totalWin?: number;
  onDropBalls: () => void;

  isWalletReady?: boolean;
  isRequesting?: boolean;

  // Provably Fair Data
  provablyFairData?: any;
}

const PlinkoControls: React.FC<PlinkoControlsProps> = ({
  betAmount,
  setBetAmount,
  riskLevel,
  setRiskLevel,
  riskIndex,
  setRiskIndex,
  rows,
  setRows,
  balls,
  setBalls,
  isPlaying = false,
  totalWin = 0,
  onDropBalls,
  isWalletReady = false,
  isRequesting = false,
  provablyFairData,
}) => {
  const [showProvablyFairModal, setShowProvablyFairModal] = useState(false);
  // ⚠️ Order matches backend DIFF_KEYS exactly
  const riskLevels = ["Easy", "Med", "Hard", "Harder", "Insane", "Extreme"];
  const busy = isPlaying || isRequesting; // <-- freeze while requesting too
  const dropDisabled = !isWalletReady || busy;

  // Convert SOL amounts to USD for display
  const betUsdAmount = solToUsd(betAmount);
  const totalWinUsdAmount = solToUsd(totalWin);
  const betDisplay = formatCurrencyDisplay(betUsdAmount);
  const totalWinDisplay = formatCurrencyDisplay(totalWinUsdAmount);
  const totalBetUsdAmount = solToUsd(betAmount * balls);
  const totalBetDisplay = formatCurrencyDisplay(totalBetUsdAmount);
  const profitUsdAmount = solToUsd(totalWin - betAmount * balls);
  const profitDisplay = formatCurrencyDisplay(profitUsdAmount);

  return (
    <div className="w-full lg:w-72">
      {totalWin > 0 && (
        <div className="glass rounded-xl p-3 border border-purple/20 mb-3 bg-gradient-to-r from-neon-pink/10 to-purple/10">
          <div className="text-center">
            <div className="text-xs text-soft mb-1">Total Winnings</div>
            <div className="text-lg font-bold text-neon-pink">{totalWinDisplay.primary}</div>
            <div className="text-xs text-soft">{totalWinDisplay.secondary}</div>
            <div className="text-xs text-soft mt-1">
              Profit:{" "}
              <span className={totalWin >= betAmount * balls ? "text-green-400" : "text-red-400"}>
                {profitDisplay.primary}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-xl p-4 border border-purple/20 h-full md:h-[600px] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-neon-pink" />
            <h2 className="text-base font-semibold text-light">Plinko</h2>
          </div>
          <ProvablyFairButton
            onClick={() => setShowProvablyFairModal(true)}
            disabled={busy}
          />
        </div>

        {/* Game Control Buttons - Mobile First */}
        <div className="md:hidden space-y-2 flex-shrink-0">
          <button
            onClick={onDropBalls}
            className={`w-full bg-neon-pink text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300 ${
              dropDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={dropDisabled}
          >
            {isPlaying ? "Dropping..." : `Drop ${balls} Ball${balls > 1 ? "s" : ""}`}
          </button>
        </div>

        {/* Bet Amount */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-soft text-sm">Bet Amount</span>
            <div className="text-xs text-soft text-center">{betDisplay.secondary}</div>
          </div>
        <div className="flex bg-background-secondary border border-purple/30 rounded-lg overflow-hidden h-[38px]">
            <div className="flex-1 relative">
              <input
                type="number"
                value={betUsdAmount.toFixed(2)}
                onChange={(e) => setBetAmount(usdToSol(Number(e.target.value)))}
                className="w-full bg-transparent pl-6 pr-3 h-full text-light focus:outline-none"
                min="0.01"
                step="0.01"
                disabled={busy}
              />
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                <span className="text-sm text-soft">$</span>
              </div>
            </div>
            <div className="flex border-l border-purple/30">
              <button
                onClick={() => setBetAmount(betAmount / 2)}
                className="px-3 h-full text-soft hover:bg-purple/20 transition-colors disabled:opacity-50 text-sm"
                disabled={busy}
              >
                /2
              </button>
              <button
                onClick={() => setBetAmount(betAmount * 2)}
                className="px-3 h-full text-soft hover:bg-purple/20 transition-colors disabled:opacity-50 text-sm border-l border-purple/30"
                disabled={busy}
              >
                2x
              </button>
            </div>
          </div>
        </div>

        {/* Risk Level */}
        <div className="space-y-2">
          <span className="text-soft text-sm">Risk Level</span>
          <div className="flex bg-background-secondary border border-purple/30 rounded-lg overflow-hidden h-[38px]">
            <div className="flex items-center px-3 border-r border-purple/30 min-w-[60px]">
              <span className="text-light font-bold text-sm">{riskLevel}</span>
            </div>
            <div className="flex-1 px-3 flex items-center">
              <input
                type="range"
                min="0"
                max="5"
                value={riskIndex}
                onChange={(e) => {
                  const newIndex = Number(e.target.value);
                  setRiskIndex(newIndex);
                  setRiskLevel(riskLevels[newIndex]);
                }}
                className="w-full h-1 bg-background rounded-lg appearance-none cursor-pointer slider"
                disabled={busy}
              />
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-2">
          <span className="text-soft text-sm">Rows</span>
          <div className="flex bg-background-secondary border border-purple/30 rounded-lg overflow-hidden h-[38px]">
            <div className="flex items-center px-3 border-r border-purple/30 min-w-[40px]">
              <span className="text-light font-bold text-sm">{rows}</span>
            </div>
            <div className="flex-1 px-3 flex items-center">
              <input
                type="range"
                min="8"
                max="16"
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full h-1 bg-background rounded-lg appearance-none cursor-pointer slider"
                disabled={busy}
              />
            </div>
          </div>
        </div>

        {/* Balls */}
        <div className="space-y-2">
          <span className="text-soft text sm">Balls</span>
          <div className="flex bg-background-secondary border border-purple/30 rounded-lg overflow-hidden h-[38px]">
            <div className="flex items-center px-3 border-r border-purple/30 min-w-[30px]">
              <span className="text-light font-bold text-sm">{balls}</span>
            </div>
            <div className="flex-1 px-3 flex items-center">
              <input
                type="range"
                min="1"
                max="100"
                value={balls}
                onChange={(e) => setBalls(Number(e.target.value))}
                className="w-full h-1 bg-background rounded-lg appearance-none cursor-pointer slider"
                disabled={busy}
              />
            </div>
          </div>
        </div>

        <div className="flex-1"></div>

        {/* Game Control Buttons - Desktop Only */}
        <div className="hidden md:block">
          <button
            onClick={onDropBalls}
            className="w-full bg-neon-pink text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300 flex-shrink-0"
            disabled={dropDisabled}
            title={!isWalletReady ? "Connect your wallet" : undefined}
          >
            Drop {balls} Ball{balls > 1 ? "s" : ""}
          </button>
        </div>
      </div>

      {/* Provably Fair Modal
          ✅ Pass gameTypeHint="plinko" so Manual Verify opens as Plinko and pre-fills */}
      <ProvablyFairModal
        isOpen={showProvablyFairModal}
        onClose={() => setShowProvablyFairModal(false)}
        data={provablyFairData}
        gameTypeHint="plinko"
      />

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: var(--color-neon-pink);
          cursor: pointer;
          box-shadow: 0 0 6px rgba(255, 77, 143, 0.5);
        }
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: var(--color-neon-pink);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 6px rgba(255, 77, 143, 0.5);
        }
      `}</style>
    </div>
  );
};

export default PlinkoControls;
