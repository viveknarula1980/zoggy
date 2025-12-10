// components/crash/CrashControls.tsx
"use client";

import React, { useState } from "react";
import { Rocket } from "lucide-react";
import { solToUsd, usdToSol } from "@/utils/currency";
import ProvablyFairButton from "@/components/common/ProvablyFairButton";
import ProvablyFairModal from "@/components/common/ProvablyFairModal";
import SoundToggle from "@/components/common/SoundToggle";

interface CrashControlsProps {
  betAmount: number;
  setBetAmount: (amount: number) => void;

  multiplier: number;
  setMultiplier: (multiplier: number) => void;

  autoMode: boolean;
  setAutoMode: (autoMode: boolean) => void;

  isPlaying: boolean;
  onStartGame: () => void;
  onCashOut: () => void;
  onStopAuto: () => void;
  currentMultiplier?: number;

  // Provably Fair Data
  provablyFairData?: any;

  // Sound controls
  soundsEnabled?: boolean;
  onToggleSounds?: () => void;
}

const CrashControls: React.FC<CrashControlsProps> = ({
  betAmount,
  setBetAmount,
  multiplier,
  setMultiplier,
  autoMode,
  setAutoMode,
  isPlaying,
  onStartGame,
  onCashOut,
  onStopAuto,
  currentMultiplier,
  provablyFairData,
  soundsEnabled = true,
  onToggleSounds,
}) => {
  const [showProvablyFairModal, setShowProvablyFairModal] = useState(false);
  const betUsdAmount = solToUsd(betAmount);
  const cashoutLabel = currentMultiplier
    ? `Cash Out (${currentMultiplier.toFixed(2)}x)`
    : `Cash Out (${multiplier}x)`;

  return (
    <div className="w-full lg:w-72">
      <div className="glass rounded-xl p-4 border border-purple/20 h-full md:h-[600px] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-neon-pink" />
            <h2 className="text-base font-semibold text-light">Crash</h2>
          </div>
          <div className="flex items-center gap-2">
            {onToggleSounds && (
              <SoundToggle
                soundsEnabled={soundsEnabled}
                onToggle={onToggleSounds}
                disabled={isPlaying}
              />
            )}
            <ProvablyFairButton onClick={() => setShowProvablyFairModal(true)} disabled={isPlaying} />
          </div>
        </div>

        {/* Game Control Buttons - Mobile First */}
        <div className="md:hidden space-y-2 flex-shrink-0">
          {isPlaying ? (
            autoMode ? (
              <button
                onClick={onStopAuto}
                className="w-full bg-red-500 text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300"
              >
                Stop Auto
              </button>
            ) : (
              <button
                onClick={onCashOut}
                className="w-full bg-purple text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300"
              >
                {cashoutLabel}
              </button>
            )
          ) : (
            <button
              onClick={onStartGame}
              className="w-full bg-neon-pink text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300"
            >
              {autoMode ? "Start Auto" : "Bet"}
            </button>
          )}
        </div>

        {/* Bet */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-soft text-sm">Bet Amount</span>
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
                disabled={isPlaying && autoMode}
              />
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                <span className="text-sm text-soft">$</span>
              </div>
            </div>
            <div className="flex border-l border-purple/30">
              <button
                onClick={() => setBetAmount(betAmount / 2)}
                className="px-3 h-full text-soft hover:bg-purple/20 transition-colors disabled:opacity-50 text-sm"
                disabled={isPlaying && autoMode}
              >
                /2
              </button>
              <button
                onClick={() => setBetAmount(betAmount * 2)}
                className="px-3 h-full text-soft hover:bg-purple/20 transition-colors disabled:opacity-50 text-sm border-l border-purple/30"
                disabled={isPlaying && autoMode}
              >
                2x
              </button>
            </div>
          </div>
        </div>

        {/* Auto mode */}
        <div className="flex bg-background-secondary border border-purple/30 rounded-lg overflow-hidden h-[38px]">
          <div className="flex-1 relative">
            <input
              type="number"
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full bg-transparent pl-6 pr-3 h-full text-light focus:outline-none disabled:opacity-50"
              min="1.01"
              step="0.01"
              disabled={!autoMode || (isPlaying && autoMode)}
              placeholder="100"
            />
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
              <span className="text-sm text-soft">×</span>
            </div>
          </div>
          <div className="flex items-center px-3 border-l border-purple/30">
            <span className="text-soft text-sm mr-2">Auto</span>
            <button
              onClick={() => setAutoMode(!autoMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                autoMode ? "bg-neon-pink" : "bg-background border border-purple/30"
              }`}
              disabled={isPlaying}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  autoMode ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex-1" />

        {/* Game Control Buttons - Desktop Only */}
        <div className="hidden md:flex flex-col space-y-2">
          {!isPlaying ? (
            <button
              className="w-full bg-neon-pink hover:bg-neon-pink/80 text-light px-4 py-3 rounded-xl font-bold text-base"
              onClick={onStartGame}
            >
              {autoMode ? "Start Auto Betting" : "Place Bet"}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                className="w-full bg-purple hover:bg-purple/80 text-light px-4 py-3 rounded-xl font-bold text-base"
                onClick={onCashOut}
              >
                {cashoutLabel}
              </button>
              {autoMode && (
                <button
                  onClick={onStopAuto}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300"
                >
                  Stop Auto Betting
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Provably Fair Modal
          ✅ We pass gameTypeHint="crash" so the Manual Verify link
          opens the fairness page with the correct game and prefilled fields. */}
      <ProvablyFairModal
        isOpen={showProvablyFairModal}
        onClose={() => setShowProvablyFairModal(false)}
        data={provablyFairData}
        gameTypeHint="crash"
      />
    </div>
  );
};

export default CrashControls;
