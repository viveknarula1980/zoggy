import React, { useEffect, useState } from "react";
import { Dices } from "lucide-react";
import { formatCurrencyDisplay, solToUsd, usdToSol } from "@/utils/currency";
import ProvablyFairButton from "@/components/common/ProvablyFairButton";
import ProvablyFairModal from "@/components/common/ProvablyFairModal";
import SoundToggle from "@/components/common/SoundToggle";

interface DiceControlsProps {
  betAmount: number;
  setBetAmount: (amount: number) => void;

  targetNumber: number;
  setTargetNumber: (number: number) => void;
  betType: "under" | "over";
  setBetType: (type: "under" | "over") => void;

  isPlaying: boolean;
  onRollDice: () => void;
  calculateWinProbability: () => number;
  calculatePayout: () => string;
  isButtonDisabled: boolean;
  provablyFairData?: any;
  soundsEnabled?: boolean;
  onToggleSounds?: () => void;

  // ✅ New prop
  isBanned?: boolean;
}

const DiceControls: React.FC<DiceControlsProps> = ({
  betAmount,
  setBetAmount,
  targetNumber,
  setTargetNumber,
  betType,
  setBetType,
  isPlaying,
  onRollDice,
  calculateWinProbability,
  calculatePayout,
  isButtonDisabled,
  provablyFairData,
  soundsEnabled = true,
  onToggleSounds,
  isBanned = false, // default false
}) => {
  const betUsdAmount = solToUsd(betAmount);
  const betDisplay = formatCurrencyDisplay(betUsdAmount);
  const [showProvablyFairModal, setShowProvablyFairModal] = useState(false);
  const [betAmountInput, setBetAmountInput] = useState(betUsdAmount.toFixed(2));
  const [targetNumberInput, setTargetNumberInput] = useState(targetNumber.toString());

  const calculateMultiplier = () => {
    const winChance = calculateWinProbability();
    return winChance > 0 ? (99 / winChance).toFixed(4) : "1.0000";
  };

  const handleTargetNumberChange = (value: string) => {
    setTargetNumberInput(value);
    const num = parseInt(value);
    
    if (!isNaN(num) && num >= 1 && num <= 99) {
      setTargetNumber(num);
    }
  };

  const handleTargetNumberBlur = () => {
    const num = parseInt(targetNumberInput);
    if (isNaN(num) || num < 2 || num > 98) {
      setTargetNumberInput(targetNumber.toString());
    } else {
      setTargetNumberInput(num.toString());
    }
  };

  useEffect(() => {
    setTargetNumberInput(targetNumber.toString());
  }, [targetNumber]);

  useEffect(() => {
    setBetAmountInput(betUsdAmount.toFixed(2));
  }, [betUsdAmount]);

  const handleBetAmountChange = (value: string) => {
    setBetAmountInput(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0.01) {
      setBetAmount(usdToSol(num));
    }
  };

  const handleBetAmountBlur = () => {
    const num = parseFloat(betAmountInput);
    if (isNaN(num) || num < 0.01) {
      setBetAmountInput(betUsdAmount.toFixed(2));
    } else {
      setBetAmountInput(num.toFixed(2));
    }
  };

  const multiplier = calculateMultiplier();
  const winChance = calculateWinProbability();

  return (
    <div className="w-full lg:w-72">
      <div className="glass rounded-xl p-4 border border-purple/20 h-full md:h-[600px] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-neon-pink" />
            <h2 className="text-base font-semibold text-light">Dice</h2>
          </div>
          <div className="flex items-center gap-2">
            {onToggleSounds && (
              <SoundToggle
                soundsEnabled={soundsEnabled}
                onToggle={onToggleSounds}
                disabled={isPlaying}
              />
            )}
            <ProvablyFairButton
              onClick={() => setShowProvablyFairModal(true)}
              disabled={isPlaying}
            />
          </div>
        </div>

        {/* 🚫 Banned Message */}
        {isBanned && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-center text-sm rounded-lg py-2">
            🚫 You are banned from playing Dice.
          </div>
        )}

        {/* Bet Amount */}
        <div className="space-y-3">
          <span className="text-soft text-sm">Bet Amount</span>
          <div className="flex bg-background-secondary border border-purple/30 rounded-lg overflow-hidden h-[38px]">
            <div className="flex-1 relative">
              <input
                type="number"
                value={betAmountInput}
                onChange={(e) => handleBetAmountChange(e.target.value)}
                onBlur={handleBetAmountBlur}
                className="w-full bg-transparent pl-6 pr-3 h-full text-light focus:outline-none"
                min="0.01"
                step="0.01"
                disabled={isPlaying || isBanned}
              />
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                <span className="text-sm text-soft">$</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mode */}
        <div className="space-y-3">
          <span className="text-soft text-sm">Mode: Roll {betType === "under" ? "Under" : "Over"}</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`h-[38px] px-3 rounded-lg border text-sm font-medium transition-all ${
                betType === "under"
                  ? "bg-neon-pink text-light shadow-glow"
                  : "bg-background-secondary border-purple/30 text-soft hover:border-purple/50"
              }`}
              onClick={() => setBetType("under")}
              disabled={isPlaying || isBanned}
            >
              Roll Under
            </button>
            <button
              className={`h-[38px] px-3 rounded-lg border text-sm font-medium transition-all ${
                betType === "over"
                  ? "bg-neon-pink text-light shadow-glow"
                  : "bg-background-secondary border-purple/30 text-soft hover:border-purple/50"
              }`}
              onClick={() => setBetType("over")}
              disabled={isPlaying || isBanned}
            >
              Roll Over
            </button>
          </div>
        </div>

        {/* Target Number */}
        <div className="space-y-2">
          <span className="text-soft text-sm">Target Number</span>
          <input
            type="number"
            value={targetNumberInput}
            onChange={(e) => handleTargetNumberChange(e.target.value)}
            onBlur={handleTargetNumberBlur}
            className="w-full bg-background-secondary border border-purple/30 rounded-lg px-3 h-[38px] text-light text-center font-bold focus:border-neon-pink focus:outline-none"
            min="1"
            max="100"
            step="1"
            disabled={isPlaying || isBanned}
          />
        </div>

        {/* Multiplier + Win Chance */}
        <div className="space-y-2">
          <span className="text-soft text-sm">Multiplier</span>
          <div className="flex bg-background-secondary border border-purple/30 rounded-lg h-[38px] items-center px-3">
            <span className="text-light font-bold">{multiplier}</span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-soft text-sm">Win Chance</span>
          <div className="flex bg-background-secondary border border-purple/30 rounded-lg h-[38px] items-center px-3">
            <span className="text-light font-bold">{winChance.toFixed(4)}%</span>
          </div>
        </div>

        {/* Roll Button */}
        <div>
          <button
            onClick={onRollDice}
            className="w-full bg-neon-pink text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow disabled:opacity-50"
            disabled={isButtonDisabled || isPlaying || targetNumber < 1 || targetNumber > 99 || isBanned}
          >
            {isPlaying ? "Rolling..." : "Roll Dice"}
          </button>
        </div>
      </div>

      <ProvablyFairModal
        isOpen={showProvablyFairModal}
        onClose={() => setShowProvablyFairModal(false)}
        data={provablyFairData}
      />
    </div>
  );
};

export default DiceControls;
