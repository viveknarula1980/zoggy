import React, { useState, useRef, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import GameResultSection, { GameResult } from "../common/GameResultSection";
import { formatCurrencyDisplay, solToUsd, usdToSol } from "@/utils/currency";
import ProvablyFairButton from "@/components/common/ProvablyFairButton";
import SoundToggle from "@/components/common/SoundToggle";
import SpineSlotsAnimation, { SpineSlotsAnimationHandle } from "./SpineSlotsAnimation";
import BetPopup from "./BetPopup";
import ProvablyFairModal from "@/components/common/ProvablyFairModal";

interface SlotsGameAreaProps {
    betAmount: number;
    jackpotAmount: number;
    lastWin: number;
    autoSpin: boolean;
    autoSpinCount: number;
    symbolsGrid: string[];
    isPlaying: boolean;
    balance: number;
    serverSeedHash?: string;
    clientSeed?: string;
    nonce?: number;
    onBetClick: () => void;
    onAutoSpinClick: () => void;
    spinsLeft: number;
    isButtonDisabled: boolean;
    showBetPopup: boolean;
    onCloseBetPopup: () => void;
    setBetAmount: (amount: number) => void;
    onPlaceBet: () => void;
    provablyFairData?: any;
    hasError?: boolean;
    // Callback to clear game results
    onClearResults?: () => void;
    // Sound controls
    soundsEnabled?: boolean;
    onToggleSounds?: () => void;
    playSound?: (soundKey: string) => void;
    // Free spins
    freeSpins: number;
    onFreeSpinClick: () => void;
}

// Symbol mapping for display
const SYMBOL_MAP = [
    { name: "floki", img: "/assets/slots/floki.svg" },
    { name: "wif", img: "/assets/slots/wif.svg" },
    { name: "brett", img: "/assets/slots/brett.svg" },
    { name: "shiba", img: "/assets/slots/shiba.svg" },
    { name: "bonk", img: "/assets/slots/bonk.svg" },
    { name: "doge", img: "/assets/slots/doge.svg" },
    { name: "pepe", img: "/assets/slots/pepe.svg" },
    { name: "sol", img: "/assets/slots/sol.svg" },
    { name: "zoggy", img: "/assets/slots/zoggy.svg" },
] as const;

const SlotsGameArea: React.FC<SlotsGameAreaProps> = ({ betAmount, lastWin, autoSpin, symbolsGrid, isPlaying, onBetClick, onAutoSpinClick, spinsLeft, isButtonDisabled, showBetPopup, onCloseBetPopup, setBetAmount, onPlaceBet, provablyFairData, hasError = false, onClearResults, soundsEnabled = true, onToggleSounds, playSound, freeSpins, onFreeSpinClick }) => {
    const [showProvablyFairModal, setShowProvablyFairModal] = useState(false);
    const [spineLoaded, setSpineLoaded] = useState(false);
    const spineAnimationRef = useRef<SpineSlotsAnimationHandle>(null);

    // Use playSound function passed from parent
    const getCell = (row: number, col: number) => symbolsGrid[row * 3 + col];
    
    // Convert betAmount (SOL) to USD for display
    const betAmountUsd = solToUsd(betAmount);

    // Track spin phases - moved before result calculation
    const [hasStartedSpin, setHasStartedSpin] = useState(false);
    const [hasReceivedResult, setHasReceivedResult] = useState(false);
    const [hasCompletedSpin, setHasCompletedSpin] = useState(false); // Track if we've completed a spin
    const [showResults, setShowResults] = useState(false); // Control result visibility timing
    const lastProcessedGridRef = useRef<string>("");
    const isCurrentlySpinningRef = useRef(false); // Prevent multiple spin starts

    // Prepare result data for common component
    // Show results when: spine loaded, we have completed a spin, and showResults is true
    // Note: lastWin can be 0 (loss) or > 0 (win), but showResults ensures proper timing
    const shouldShowResult = spineLoaded && hasCompletedSpin && showResults;

    const result: GameResult | null = shouldShowResult && lastWin >= 0
        ? {
              betAmount,
              isWin: lastWin > 0,
              winAmount: lastWin > 0 ? lastWin : 0,
              resultText: lastWin > 0 ? `${(lastWin / betAmount).toFixed(2)}x` : undefined,
          }
        : null;

    // Debug logging for result display
    console.log("Result display debug:", {
        isPlaying,
        spineLoaded,
        hasStartedSpin,
        hasCompletedSpin,
        lastWin,
        shouldShowResult,
        result: !!result,
        timing: "Animation continues until server resolves, then shows results",
    });

    // Phase 1: Start spinning when game begins (on lock, before server resolve)
    useEffect(() => {
        if (spineAnimationRef.current && spineLoaded && isPlaying && !hasStartedSpin && !isCurrentlySpinningRef.current) {
            console.log("Starting reel spin animation (waiting for server resolve) - isPlaying:", isPlaying, "hasStartedSpin:", hasStartedSpin, "isCurrentlySpinning:", isCurrentlySpinningRef.current);

            // Set all protection flags
            setHasStartedSpin(true);
            setHasReceivedResult(false);
            setHasCompletedSpin(false); // Reset completed spin flag
            setShowResults(false); // Hide results immediately when new spin starts
            isCurrentlySpinningRef.current = true;
            lastProcessedGridRef.current = ""; // Reset processed grid for new spin

            // Start spinning reels immediately - they will continue until server resolves
            // Play spin sound when reels start spinning
            playSound?.('spin');
            spineAnimationRef.current?.startSpin();
            console.log("Reels started spinning, waiting for server resolve...");
        }
    }, [isPlaying, spineLoaded]); // Removed hasStartedSpin from dependencies to prevent loop

    // Phase 2: Stop spinning and show results ONLY when server resolves with actual data
    useEffect(() => {
        if (spineAnimationRef.current && spineLoaded && hasStartedSpin && symbolsGrid && symbolsGrid.length > 0 && !hasReceivedResult && !isPlaying) {
            // Only process when isPlaying becomes false (meaning server has resolved)
            // Create a unique identifier for this grid to prevent duplicate processing
            const gridKey = symbolsGrid.join(",");

            // Check if we've already processed this exact grid
            if (lastProcessedGridRef.current === gridKey) {
                console.log("Grid already processed, skipping duplicate:", gridKey);
                return;
            }

            // Additional check: Only process if this is a valid result grid (not random placeholder)
            // Must have lastWin set (even 0 for losses) to be a valid server result
            if (lastWin < 0) {
                console.log("Skipping - no valid win amount set, waiting for server resolve:", gridKey);
                return;
            }

            console.log("Server resolved! Stopping reels with results:", symbolsGrid, "Win amount:", lastWin);
            setHasReceivedResult(true);
            lastProcessedGridRef.current = gridKey; // Mark this grid as processed

            // Stop reels and show server results
            spineAnimationRef.current.playSpinWithResult(symbolsGrid, () => {
                console.log("Slots spin animation completed with result:", symbolsGrid);
                setHasStartedSpin(false);
                setHasReceivedResult(false);
                setHasCompletedSpin(true); // Mark spin as completed for result display
                setShowResults(true); // Show results only after animation completes
                isCurrentlySpinningRef.current = false; // Reset spinning protection
                
                // Play win sound if there's a win
                if (lastWin > 0) {
                    // Choose sound based on win amount
                    if (lastWin >= betAmount * 20) {
                        playSound?.('fanfareLong'); // Huge win
                    } else if (lastWin >= betAmount * 10) {
                        playSound?.('fanfare'); // Big win
                    } else if (lastWin >= betAmount * 3) {
                        playSound?.('coins'); // Medium win
                    } else {
                        playSound?.('win'); // Regular win
                    }
                }
            });
        }
    }, [spineLoaded, hasStartedSpin, symbolsGrid, hasReceivedResult, lastWin, isPlaying]);

    // Handle errors - stop animation without showing results
    useEffect(() => {
        if (hasError && spineAnimationRef.current && hasStartedSpin) {
            console.log("Socket error detected, stopping animation without results");
            spineAnimationRef.current.handleError();
            setHasStartedSpin(false);
            setHasReceivedResult(false);
            setHasCompletedSpin(false); // Don't show results on error
            setShowResults(false); // Hide results on error
            isCurrentlySpinningRef.current = false; // Reset spinning protection on error
        }
    }, [hasError, hasStartedSpin]);

    // Clear hasCompletedSpin when new spin starts
    useEffect(() => {
        if (isPlaying) {
            setHasCompletedSpin(false); // Clear completed spin flag when new spin starts
        }
    }, [isPlaying]);

    // Reset spin tracking when not playing
    useEffect(() => {
        if (!isPlaying) {
            setHasStartedSpin(false);
            setHasReceivedResult(false);
            // Don't reset hasCompletedSpin here - let results show until next spin
            lastProcessedGridRef.current = ""; // Reset processed grid when not playing
            isCurrentlySpinningRef.current = false; // Reset spinning protection when not playing
        }
    }, [isPlaying]);

    return (
        <div className="glass md:w-[80%] w-full rounded-xl border border-purple/20 h-[500px] md:h-[650px] flex flex-col relative">
            {/* Header */}
            <div className="absolute top-0 left-4 z-10">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🎰</span>
                    <h2 className="text-base font-semibold text-light">Slots</h2>
                </div>
            </div>

            {/* Spine Animation Container */}
            <div className="flex-1 relative overflow-hidden">
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                    <SpineSlotsAnimation ref={spineAnimationRef} onLoaded={() => setSpineLoaded(true)} onError={(error) => console.error("Spine animation error:", error)} />
                </div>

                {/* Loading overlay */}
                {!spineLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <div className="text-center">
                            <div className="animate-spin w-8 h-8 border-2 border-neon-pink border-t-transparent rounded-full mx-auto mb-2"></div>
                            <span className="text-light text-sm">Loading Zoggy's Bar...</span>
                        </div>
                    </div>
                )}

            </div>

            {/* Bottom Overlay - Hidden when results are showing */}
            {!showResults && (
                <div className="absolute rounded-b-lg bottom-0 left-0 right-0 glass backdrop-transparent p-2 md:p-1 px-2 md:px-8">
                {/* Mobile Layout - Stack vertically */}
                <div className="md:hidden flex flex-col gap-2">
                    {/* Top row - Center text */}
                    <div className="flex justify-center">
                        <span className="text-base md:text-lg font-bold text-light uppercase tracking-wider">{isPlaying ? "SPINNING..." : "PLACE YOUR BETS!"}</span>
                    </div>

                    {/* Bottom row - Controls */}
                    <div className="flex items-center justify-between">
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
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onBetClick}
                                disabled={isButtonDisabled}
                                className="flex items-center justify-center space-x-1 px-4 py-2 rounded-full bg-background/50 hover:bg-background/70 border border-purple/20 hover:border-purple/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                            >
                                <span className="text-lg text-soft uppercase tracking-wide font-bold">BET</span>
                                <span className="text-lg font-bold text-neon-pink">${betAmountUsd.toFixed(2)}</span>
                            </button>

                            {freeSpins > 0 && (
                                <button
                                    onClick={onFreeSpinClick}
                                    disabled={isButtonDisabled}
                                    className="flex items-center justify-center space-x-1 px-4 py-2 rounded-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 hover:border-green-500/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                                >
                                    <span className="text-lg text-green-400 uppercase tracking-wide font-bold">FREE</span>
                                    <span className="text-lg font-bold text-green-300">({freeSpins})</span>
                                </button>
                            )}
                        </div>

                        <button
                            onClick={onAutoSpinClick}
                            disabled={isButtonDisabled}
                            className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                autoSpin ? "bg-red-500/20 border border-red-500/40 text-red-400" : "bg-neon-pink/20 border border-neon-pink/40 text-neon-pink hover:bg-neon-pink/30"
                            }`}
                            title={autoSpin ? `Stop Auto (${spinsLeft} left)` : "Auto Spin"}
                        >
                            <svg className={`w-6 h-6 ${autoSpin ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Desktop Layout - Original horizontal layout */}
                <div className="hidden md:flex items-center justify-center">
                    {/* Left - Bet Info and Provably Fair */}
                    <div className="flex items-center gap-1 w-1/3">
                        {onToggleSounds && (
                            <SoundToggle
                                soundsEnabled={soundsEnabled}
                                onToggle={onToggleSounds}
                                disabled={isPlaying}
                            />
                        )}
                        <ProvablyFairButton onClick={() => setShowProvablyFairModal(true)} disabled={isPlaying} />
                        <button
                            onClick={onBetClick}
                            disabled={isButtonDisabled}
                            className="flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-background/50 hover:bg-background/70 border border-purple/20 hover:border-purple/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                        >
                            <span className="text-2xl text-soft uppercase tracking-wide font-bold">BET</span>
                            <span className="text-2xl font-bold text-neon-pink">${betAmountUsd.toFixed(2)}</span>
                        </button>
                        
                        {freeSpins > 0 && (
                            <button
                                onClick={onFreeSpinClick}
                                disabled={isButtonDisabled}
                                className="flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 hover:border-green-500/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                            >
                                <span className="text-2xl text-green-400 uppercase tracking-wide font-bold">FREE</span>
                                <span className="text-2xl font-bold text-green-300">({freeSpins})</span>
                            </button>
                        )}
                    </div>

                    {/* Center - Play Game Text */}
                    <div className="flex-1 flex justify-center w-1/3">
                        <span className="text-2xl font-bold text-light uppercase tracking-wider">{isPlaying ? "SPINNING..." : "PLACE YOUR BETS!"}</span>
                    </div>

                    {/* Right - Auto Spin Controls */}
                    <div className="w-1/3 flex items-center justify-end relative h-12">
                        <div className="absolute right-0 flex items-center gap-3">
                            {/* Minus Button */}
                            <button
                                onClick={() => {
                                    const currentUsd = solToUsd(betAmount);
                                    const newUsdAmount = Math.max(0.01, currentUsd - 0.1);
                                    setBetAmount(usdToSol(newUsdAmount));
                                }}
                                disabled={isButtonDisabled || autoSpin || solToUsd(betAmount) <= 0.01}
                                className="flex items-center justify-center w-12 h-12 rounded-full bg-background/80 border border-soft/30 text-soft hover:border-neon-pink/50 hover:text-neon-pink transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                                title="Decrease bet amount"
                            >
                                <Minus className="w-6 h-6" />
                            </button>

                            {/* Auto Spin Button with Label */}
                            <div className="relative -top-5 flex flex-col items-center gap-1">
                                <button
                                    onClick={onAutoSpinClick}
                                    disabled={isButtonDisabled}
                                    className={`flex items-center justify-center w-20 h-20 rounded-full backdrop-blur-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                        autoSpin ? "bg-red-500/20 border border-red-500/40 text-red-400" : "bg-background/80 border border-soft/30 text-soft hover:border-neon-pink/50 hover:text-neon-pink"
                                    }`}
                                    title={autoSpin ? `Stop Auto (${spinsLeft} left)` : "Auto Spin"}
                                >
                                    <svg className={`w-12 h-12 ${autoSpin ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                                <span className="px-3 py-1 rounded-full text-xs font-bold text-light uppercase tracking-wider backdrop-blur-sm">
                                    Autospin
                                </span>
                            </div>

                            {/* Plus Button */}
                            <button
                                onClick={() => {
                                    const currentUsd = solToUsd(betAmount);
                                    const newUsdAmount = currentUsd + 0.1;
                                    setBetAmount(usdToSol(newUsdAmount));
                                }}
                                disabled={isButtonDisabled || autoSpin}
                                className="flex items-center justify-center w-12 h-12 rounded-full bg-background/80 border border-soft/30 text-soft hover:border-neon-pink/50 hover:text-neon-pink transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                                title="Increase bet amount"
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Results Section */}
            <GameResultSection 
                result={result}
                isVisible={showResults && !!result}
                compact={true}
                onAutoHide={() => {
                    setShowResults(false);
                    onClearResults?.();
                }}
            />

            {/* Bet Popup - Positioned relative to game area */}
            <BetPopup isOpen={showBetPopup} onClose={onCloseBetPopup} betAmount={betAmount} setBetAmount={setBetAmount} onPlaceBet={onPlaceBet} isPlaying={isPlaying} />

            {/* Provably Fair Modal */}
            <ProvablyFairModal isOpen={showProvablyFairModal} onClose={() => setShowProvablyFairModal(false)} data={provablyFairData} />
        </div>
    );
};

export default SlotsGameArea;
