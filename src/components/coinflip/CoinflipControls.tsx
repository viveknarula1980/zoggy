"use client";

import React, { useState } from "react";
import { Coins } from "lucide-react";
import { solToUsd, usdToSol } from "@/utils/currency";
import ProvablyFairButton from "@/components/common/ProvablyFairButton";
import ProvablyFairModal from "@/components/common/ProvablyFairModal";
import SoundToggle from "@/components/common/SoundToggle";

interface CoinflipControlsProps {
  // Bet Controls
  betAmount: number;
  setBetAmount: (amount: number) => void;

  // Side Selection
  pickedSide: string;
  setPickedSide: (side: string) => void;

  // Game State
  isPlaying: boolean;
  onStartGame: () => void;
  onCashOut: () => void;

  // Play with Bot Toggle
  playWithBot: boolean;
  setPlayWithBot: (enabled: boolean) => void;

  // Coin Controls (legacy / unused in 1-coin mode)
  setNumberOfCoins: (count: number) => void;
  minimumToWin: number;
  setMinimumToWin: (count: number) => void;

  // ✅ New: disable start button externally
  startButtonDisabled?: boolean;

  // Provably Fair Data
  provablyFairData?: any;

  // Sound Controls
  soundsEnabled?: boolean;
  onToggleSounds?: () => void;

  // 🚫 Ban flag (no UI change – just disables controls)
  isBanned?: boolean;
}

const CoinflipControls: React.FC<CoinflipControlsProps> = ({
  betAmount,
  setBetAmount,
  pickedSide,
  setPickedSide,
  isPlaying,
  onStartGame,
  onCashOut,
  playWithBot,
  setPlayWithBot,
  // avoid TS noUnusedLocals errors in strict repos
  setNumberOfCoins: _setNumberOfCoins,
  minimumToWin: _minimumToWin,
  setMinimumToWin: _setMinimumToWin,
  startButtonDisabled = false,
  provablyFairData,
  soundsEnabled = true,
  onToggleSounds,
  isBanned = false,
}) => {
  const [showProvablyFairModal, setShowProvablyFairModal] = useState(false);

  // Convert SOL amount to USD for display
  const betUsdAmount = solToUsd(betAmount);

  const effectiveDisabled = startButtonDisabled || isBanned;

  return (
    <div className="w-full lg:w-72">
      {/* All Controls in Single Container */}
      <div className="glass rounded-xl p-4 border border-purple/20 h-full md:h-[600px] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-neon-pink" />
            <h2 className="text-base font-semibold text-light">Coinflip</h2>
          </div>
          <div className="flex items-center gap-2">
            {onToggleSounds && (
              <SoundToggle
                soundsEnabled={soundsEnabled}
                onToggle={onToggleSounds}
                disabled={isPlaying || isBanned}
              />
            )}
            <ProvablyFairButton
              onClick={() => setShowProvablyFairModal(true)}
              disabled={isPlaying || isBanned}
            />
          </div>
        </div>

        {/* Game Control Buttons */}
        <div className="md:hidden space-y-2 flex-shrink-0">
          {isPlaying ? (
            <button
              onClick={onCashOut}
              className="w-full bg-purple text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300"
              disabled={isBanned}
            >
              Cash Out
            </button>
          ) : (
            <button
              onClick={onStartGame}
              className={`w-full bg-neon-pink text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300 disabled:opacity-50 ${
                effectiveDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={effectiveDisabled}
            >
              Flip Coin
            </button>
          )}
        </div>

        {/* Bet Amount */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-soft text-sm">Bet Amount</span>
          </div>
          <div className="flex bg-background-secondary border border-purple/30 rounded-lg overflow-hidden">
            <div className="flex-1 relative">
              <input
                type="number"
                value={betUsdAmount.toFixed(2)}
                onChange={(e) => setBetAmount(usdToSol(Number(e.target.value)))}
                className="w-full bg-transparent pl-6 pr-3 py-2 text-light focus:outline-none"
                min="0.01"
                step="0.01"
                disabled={isPlaying || isBanned}
              />
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                <span className="text-sm text-soft">$</span>
              </div>
            </div>
            <div className="flex border-l border-purple/30">
              <button
                onClick={() => setBetAmount(betAmount / 2)}
                className="px-3 py-2 text-soft hover:bg-purple/20 transition-colors disabled:opacity-50 text-sm"
                disabled={isPlaying || isBanned}
              >
                /2
              </button>
              <button
                onClick={() => setBetAmount(betAmount * 2)}
                className="px-3 py-2 text-soft hover:bg-purple/20 transition-colors disabled:opacity-50 text-sm border-l border-purple/30"
                disabled={isPlaying || isBanned}
              >
                2x
              </button>
            </div>
          </div>
        </div>

        {/* Side Selection */}
        <div className="space-y-3">
          <span className="text-soft text-sm">Pick Side</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPickedSide("heads")}
              className={`py-2 px-3 rounded-lg font-medium transition-all flex flex-col items-center gap-1 text-sm ${
                pickedSide === "heads"
                  ? "bg-neon-pink text-light shadow-glow"
                  : "bg-background-secondary border border-purple/30 text-soft hover:border-purple/50"
              }`}
              disabled={isPlaying || isBanned}
            >
              <img
                src="/assets/coinflip/Characters-symbols/coin.png"
                alt="Coin"
                className="w-6 h-6 object-contain"
              />
              <span>Heads</span>
            </button>
            <button
              onClick={() => setPickedSide("tails")}
              className={`py-2 px-3 rounded-lg font-medium transition-all flex flex-col items-center gap-1 text-sm ${
                pickedSide === "tails"
                  ? "bg-neon-pink text-light shadow-glow"
                  : "bg-background-secondary border border-purple/30 text-soft hover:border-purple/50"
              }`}
              disabled={isPlaying || isBanned}
            >
              <img
                src="/assets/coinflip/Characters-symbols/diamond.png"
                alt="Diamond"
                className="w-6 h-6 object-contain"
              />
              <span>Tails</span>
            </button>
          </div>
        </div>

        {/* Play with Bot Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-soft text-sm">Play with Bot</span>
            <button
              onClick={() => setPlayWithBot(!playWithBot)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                playWithBot ? "bg-neon-pink" : "bg-background-secondary border border-purple/30"
              }`}
              disabled={isPlaying || isBanned}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  playWithBot ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Game Control Buttons */}
        <div className="hidden md:block space-y-2 flex-shrink-0">
          {isPlaying ? (
            <button
              onClick={onCashOut}
              className="w-full bg-purple text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300"
              disabled={isBanned}
            >
              Cash Out
            </button>
          ) : (
            <button
              onClick={onStartGame}
              className={`w-full bg-neon-pink text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300 disabled:opacity-50 ${
                effectiveDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={effectiveDisabled}
            >
              Flip Coin
            </button>
          )}
        </div>
      </div>

      {/* Provably Fair Modal */}
      <ProvablyFairModal
        isOpen={showProvablyFairModal}
        onClose={() => setShowProvablyFairModal(false)}
        data={provablyFairData}
        gameTypeHint="coinflip"
      />

      {/* Slider Styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: var(--color-neon-pink);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(255, 77, 143, 0.5);
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: var(--color-neon-pink);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(255, 77, 143, 0.5);
        }
      `}</style>
    </div>
  );
};

export default CoinflipControls;
