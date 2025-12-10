import React, { useState, useEffect, useRef } from "react";
import SpineDiceAnimation, { SpineDiceAnimationHandle } from "./SpineDiceAnimation";
import Loader from "../common/Loader";
import GameResultSection, { GameResult } from "../common/GameResultSection";
import { formatCurrencyDisplay, solToUsd } from "@/utils/currency";

interface DiceGameAreaProps {
  betAmount: number;
  targetNumber: number;
  betType: "under" | "over";
  lastRoll: number | null;
  isPlaying: boolean;
  isWin: boolean;
  calculateWinProbability: () => number;
  winAmount: number;
  onClearResults?: () => void;
  // Sound controls
  soundsEnabled?: boolean;
  playSound?: (soundKey: string) => void;
}

const DiceGameArea: React.FC<DiceGameAreaProps> = ({
  betAmount,
  targetNumber,
  betType,
  lastRoll,
  isPlaying,
  isWin,
  calculateWinProbability,
  winAmount,
  onClearResults,
  soundsEnabled = true,
  playSound
}) => {
  const [spineLoaded, setSpineLoaded] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const spineAnimationRef = useRef<SpineDiceAnimationHandle>(null);

  // Use playSound function passed from parent

  // Prepare result data for common component
  const result: GameResult | null = lastRoll !== null ? {
    betAmount,
    isWin,
    winAmount: isWin ? winAmount : 0,
    resultText: `Rolled ${lastRoll}`
  } : null;

  // Handle dice rolling animation
  useEffect(() => {
    if (!spineAnimationRef.current) return;

    if (isPlaying) {
      // Start continuous rolling animation when game starts
      // Play flip sound when rolling starts
      playSound?.('flip');
      spineAnimationRef.current?.startRolling(targetNumber);
    } else if (lastRoll !== null) {
      // Hide results initially when new result comes in
      setShowResults(false);
      // Show result animation when game ends
      spineAnimationRef.current.rollDice(targetNumber, lastRoll, betType, () => {
        console.log("Dice animation completed");
        // Show results only after animation completes
        setShowResults(true);
        
        // Play win sound if player won
        if (isWin) {
          // Randomly choose between win1 and win2
          const winSound = Math.random() > 0.5 ? 'win1' : 'win2';
          playSound?.(winSound);
        }
      });
    }
  }, [isPlaying, lastRoll, targetNumber]);

  // Update progress bar when target or bet type changes
  useEffect(() => {
    if (spineAnimationRef.current) {
      // Move coin to target number position when target changes, or to lastRoll if available
      const coinPosition = lastRoll ?? targetNumber;
      spineAnimationRef.current.updateProgressBar(targetNumber, betType, coinPosition);
    }
  }, [targetNumber, betType, lastRoll]);

  // Reset animation when game resets
  useEffect(() => {
    if (!isPlaying && lastRoll === null && spineAnimationRef.current) {
      // Hide results when game resets
      setShowResults(false);
      spineAnimationRef.current.resetDice();
      // Reset coin to target number position
      spineAnimationRef.current.updateProgressBar(targetNumber, betType, targetNumber);
    }
  }, [isPlaying, lastRoll, targetNumber, betType]);

  return (
    <div className="glass rounded-xl border border-purple/20 h-[400px] sm:h-[500px] md:h-[600px] flex flex-col relative">
      {/* Spine Animation Game Area */}
      <div className="flex-1 relative overflow-hidden">
        <SpineDiceAnimation
          ref={spineAnimationRef}
          width={1080}
          height={500}
          targetNumber={targetNumber}
          betType={betType}
          onLoaded={() => { console.log("Dice Spine animation loaded"); setSpineLoaded(true); }}
          onError={(error) => console.error("Dice Spine animation error:", error)}
        />

        {/* Loading overlay */}
        {!spineLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-neon-pink border-t-transparent rounded-full mx-auto mb-2"></div>
              <span className="text-light text-sm">Loading Dice...</span>
            </div>
          </div>
        )}

        {/* Overlay UI for game info - Hidden on mobile */}
        <div className="hidden md:flex absolute top-4 left-4 right-4 justify-between items-start pointer-events-none">
          {/* Target Info */}
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-purple/20">
            <div className="text-sm text-soft">Target: {targetNumber}</div>
            <div className="text-xs text-soft">
              Win Range: {betType === "under" ? `1-${targetNumber - 1}` : `${targetNumber + 1}-100`}
            </div>
            <div className="text-xs text-soft mt-1">
              Win Chance: {calculateWinProbability().toFixed(1)}%
            </div>
          </div>

          {/* Result Display */}
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-purple/20">
            <div className="text-center">
              <div
                className={`text-3xl font-bold transition-colors duration-300 ${isPlaying
                  ? "text-yellow-400 animate-pulse"
                  : showResults && lastRoll && isWin
                    ? "text-green-400"
                    : showResults && lastRoll
                      ? "text-red-400"
                      : "text-neon-pink"
                  }`}
              >
                {isPlaying ? "?" : (showResults && lastRoll) || "--"}
              </div>
              <div className="text-xs text-soft">{isPlaying ? "Rolling..." : "Last Roll"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <GameResultSection 
        result={result}
        isVisible={showResults && !!lastRoll}
        compact={true}
        onAutoHide={onClearResults}
      />

    </div>
  );
};

export default DiceGameArea;
