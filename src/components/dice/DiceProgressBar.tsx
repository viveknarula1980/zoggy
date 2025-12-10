import React, { useEffect, useState } from "react";

interface DiceProgressBarProps {
  targetNumber: number;
  betType: "under" | "over";
  currentRoll: number | null;
  isRolling: boolean;
  animationProgress: number; // 0-100 for animation progress
}

const DiceProgressBar: React.FC<DiceProgressBarProps> = ({
  targetNumber,
  betType,
  currentRoll,
  isRolling,
  animationProgress
}) => {
  const [coinPosition, setCoinPosition] = useState(0);

  // Calculate coin position based on current roll or animation progress
  useEffect(() => {
    if (isRolling) {
      // During rolling, use animation progress to move coin
      setCoinPosition(animationProgress);
    } else if (currentRoll !== null) {
      // After roll, position coin at the actual result
      setCoinPosition(currentRoll);
    } else {
      // Reset position
      setCoinPosition(0);
    }
  }, [isRolling, currentRoll, animationProgress]);

  // Determine win/lose zones
  const getZoneColor = (position: number) => {
    if (betType === "under") {
      return position < targetNumber ? "bg-green-500" : "bg-red-500";
    } else {
      return position > targetNumber ? "bg-green-500" : "bg-red-500";
    }
  };

  // Create gradient background for the progress bar
  const getProgressBarGradient = () => {
    if (betType === "under") {
      const winPercentage = ((targetNumber - 1) / 100) * 100;
      return {
        background: `linear-gradient(to right, #10b981 0%, #10b981 ${winPercentage}%, #ef4444 ${winPercentage}%, #ef4444 100%)`
      };
    } else {
      const losePercentage = (targetNumber / 100) * 100;
      return {
        background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${losePercentage}%, #10b981 ${losePercentage}%, #10b981 100%)`
      };
    }
  };

  return (
    <div className="w-full px-6 py-4">
      {/* Progress Bar Container */}
      <div className="relative">
        {/* Main Progress Bar */}
        <div 
          className="h-8 rounded-full border-2 border-yellow-600 shadow-lg relative overflow-hidden"
          style={getProgressBarGradient()}
        >
          {/* Target Number Indicator */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-yellow-400 shadow-lg z-10"
            style={{ left: `${targetNumber}%` }}
          >
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
              <div className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded">
                {targetNumber}
              </div>
            </div>
          </div>

          {/* Coin Icon */}
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 transition-all duration-300 z-20"
            style={{ 
              left: `${coinPosition}%`,
              transitionDuration: isRolling ? '100ms' : '500ms'
            }}
          >
            <img 
              src="/assets/Dice/UI & icons/coin.png" 
              alt="Dice Coin" 
              className={`w-10 h-10 ${isRolling ? 'animate-spin' : ''}`}
            />
          </div>
        </div>

        {/* Number Scale */}
        <div className="flex justify-between mt-2 text-sm text-soft">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>

        {/* Win/Lose Zone Labels */}
        <div className="flex justify-between mt-1 text-xs">
          <div className={`${betType === "under" ? "text-green-400" : "text-red-400"}`}>
            {betType === "under" ? `WIN (1-${targetNumber - 1})` : "LOSE (1-" + targetNumber + ")"}
          </div>
          <div className={`${betType === "over" ? "text-green-400" : "text-red-400"}`}>
            {betType === "over" ? `WIN (${targetNumber + 1}-100)` : `LOSE (${targetNumber + 1}-100)`}
          </div>
        </div>

        {/* Current Roll Display */}
        {currentRoll !== null && !isRolling && (
          <div className="text-center mt-3">
            <div className={`text-2xl font-bold ${
              (betType === "under" && currentRoll < targetNumber) || 
              (betType === "over" && currentRoll > targetNumber) 
                ? "text-green-400" 
                : "text-red-400"
            }`}>
              {currentRoll}
            </div>
            <div className="text-sm text-soft">Final Roll</div>
          </div>
        )}

        {/* Rolling Display */}
        {isRolling && (
          <div className="text-center mt-3">
            <div className="text-2xl font-bold text-yellow-400 animate-pulse">
              Rolling...
            </div>
            <div className="text-sm text-soft">
              {Math.round(animationProgress)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiceProgressBar;
