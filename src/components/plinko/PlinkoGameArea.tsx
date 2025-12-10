"use client";
import React, { useState, useEffect, useRef } from "react";
import SpinePlinkoAnimation, { SpinePlinkoAnimationHandle } from "./SpinePlinkoAnimation";
import GameResultSection, { GameResult } from "../common/GameResultSection";

interface PlinkoGameAreaProps {
  multipliers: string[];
  rows: number;
  riskLevel: string;
  balls: number;
  isPlaying: boolean;
  dropToken: number;
  onBallLanded: (ballIndex: number, slotIndex: number, multiplier: number) => void;
  onRunComplete: () => void;

  // server-authoritative landing order
  serverSlots?: number[];
  serverSlotsToken?: number;
  
  // Result display props
  betAmount?: number;
  totalWin?: number;
}

function parseMultiplier(value: string): number {
  return parseFloat(value.replace(/x/i, ""));
}

const PlinkoGameArea: React.FC<PlinkoGameAreaProps> = ({
  multipliers,
  rows,
  riskLevel,
  balls,
  isPlaying,
  dropToken,
  onBallLanded,
  onRunComplete,
  serverSlots = [],
  serverSlotsToken = 0,
  betAmount = 0,
  totalWin = 0,
}) => {
  const [spineLoaded, setSpineLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const spineAnimationRef = useRef<SpinePlinkoAnimationHandle | null>(null);
  
  const landedCountRef = useRef<number>(0);
  const plannedTotalRef = useRef<number>(0);
  const spawnedCountRef = useRef<number>(0);

  const numericMultipliers = multipliers.map(parseMultiplier);

  // Prepare result data for common component
  const result: GameResult | null = (!isPlaying && totalWin !== 0 && betAmount > 0) ? {
    betAmount,
    isWin: totalWin > betAmount,
    winAmount: totalWin,
    resultText: totalWin > betAmount ? `${(totalWin / betAmount).toFixed(2)}x` : undefined
  } : null;

  // Simulate ball landing with server slots
  const simulateBallLanding = (ballIndex: number, slotIndex: number) => {
    const multiplier = numericMultipliers[slotIndex] ?? 1;
    
    // Trigger Spine slot win animation
    if (spineAnimationRef.current) {
      spineAnimationRef.current.triggerSlotWin(slotIndex, multiplier);
    }
    
    onBallLanded(ballIndex, slotIndex, multiplier);
    
    landedCountRef.current += 1;
    if (landedCountRef.current >= plannedTotalRef.current) {
      onRunComplete();
    }
  };

  // New round started -> reset counters and trigger animations
  useEffect(() => {
    if (dropToken === 0) return;
    plannedTotalRef.current = Math.max(0, balls);
    landedCountRef.current = 0;
    spawnedCountRef.current = 0;
    
    // Reset Spine animation for new game
    if (spineAnimationRef.current) {
      spineAnimationRef.current.resetGame();
    }
  }, [dropToken, balls]);

  // Spawn balls as server ticks arrive and simulate physics with Spine
  useEffect(() => {
    if (!isPlaying) return;

    while (spawnedCountRef.current < serverSlots.length) {
      const ballIndex = spawnedCountRef.current++;
      const serverSlot = serverSlots[ballIndex];
      
      // Trigger Spine ball drop animation
      if (spineAnimationRef.current) {
        spineAnimationRef.current.dropBall(ballIndex, serverSlot, () => {
          // Simulate ball landing after animation completes
          setTimeout(() => {
            simulateBallLanding(ballIndex, serverSlot);
          }, 2000); // 2 second delay for ball to "fall"
        });
      } else {
        // Fallback if Spine not ready
        setTimeout(() => {
          simulateBallLanding(ballIndex, serverSlot);
        }, 2000);
      }
    }
  }, [serverSlotsToken, isPlaying, serverSlots.length]);

  return (
    <div className="flex-1">
      <div ref={containerRef} className="glass rounded-xl border border-purple/20 h-[400px] sm:h-[500px] md:h-[600px] flex flex-col relative">
        {/* Spine Animation Background */}
        <div className="flex-1 relative overflow-hidden">
          <SpinePlinkoAnimation
            ref={spineAnimationRef}
            rows={rows}
            multipliers={multipliers}
            onLoaded={() => { console.log("Plinko Spine animation loaded"); setSpineLoaded(true); }}
            onError={(error) => console.error("Plinko Spine animation error:", error)}
          />

          {/* Loading overlay */}
          {!spineLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-neon-pink border-t-transparent rounded-full mx-auto mb-2"></div>
                <span className="text-light text-sm">Loading Plinko...</span>
              </div>
            </div>
          )}

          {/* Top HUD */}
          <div className="absolute top-3 left-3 bg-background-secondary/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-purple/30 text-xs">
            <div className="text-soft">
              Rows: <span className="text-light font-bold">{rows}</span>
            </div>
            <div className="text-soft">
              Risk: <span className="text-light font-bold">{riskLevel}</span>
            </div>
          </div>

          {/* Multiplier strip now handled by Spine animation */}
        </div>
        
        {/* Results Section */}
        <GameResultSection 
          result={result}
          isVisible={!!result}
          compact={true}
        />
      </div>
    </div>
  );
};

export default PlinkoGameArea;
