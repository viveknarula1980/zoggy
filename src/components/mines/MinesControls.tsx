
import React from "react";
import { formatCurrencyDisplay, solToUsd, usdToSol } from "@/utils/currency";
import { Gem, Bomb } from "lucide-react";
import ProvablyFairButton from "@/components/common/ProvablyFairButton";
import ProvablyFairModal, { type MinesProvablyFairData } from "@/components/common/ProvablyFairModal";
import SoundToggle from "@/components/common/SoundToggle";

interface MinesControlsProps {
  // Bet Controls
  betAmount: number;                 // in SOL
  setBetAmount: (amount: number) => void;

  // Grid Size Controls
  gridSize: string;
  setGridSize: (size: string) => void;

  // Mines Count Controls
  minesCount: number;
  setMinesCount: (count: number) => void;
  maxMines: number;
  getMaxMines: (size: string) => number;

  // Game State
  isPlaying: boolean;
  playClicked: boolean;

  onStartGame: () => void;
  onCashOut: () => void;

  // Provably Fair (controlled)
  provablyFairData: MinesProvablyFairData | null;
  proofOpen: boolean;
  setProofOpen: (open: boolean) => void;

  // Sound controls
  soundsEnabled?: boolean;
  onToggleSounds?: () => void;

  /** Multiplier for current board state (should come from backend) */
  multiplier: number;

  /** Number of safe picks already made (from backend) */
  picks: number;

  /**
   * Server-reported current win amount in SOL (authoritative).
   * Send this from backend after each successful reveal / quote update.
   * If provided, UI uses this instead of local bet * multiplier math.
   */
  currentWinSol?: number | null;

  // 🚫 Ban flag from parent — when true, disable all actions
  isBanned?: boolean;
}

