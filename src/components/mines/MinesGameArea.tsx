import React, { useEffect, useRef, useState } from "react";
import SpineMinesAnimation, { SpineMinesAnimationHandle } from "./SpineMinesAnimation";
import GameResultSection, { GameResult } from "../common/GameResultSection";

interface MinesGameAreaProps {
    isPlaying: boolean;
    gridSize: string;
    minesCount: number;
    betAmount: number;

    // Hook-driven live data
    picks: number;
    multiplier: number;
    revealed: Set<number>;
    boomIndex: number | null;
    onOpenCell: (row: number, col: number) => void;

    // Result computed from backend settlement
    resultStatus: "idle" | "won" | "lost";
    payoutSol: number | null;
    
    // Auto-reset callback
    onAutoReset?: () => void;
    
    // Sound controls
    soundsEnabled?: boolean;
    playSound?: (soundKey: string) => void;
}

const MinesGameArea: React.FC<MinesGameAreaProps> = ({ isPlaying, gridSize, minesCount, betAmount, picks, multiplier, revealed, boomIndex, onOpenCell, resultStatus, payoutSol, onAutoReset, soundsEnabled = true, playSound }) => {
    const [spineLoaded, setSpineLoaded] = useState(false);
    const spineAnimationRef = useRef<SpineMinesAnimationHandle>(null);
    const previousRevealedRef = useRef<Set<number>>(new Set());

    // Use playSound function passed from parent

    // Prepare result data for common component
    const result: GameResult | null =
        resultStatus !== "idle"
            ? {
                  betAmount,
                  isWin: resultStatus === "won",
                  winAmount: payoutSol || 0,
                  resultText: resultStatus === "won" ? `${multiplier.toFixed(2)}x` : "Mine Hit",
              }
            : null;

    // Handle mine explosion animation
    useEffect(() => {
        if (boomIndex !== null && spineAnimationRef.current) {
            // Play explosion sound when mine explodes
            playSound?.('explosion');
            spineAnimationRef.current.explodeMine(boomIndex);
        }
    }, [boomIndex]);

    // Handle cell reveals - only animate newly revealed cells
    useEffect(() => {
        if (revealed.size > 0 && spineAnimationRef.current) {
            // Find newly revealed cells by comparing with previous state
            const newlyRevealed = Array.from(revealed).filter(
                cellIndex => !previousRevealedRef.current.has(cellIndex)
            );
            
            // Only animate and play sound for newly revealed cells
            if (newlyRevealed.length > 0) {
                playSound?.('bling');
                newlyRevealed.forEach((cellIndex) => {
                    // Safe cells are revealed, mines are not (except boom)
                    const isMine = false; // Revealed cells are always safe
                    spineAnimationRef.current?.revealCell(cellIndex, isMine);
                });
            }
            
            // Update previous revealed set
            previousRevealedRef.current = new Set(revealed);
        }
    }, [revealed]);

    // Handle win/cashout animation
    useEffect(() => {
        if (resultStatus === "won" && spineAnimationRef.current) {
            // Play win celebration sound
            playSound?.('fanfareLong');
            spineAnimationRef.current.showWinReaction(() => {
                console.log("Cashout animation completed");
            });
        }
    }, [resultStatus]);

    // Reset animation when new game starts or when game resets to idle
    useEffect(() => {
        if (spineAnimationRef.current) {
            if (isPlaying) {
                // Reset when new game starts (Play Again clicked)
                spineAnimationRef.current.resetGrid();
                previousRevealedRef.current.clear(); // Clear tracked reveals
                console.log("Resetting grid for new game");
            } else if (resultStatus === "idle") {
                // Also reset when game goes to idle state
                spineAnimationRef.current.resetGrid();
                previousRevealedRef.current.clear(); // Clear tracked reveals
                console.log("Resetting grid to idle state");
            }
        }
    }, [isPlaying, resultStatus]);

    // Control clicks based on game state
    useEffect(() => {
        if (spineAnimationRef.current) {
            // Enable clicks only when game is playing and no results are shown
            // Disable clicks when game is not started (idle) or when results are shown
            const shouldEnableClicks = isPlaying && result === null;
            spineAnimationRef.current.setClicksEnabled(shouldEnableClicks);
            console.log(`Clicks ${shouldEnableClicks ? 'enabled' : 'disabled'} - isPlaying: ${isPlaying}, hasResults: ${result !== null}`);
        }
    }, [isPlaying, result]);

    // Set up click handler for Spine assets
    useEffect(() => {
        if (spineAnimationRef.current) {
            spineAnimationRef.current.setClickHandler(onOpenCell);
        }
    }, [onOpenCell]);

    return (
        <div className="glass rounded-xl border border-purple/20 h-[400px] sm:h-[500px] md:h-[600px] flex flex-col relative">
            {isPlaying || resultStatus !== "idle" ? (
                <>
                    {/* Spine Animation Game Area */}
                    <div className="flex-1 relative overflow-hidden">
                        <SpineMinesAnimation ref={spineAnimationRef} gridSize={gridSize} width={800} height={500} onLoaded={() => { console.log("Mines Spine animation loaded"); setSpineLoaded(true); }} onError={(error) => console.error("Mines Spine animation error:", error)} />
                        
                        {/* Loading overlay */}
                        {!spineLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                <div className="text-center">
                                    <div className="animate-spin w-8 h-8 border-2 border-neon-pink border-t-transparent rounded-full mx-auto mb-2"></div>
                                    <span className="text-light text-sm">Loading Mines...</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Result Overlay */}
                        <GameResultSection result={result} isVisible={!!result} compact={true} overlay={true} onAutoHide={onAutoReset} />
                    </div>
                </>
            ) : (
                <>
                    {/* Idle State with Spine Animation */}
                    <div className="flex-1 relative overflow-hidden">
                        <SpineMinesAnimation ref={spineAnimationRef} gridSize={gridSize} width={800} height={500} onLoaded={() => { console.log("Mines Spine animation loaded"); setSpineLoaded(true); }} onError={(error) => console.error("Mines Spine animation error:", error)} />
                        
                        {/* Loading overlay */}
                        {!spineLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                <div className="text-center">
                                    <div className="animate-spin w-8 h-8 border-2 border-neon-pink border-t-transparent rounded-full mx-auto mb-2"></div>
                                    <span className="text-light text-sm">Loading Mines...</span>
                                </div>
                            </div>
                        )}
                        {/* Overlay info panel */}
                        {/* <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center space-y-4 bg-background/80 backdrop-blur-sm rounded-xl p-6 border border-purple/30">
                                <h3 className="text-2xl font-bold text-light">Mines Game</h3>
                                <p className="text-soft">Find the safe tiles and avoid the mines</p>
                                <div className="text-sm text-soft space-y-1">
                                    <p>Grid: {gridSize}</p>
                                    <p>Mines: {minesCount}</p>
                                </div>

                                {resultStatus !== "idle" && (
                                    <div className="pt-2">
                                        <div className={`text-lg font-bold ${resultStatus === "won" ? "text-green-400" : "text-red-400"}`}>
                                            {resultStatus === "won" ? "WIN!" : "BOOM!"}
                                        </div>
                                        <div className="text-soft">
                                            {resultStatus === "won"
                                                ? (payoutSol != null ? `+${payoutSol.toFixed(4)} SOL` : `+${(betAmount * multiplier).toFixed(4)} SOL`)
                                                : `-${betAmount} SOL`}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div> */}
                    </div>
                </>
            )}
        </div>
    );
};

export default MinesGameArea;
