// components/slots/SlotsControls.tsx
// (unchanged UI; just already supports ProvablyFairModal via provablyFairData prop)
"use client";

import React, { useState } from "react";
import { Cherry } from "lucide-react";
import { formatCurrencyDisplay, solToUsd, usdToSol } from "@/utils/currency";
import ProvablyFairButton from "@/components/common/ProvablyFairButton";
import ProvablyFairModal from "@/components/common/ProvablyFairModal";
import SoundToggle from "@/components/common/SoundToggle";

interface SlotsControlsProps {
  betAmount: number;
  setBetAmount: (amount: number) => void;
  autoSpinCount: number;
  setAutoSpinCount: (count: number) => void;
  isPlaying: boolean;
  onSpin: () => void;
  onAutoSpin: () => void;
  autoSpin?: boolean;
  onStopAutoSpin?: () => void;
  disableButtons?: boolean;
  provablyFairData?: any;
  // Sound controls
  soundsEnabled?: boolean;
  onToggleSounds?: () => void;
}

const SlotsControls: React.FC<SlotsControlsProps> = ({
  betAmount,
  setBetAmount,
  autoSpinCount,
  setAutoSpinCount,
  isPlaying,
  onSpin,
  onAutoSpin,
  autoSpin,
  onStopAutoSpin,
  disableButtons = false,
  provablyFairData,
  soundsEnabled = true,
  onToggleSounds,
}) => {
  const [showProvablyFairModal, setShowProvablyFairModal] = useState(false);

  const betUsdAmount = solToUsd(betAmount);
  const betDisplay = formatCurrencyDisplay(betUsdAmount);
  const isDisabled = isPlaying || disableButtons;

  return (
    <div className="w-full lg:w-72">
      <div className="glass rounded-xl p-4 border border-purple/20 h-full md:h-[600px] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cherry className="w-5 h-5 text-neon-pink" />
            <h2 className="text-base font-semibold text-light">Slots</h2>
          </div>
          <div className="flex items-center gap-2">
            {onToggleSounds && (
              <SoundToggle
                soundsEnabled={soundsEnabled}
                onToggle={onToggleSounds}
                disabled={isDisabled}
              />
            )}
            <ProvablyFairButton onClick={() => setShowProvablyFairModal(true)} disabled={isDisabled} />
          </div>
        </div>

        {/* Game Control Buttons - Mobile First */}
        <div className="md:hidden space-y-2 flex-shrink-0">
          <button
            onClick={onSpin}
            className="w-full bg-neon-pink text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300 disabled:opacity-50"
            disabled={isDisabled}
          >
            {isPlaying && !autoSpin ? "Spinning..." : "Spin"}
          </button>

          {autoSpin && isPlaying ? (
            <button
              onClick={onStopAutoSpin}
              className="w-full bg-purple text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300"
            >
              Stop Auto Spin
            </button>
          ) : (
            <button
              onClick={onAutoSpin}
              className="w-full bg-purple text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300 disabled:opacity-50"
              disabled={isDisabled}
            >
              Auto Spin ({autoSpinCount})
            </button>
          )}
        </div>

        {/* Bet Amount */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-soft text-sm">Bet Amount</span>
            <div className="text-xs text-soft text-center">{betDisplay.secondary}</div>
          </div>
          <div className="relative">
            <input
              type="number"
              value={betUsdAmount.toFixed(2)}
              onChange={(e) => setBetAmount(usdToSol(Number(e.target.value)))}
              className="w-full bg-background-secondary border border-purple/30 rounded-lg px-3 py-2 pr-10 text-light focus:border-neon-pink focus:outline-none"
              min="0.01"
              step="0.01"
              disabled={isDisabled}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="text-xs text-soft">$</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setBetAmount(betAmount / 2)}
              className="flex-1 bg-background-secondary border border-purple/30 rounded-lg px-3 py-2 text-soft hover:border-purple/50 transition-colors disabled:opacity-50"
              disabled={isDisabled}
            >
              ÷2
            </button>
            <button
              onClick={() => setBetAmount(betAmount * 2)}
              className="flex-1 bg-background-secondary border border-purple/30 rounded-lg px-3 py-2 text-soft hover:border-purple/50 transition-colors disabled:opacity-50"
              disabled={isDisabled}
            >
              ×2
            </button>
          </div>
        </div>

        {/* Auto Spin Count */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-soft text-sm">Auto Spin Count</span>
            <span className="text-light font-bold">{autoSpinCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoSpinCount(Math.max(5, autoSpinCount - 5))}
              className="w-8 h-8 bg-background-secondary border border-purple/30 rounded text-soft hover:border-purple/50 transition-colors disabled:opacity-50"
              disabled={isDisabled}
            >
              -
            </button>
            <div className="flex-1 px-2">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={autoSpinCount}
                onChange={(e) => setAutoSpinCount(Number(e.target.value))}
                className="w-full h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer slider"
                disabled={isDisabled}
              />
            </div>
            <button
              onClick={() => setAutoSpinCount(Math.min(100, autoSpinCount + 5))}
              className="w-8 h-8 bg-background-secondary border border-purple/30 rounded text-soft hover:border-purple/50 transition-colors disabled:opacity-50"
              disabled={isDisabled}
            >
              +
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAutoSpinCount(10)}
              className="flex-1 bg-background-secondary border border-purple/30 rounded-lg px-3 py-2 text-soft hover:border-purple/50 transition-colors text-sm disabled:opacity-50"
              disabled={isDisabled}
            >
              10
            </button>
            <button
              onClick={() => setAutoSpinCount(25)}
              className="flex-1 bg-background-secondary border border-purple/30 rounded-lg px-3 py-2 text-soft hover:border-purple/50 transition-colors text-sm disabled:opacity-50"
              disabled={isDisabled}
            >
              25
            </button>
            <button
              onClick={() => setAutoSpinCount(50)}
              className="flex-1 bg-background-secondary border border-purple/30 rounded-lg px-3 py-2 text-soft hover:border-purple/50 transition-colors text-sm disabled:opacity-50"
              disabled={isDisabled}
            >
              50
            </button>
          </div>
        </div>

        <div className="flex-1"></div>

        {/* Game Control Buttons - Desktop Only */}
        <div className="hidden md:block space-y-2 flex-shrink-0">
          <button
            onClick={onSpin}
            className="w-full bg-neon-pink text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300 disabled:opacity-50"
            disabled={isDisabled}
          >
            {isPlaying && !autoSpin ? "Spinning..." : "Spin"}
          </button>

          {autoSpin && isPlaying ? (
            <button
              onClick={onStopAutoSpin}
              className="w-full bg-purple text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300"
            >
              Stop Auto Spin
            </button>
          ) : (
            <button
              onClick={onAutoSpin}
              className="w-full bg-purple text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300 disabled:opacity-50"
              disabled={isDisabled}
            >
              Auto Spin ({autoSpinCount})
            </button>
          )}
        </div>
      </div>

      {/* Provably Fair Modal */}
      <ProvablyFairModal
        isOpen={showProvablyFairModal}
        onClose={() => setShowProvablyFairModal(false)}
        data={provablyFairData}
      />

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

export default SlotsControls;