const MinesControls: React.FC<MinesControlsProps> = ({
  betAmount,
  setBetAmount,
  gridSize,
  setGridSize,
  minesCount,
  setMinesCount,
  maxMines,
  getMaxMines,
  isPlaying,
  playClicked,
  onStartGame,
  onCashOut,
  provablyFairData,
  proofOpen,
  setProofOpen,
  soundsEnabled = true,
  onToggleSounds,
  multiplier,
  picks,
  currentWinSol = null,
  isBanned = false,
}) => {
  // Bet input is shown in USD, stored internally as SOL
  const betUsdAmount = solToUsd(betAmount);
  const betDisplay = formatCurrencyDisplay(betUsdAmount);

  const gridSizes = ["5x5", "6x6", "7x7", "8x8"];
  const gridSizeLabels = ["25", "36", "49", "64"];

  const handleGridSizeChange = (size: string) => {
    setGridSize(size);
    const newMaxMines = getMaxMines(size);
    if (minesCount > newMaxMines) setMinesCount(1);
  };

  const isPlayDisabled = isPlaying || playClicked || isBanned;

  // ✅ Authoritative current win (SOL) from backend, fallback to harmless calc only if not provided
  const effectiveWinSol =
    typeof currentWinSol === "number" && currentWinSol >= 0
      ? currentWinSol
      : isPlaying
      ? betAmount * multiplier
      : 0;

  const winUsdAmount = solToUsd(effectiveWinSol);
  const winDisplay = formatCurrencyDisplay(winUsdAmount);

  return (
    <div className="w-full lg:w-72">
      <div className="glass rounded-xl p-4 border border-purple/20 h-full md:h-[600px] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bomb className="w-5 h-5 text-neon-pink" />
            <h2 className="text-base font-semibold text-light">Mines</h2>
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
              onClick={() => setProofOpen(true)}
              disabled={isPlaying || isBanned}
            />
          </div>
        </div>

        {/* Current Win Amount (from backend) */}
        {isPlaying && (
          <div className="bg-background-secondary/50 border border-purple/20 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-soft text-sm">Current Win</span>
              <span className="text-sm font-medium text-light">
                {Number.isFinite(multiplier) ? multiplier.toFixed(2) : "—"}x
              </span>
            </div>
            <div className="text-xl font-bold text-[#00FF20]">
              {winDisplay.primary /* e.g., $12.34 */}
            </div>
            <div className="text-xs text-soft">{winDisplay.secondary /* e.g., 0.1234 SOL */}</div>
          </div>
        )}

        {/* Game Control Buttons - Mobile First */}
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
              className={`w-full bg-neon-pink text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300 ${
                isPlayDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isPlayDisabled}
            >
              Start Game
            </button>
          )}
        </div>

        {/* Bet Amount */}
        <div className="space-y-2">
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
                disabled={isPlaying || isBanned}
              />
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                <span className="text-sm text-soft">$</span>
              </div>
            </div>
            <div className="flex border-l border-purple/30">
              <button
                onClick={() => setBetAmount(Math.max(betAmount / 2, 0))}
                className="px-3 h-full text-soft hover:bg-purple/20 transition-colors disabled:opacity-50 text-sm"
                disabled={isPlaying || isBanned}
              >
                /2
              </button>
              <button
                onClick={() => setBetAmount(betAmount * 2)}
                className="px-3 h-full text-soft hover:bg-purple/20 transition-colors disabled:opacity-50 text-sm border-l border-purple/30"
                disabled={isPlaying || isBanned}
              >
                2x
              </button>
            </div>
          </div>
        </div>

        {/* Grid Size */}
        <div className="space-y-2">
          <span className="text-soft text-sm">Grid Size</span>
          <div className="grid grid-cols-4 h-[38px] rounded-lg border border-purple/30">
            {gridSizes.map((size, index) => (
              <button
                key={size}
                onClick={() => handleGridSizeChange(size)}
                className={`py-1 px-3 ${index === 0 ? "rounded-l-lg" : ""} ${
                  index === 3 ? "rounded-r-lg" : ""
                } text-xs font-medium transition-all ${
                  gridSize === size
                    ? "bg-neon-pink text-light shadow-glow"
                    : "bg-background-secondary text-soft hover:bg-soft/30"
                }`}
                disabled={isPlaying || isBanned}
              >
                {gridSizeLabels[index]}
              </button>
            ))}
          </div>
        </div>

        {/* Mines Count */}
        <div className="space-y-2">
          <span className="text-soft text-sm">Gems / Mines</span>
          <div className="flex bg-background-secondary border border-purple/30 rounded-lg overflow-hidden h-[38px]">
            <div className="flex justify-center items-center gap-2 px-3 border-r border-purple/30 min-w-[50px]">
              <Gem className="w-5 h-5 text-blue-400" />
              <span className="text-light font-bold text-sm">{maxMines - minesCount + 1}</span>
            </div>
            <div className="flex-1 px-1 flex items-center">
              <input
                type="range"
                min="1"
                max={maxMines}
                value={minesCount}
                onChange={(e) => setMinesCount(Number(e.target.value))}
                className="w-full h-1 bg-background rounded-lg appearance-none cursor-pointer slider"
                disabled={isPlaying || isBanned}
              />
            </div>
            <div className="flex justify-center items-center gap-2 px-3 border-l border-purple/30 min-w-[50px]">
              <Bomb className="w-5 h-5 text-red-400" />
            </div>
          </div>
        </div>

        <div className="flex-1"></div>

        {/* Game Control Buttons - Desktop Only */}
        <div className="hidden md:block">
          {isPlaying ? (
            <button
              onClick={onCashOut}
              className="w-full bg-purple text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow transition-all duration-300 flex-shrink-0"
              disabled={isBanned}
            >
              Cash Out
            </button>
          ) : (
            <button
              onClick={onStartGame}
              className={`w-full px-4 py-3 rounded-xl font-bold text-base transition-all duration-300 flex-shrink-0 ${
                isPlayDisabled
                  ? "bg-purple/50 text-light cursor-not-allowed"
                  : "bg-neon-pink text-light hover:shadow-glow"
              }`}
              disabled={isPlayDisabled}
            >
              Start Game
            </button>
          )}
        </div>
      </div>

      {/* Provably Fair Modal (controlled; opens when user taps button) */}
      <ProvablyFairModal
        isOpen={proofOpen}
        onClose={() => setProofOpen(false)}
        data={provablyFairData}
        gameTypeHint="mines"
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

export default MinesControls;
