"use client";

import React, { useState, useRef, useEffect } from "react";
import SpineCrashAnimation, { SpineCrashAnimationHandle } from "./SpineCrashAnimation";
import GameResultSection, { GameResult } from "../common/GameResultSection";
import { formatCurrencyDisplay, solToUsd } from "@/utils/currency";

interface CrashGameAreaProps {
  betAmount: number;
  isPlaying: boolean;
  startTs: number | null;
  multiplier: number;
  crashed: boolean;
  onCashOut: (cashoutMultiplier?: number) => void;
  onClearResults?: () => void;
  gameResult: {
    type: "win" | "loss" | null;
    multiplier: number | null;
    winAmount: number;
  };
  soundsEnabled?: boolean;
  playSound?: (soundKey: string) => void;
}

const CrashGameArea: React.FC<CrashGameAreaProps> = ({
  betAmount,
  isPlaying,
  startTs,
  multiplier,
  crashed,
  onCashOut,
  onClearResults,
  gameResult,
  soundsEnabled = true,
  playSound,
}) => {
  const [displayMultiplier, setDisplayMultiplier] = useState<number>(1);
  const [spineLoaded, setSpineLoaded] = useState(false);
  const spineAnimationRef = useRef<SpineCrashAnimationHandle>(null);

  // Prepare result data for common component
  const result: GameResult | null = gameResult.type ? {
    betAmount,
    isWin: gameResult.type === "win",
    winAmount: gameResult.type === "win" ? gameResult.winAmount : 0,
    resultText: gameResult.multiplier ? `${gameResult.multiplier.toFixed(2)}x` : undefined
  } : null;

  // Handle game state changes for Spine animation
  useEffect(() => {
    if (!spineAnimationRef.current || !spineLoaded) return;
    if (isPlaying && !crashed) {
      // Start rocket flight when game begins - only trigger once per game
      console.log("Starting rocket flight for new game");
      spineAnimationRef.current.startFlight();
    } else if (crashed && gameResult.type !== null) {
      // Explode rocket when crashed and results are available
      console.log("Game crashed - exploding rocket");
      spineAnimationRef.current.explodeRocket(() => {
        console.log("Rocket explosion completed - keeping rocket visible for results");
        // Don't auto-reset after explosion - let user see the results
        // Reset will happen when new game starts or results are cleared
      });
    }
  }, [isPlaying, crashed, spineLoaded, gameResult.type]);

  // Reset rocket when game becomes idle (no results, not playing)
  useEffect(() => {
    if (!spineAnimationRef.current || !spineLoaded) return;
    if (!isPlaying && gameResult.type === null) {
      console.log("Game is idle - resetting rocket and ensuring visibility");
      spineAnimationRef.current.resetRocket();
      
      // Safety fallback: ensure reset after a short delay in case of timing issues
      setTimeout(() => {
        if (spineAnimationRef.current && !isPlaying && gameResult.type === null) {
          console.log("Safety fallback - ensuring rocket is reset after crash");
          spineAnimationRef.current.resetRocket();
        }
      }, 100);
    }
  }, [gameResult.type, isPlaying, spineLoaded]);

  // Handle background sound - play when game is truly idle (not playing, no results)
  useEffect(() => {
    if (!spineAnimationRef.current || !spineLoaded) return;
    
    const isIdle = !isPlaying && !crashed && gameResult.type === null;
    if (isIdle) {
      console.log("Game is in idle mode - playing background sound");
      spineAnimationRef.current.playBackgroundSound();
    } else {
      // Stop background sound when game starts or results are shown
      spineAnimationRef.current.stopBackgroundSound();
    }
  }, [isPlaying, crashed, spineLoaded, gameResult.type]);

  // Update rocket position based on current multiplier during flight
  useEffect(() => {
    if (!spineAnimationRef.current || !spineLoaded || !isPlaying || crashed) return;
    
    console.log(`Updating rocket flight to multiplier: ${multiplier}x`);
    spineAnimationRef.current.updateFlight(multiplier);
    spineAnimationRef.current.updateScaleNumbers(multiplier);
  }, [multiplier, isPlaying, crashed, spineLoaded]);

  // Update multiplier display
  useEffect(() => {
    setDisplayMultiplier(multiplier);
  }, [multiplier]);

  // Clear results immediately when starting new game
  useEffect(() => {
    if (isPlaying && onClearResults) {
      onClearResults();
    }
  }, [isPlaying, onClearResults]);

  // Note: Reveal sound now plays automatically when SpineCrashAnimation assets load

  return (
    <div className="glass rounded-xl border border-purple/20 h-[400px] sm:h-[500px] md:h-[600px] flex flex-col relative">
      <div className="flex-1 relative overflow-hidden">
        <SpineCrashAnimation
          ref={spineAnimationRef}
          onLoaded={() => {
            console.log("Spine crash animation loaded");
            setSpineLoaded(true);
          }}
          onError={(error) => {
            console.error("Spine crash animation error:", error);
            setSpineLoaded(false);
          }}
        />

        {/* Loading overlay */}
        {!spineLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-neon-pink border-t-transparent rounded-full mx-auto mb-2"></div>
              <span className="text-light text-sm">Loading Crash...</span>
            </div>
          </div>
        )}

        {/* <CrashHUD displayMultiplier={displayMultiplier} /> */}
      </div>

      {/* Results footer */}
      <GameResultSection 
        result={result}
        isVisible={!!gameResult.type}
        compact={true}
        autoHideDelay={5000}
        onAutoHide={onClearResults}
      />
    </div>
  );
};

export default CrashGameArea;
