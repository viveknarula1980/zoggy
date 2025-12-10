import React, { useState, useEffect, useRef } from "react";
import SpineCoinflipAnimation, { SpineCoinflipAnimationHandle, CoinflipAnimations } from "./SpineCoinflipAnimation";
import Loader from "../common/Loader";
import GameResultSection, { GameResult } from "../common/GameResultSection";
import { formatCurrencyDisplay, solToUsd } from "@/utils/currency";

/**
 * Props for the CoinflipGameArea component
 * @property betAmount - Amount of SOL being bet
 * @property pickedSide - User's chosen side ('heads' or 'tails')
 * @property minimumToWin - Minimum number of correct flips needed to win
 * @property isFlipping - Flag controlled by parent to indicate game state
 *
 * Note: This component only handles UI display
 * - Player matching and socket logic is handled in the parent page component
 * - This component receives isFlipping prop to show/hide loader and control animations
 * - Game state management happens in the parent
 */
interface CoinflipGameAreaProps {
    betAmount: number;
    pickedSide: string;
    minimumToWin: number;
    calculateWinProbability: () => number;
    isFlipping?: boolean;
    showLoader?: boolean; // Controlled by parent for player matching state
    onFlipComplete?: (results: ("heads" | "tails")[]) => void;
    gameResults?: {
        results: ("heads" | "tails")[];
        isWin: boolean;
        winAmount: number;
        totalFlips: number;
    } | null;
    onPlayAgain?: () => void;
    // Result from parent component (server authoritative)
    desiredResult?: "heads" | "tails";
    // Flag to indicate if playing with bot
    playWithBot?: boolean;
    // Callback to clear game results
    onClearResults?: () => void;
    // Sound controls
    soundsEnabled?: boolean;
    playSound?: (soundKey: string) => void;
}

const CoinflipGameArea: React.FC<CoinflipGameAreaProps> = ({ betAmount, pickedSide, minimumToWin, calculateWinProbability, isFlipping = false, showLoader = false, onFlipComplete, gameResults, onPlayAgain, desiredResult, playWithBot = false, onClearResults, soundsEnabled = true, playSound }) => {
    const [countdown, setCountdown] = useState<number>(3);
    const [currentCoinState, setCurrentCoinState] = useState<"bronze" | "heads" | "tails">("bronze");
    const [spineLoaded, setSpineLoaded] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [hasPlayedReveal, setHasPlayedReveal] = useState(false);
    const [isPlayingReveal, setIsPlayingReveal] = useState(false);
    const spineAnimationRef = useRef<SpineCoinflipAnimationHandle>(null);

    // Use playSound function passed from parent

    // Prepare result data for common component
    const result: GameResult | null = gameResults ? {
        betAmount,
        isWin: gameResults.isWin,
        winAmount: gameResults.winAmount,
        resultText: gameResults.isWin ? "WIN!" : "LOSE"
    } : null;

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showLoader) {
            setCountdown(3);
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev > 1) {
                        return prev - 1;
                    } else if (prev === 1) {
                        // Clear the timer when reaching 0
                        clearInterval(timer);
                        return 0;
                    }
                    return prev;
                });
            }, 1000);
        }
        return () => {
            clearInterval(timer);
            setCountdown(3);
        };
    }, [showLoader]);

    // Handle result changes from parent component with 5-second spinning
    useEffect(() => {
        if (desiredResult && spineAnimationRef.current && hasPlayedReveal && !isPlayingReveal) {
            console.log(`CoinflipGameArea: Starting 5-second spin before showing ${desiredResult}`);
            
            // Hide results during spinning
            setShowResults(false);

            // Add small delay to ensure spine player is ready
            setTimeout(() => {
                console.log(`CoinflipGameArea: Starting spinning animation for 5 seconds`);
                // Play flip sound when spinning starts
                playSound?.('flip');
                spineAnimationRef.current?.startSpinning(5000, desiredResult, () => {
                    console.log(`CoinflipGameArea: 5-second spinning completed, final result: ${desiredResult}`);
                    // Update current state to match the result
                    setCurrentCoinState(desiredResult);
                    // Show results after spinning completes
                    setShowResults(true);
                    
                    // Play win sound if game results exist and player won
                    if (gameResults?.isWin) {
                        // Randomly choose between win1 and win2
                        const winSound = Math.random() > 0.5 ? 'win1' : 'win2';
                        playSound?.(winSound);
                    }
                });
            }, 200);
        } else if (desiredResult && !hasPlayedReveal) {
            console.log(`CoinflipGameArea: Waiting for reveal animation to complete before starting game`);
        } else {
            console.log(`CoinflipGameArea: No result or animation ref - desiredResult: ${desiredResult}, ref: ${!!spineAnimationRef.current}`);
        }
    }, [desiredResult, hasPlayedReveal, isPlayingReveal]);

    // Reset showResults when game starts
    useEffect(() => {
        if (isFlipping) {
            setShowResults(false);
        }
    }, [isFlipping]);

    // Play reveal animation on every component load
    useEffect(() => {
        if (spineLoaded && !hasPlayedReveal && !isPlayingReveal && spineAnimationRef.current) {
            console.log('Playing reveal animation on component load');
            setIsPlayingReveal(true);
            
            // Small delay to ensure spine is fully ready
            setTimeout(() => {
                spineAnimationRef.current?.playRevealAnimation(() => {
                    console.log('Reveal animation completed');
                    setIsPlayingReveal(false);
                    setHasPlayedReveal(true);
                });
            }, 500);
        }
    }, [spineLoaded, hasPlayedReveal, isPlayingReveal]);

    return (
        <div className="glass rounded-xl border border-purple/20 h-[400px] sm:h-[500px] md:h-[600px] flex flex-col relative">
            {/* Main Animation Area */}
            <div className="flex-1 rounded-xl relative overflow-hidden min-h-[300px]">
                <SpineCoinflipAnimation
                    ref={spineAnimationRef}
                    width={undefined}
                    height={undefined}
                    initialAnimation={undefined}
                    onLoaded={() => {
                        console.log(`SpineCoinflipAnimation onLoaded - isFlipping: ${isFlipping}, desiredResult: ${desiredResult}`);
                        setSpineLoaded(true);

                        if (isFlipping && desiredResult) {
                            // Trigger flip animation based on result from parent
                            const animationName = desiredResult === "heads" ? CoinflipAnimations.FLIP_TO_HEAD : CoinflipAnimations.FLIP_TO_TAILS;
                            console.log(`Triggering animation from onLoaded: ${animationName}`);
                            //spineAnimationRef.current?.play(animationName, false);
                        }
                    }}
                />

                {/* Loading overlay */}
                {!spineLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <div className="text-center">
                            <div className="animate-spin w-8 h-8 border-2 border-neon-pink border-t-transparent rounded-full mx-auto mb-2"></div>
                            <span className="text-light text-sm">Loading Coinflip...</span>
                        </div>
                    </div>
                )}

                

                {/* Timer Overlay */}
                {showLoader && !playWithBot && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                        <div className="flex flex-col items-center gap-2 sm:gap-4">
                            <Loader size="lg" className="text-primary" />
                            <div className="text-light animate-pulse text-sm sm:text-base"> {countdown}s</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Results Section */}
            <GameResultSection 
                result={result}
                isVisible={!!gameResults && showResults}
                compact={true}
                onAutoHide={() => {
                    setShowResults(false);
                    onClearResults?.();
                }}
            />
        </div>
    );
};

export default CoinflipGameArea;
