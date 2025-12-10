import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as PIXI from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export interface SpineMinesAnimationHandle {
    playBackground: (animationName?: string, loop?: boolean) => void;
    playCharacter: (animationName?: string, loop?: boolean) => void;
    revealCell: (cellIndex: number, isMine: boolean, onComplete?: () => void) => void;
    explodeMine: (cellIndex: number, onComplete?: () => void) => void;
    showWinReaction: (onComplete?: () => void) => void;
    resetGrid: () => void;
    stopAll: () => void;
    setClickHandler: (handler: (row: number, col: number) => void) => void;
    setClicksEnabled: (enabled: boolean) => void;
}

interface SpineMinesAnimationProps {
    width?: number;
    height?: number;
    gridSize: string; // "3x3", "4x4", "5x5"
    onLoaded?: () => void;
    onError?: (error: Error) => void;
}

// Asset paths for mines Spine animations
const MINES_BG_JSON = "/assets/Mines/Animations/Export_animation_Mines/G2_BG.json";
const MINES_BG_ATLAS = "/assets/Mines/Animations/Export_animation_Mines/G2_BG.atlas";

const ZOGGY_JSON = "/assets/Mines/Animations/Export_animation_Mines/Zoggy.json";
const ZOGGY_ATLAS = "/assets/Mines/Animations/Export_animation_Mines/Zoggy.atlas";

const MINES_SLOT_JSON = "/assets/Mines/Animations/Export_animation_Mines/G2_slot.json";
const MINES_SLOT_ATLAS = "/assets/Mines/Animations/Export_animation_Mines/G2_slot.atlas";

// Symbol assets for mines and diamonds
const SYMBOL_2_JSON = "/assets/Mines/Animations/Export_animation_Mines/G2_symbol_2.json";
const SYMBOL_2_ATLAS = "/assets/Mines/Animations/Export_animation_Mines/G2_symbol_2.atlas";

const SYMBOL_4_JSON = "/assets/Mines/Animations/Export_animation_Mines/G2_symbol_4.json";
const SYMBOL_4_ATLAS = "/assets/Mines/Animations/Export_animation_Mines/G2_symbol_4.atlas";

// Animation mapping for mines
export const MinesAnimations = {
    // Background animations (G2_BG)
    BG_LOOP: "loop",

    // Character animations (Zoggy)
    CHARACTER_IDLE: "idle_1",
    CHARACTER_IDLE_2: "idle_2",
    CHARACTER_LOOP_1: "loop_1",//safe animation if diamond is opened
    CHARACTER_LOOP_2: "loop_2", // mine animation if mine is opened
    CHARACTER_LOOP_3: "loop_3", // cashout animation if cashout is opened

    // Slot animations (G2_slot)
    SLOT_IDLE: "idle",

} as const;

// Helper function to get grid dimensions
const getGridDimensions = (gridSize: string): { rows: number; cols: number; totalCells: number } => {
    const [rowsStr, colsStr] = gridSize.split("x");
    const rows = parseInt(rowsStr, 10) || 5; // Default to 5 if parsing fails
    const cols = parseInt(colsStr, 10) || 5; // Default to 5 if parsing fails
    const totalCells = rows * cols;

    return { rows, cols, totalCells };
};

const SpineMinesAnimation = forwardRef<SpineMinesAnimationHandle, SpineMinesAnimationProps>(({ width, height, gridSize, onLoaded, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const backgroundSpineRef = useRef<Spine | null>(null);
    const characterSpineRef = useRef<Spine | null>(null);
    const gridSlotsRef = useRef<(Spine | null)[]>([]);
    const symbolSpinesRef = useRef<(Spine | null)[]>([]); // For gems (safe reveals)
    const mineSpinesRef = useRef<(Spine | null)[]>([]); // For mines (explosions)
    const isLoadedRef = useRef(false);
    const onLoadedRef = useRef(onLoaded);
    const onErrorRef = useRef(onError);
    const clickHandlerRef = useRef<((row: number, col: number) => void) | null>(null);
    const clicksEnabledRef = useRef(false); // Start with clicks disabled until game starts

    // Update refs when props change
    useEffect(() => {
        onLoadedRef.current = onLoaded;
        onErrorRef.current = onError;
    });

    useImperativeHandle(ref, () => ({
        playBackground: (animationName = MinesAnimations.BG_LOOP, loop = true) => {
            console.log(`Playing background animation: ${animationName}`);
            if (backgroundSpineRef.current && isLoadedRef.current) {
                try {
                    const spine = backgroundSpineRef.current;
                    spine.state.clearTracks();
                    spine.state.setAnimation(0, animationName, loop);
                } catch (err) {
                    console.error(`Failed to play background animation "${animationName}":`, err);
                }
            }
        },
        playCharacter: (animationName = MinesAnimations.CHARACTER_IDLE, loop = true) => {
            console.log(`Playing character animation: ${animationName}`);
            if (characterSpineRef.current && isLoadedRef.current) {
                try {
                    const spine = characterSpineRef.current;
                    // More thorough clearing
                    spine.state.clearTracks();
                    spine.state.clearListeners();
                    spine.skeleton.setToSetupPose();
                    spine.state.setAnimation(0, animationName, loop);
                } catch (err) {
                    console.error(`Failed to play character animation "${animationName}":`, err);
                }
            }
        },
        revealCell: (cellIndex: number, isMine: boolean, onComplete?: () => void) => {
            console.log(`Revealing cell ${cellIndex}, isMine: ${isMine}`);
            if (!isLoadedRef.current) return;

            const slot = gridSlotsRef.current[cellIndex];
            const symbol = symbolSpinesRef.current[cellIndex];

            if (slot && symbol) {
                try {
                    // Disable slot interactivity to prevent hover effects on revealed tiles
                    slot.eventMode = 'none';
                    slot.cursor = 'default';
                    
                    // Simple fade out animation (no scale changes)
                    const fadeOutDuration = 150;
                    const startTime = Date.now();
                    const originalAlpha = slot.alpha;
                    
                    const animateSlotOut = () => {
                        const elapsed = Date.now() - startTime;
                        const progress = Math.min(elapsed / fadeOutDuration, 1);
                        
                        // Fade out only (no scale changes)
                        slot.alpha = originalAlpha * (1 - progress);
                        
                        if (progress < 1) {
                            requestAnimationFrame(animateSlotOut);
                        } else {
                            // Hide slot and show symbol
                            slot.visible = false;
                            slot.alpha = originalAlpha; // Restore alpha for reset
                            
                            // Show symbol with simple fade-in animation (no scale changes)
                            symbol.visible = true;
                            symbol.alpha = 0;
                            
                            const symbolStartTime = Date.now();
                            const animateSymbolIn = () => {
                                const elapsed = Date.now() - symbolStartTime;
                                const progress = Math.min(elapsed / 200, 1);
                                
                                // Simple fade in (no scale changes)
                                const easeOut = 1 - Math.pow(1 - progress, 3);
                                symbol.alpha = easeOut;
                                
                                if (progress < 1) {
                                    requestAnimationFrame(animateSymbolIn);
                                }
                            };
                            animateSymbolIn();
                        }
                    };
                    animateSlotOut();

                    // Play reveal animation if available (after scale-in completes)
                    setTimeout(() => {
                        if (symbol.state.data.skeletonData.findAnimation("loop")) {
                            symbol.state.clearTracks();
                            symbol.state.setAnimation(0, "loop", true);
                        }
                    }, 200);

                    // Show character reaction for safe cell (diamond opened)
                    if (!isMine && characterSpineRef.current) {
                        const spine = characterSpineRef.current;
                        spine.state.clearTracks();
                        spine.state.clearListeners();
                        spine.skeleton.setToSetupPose();
                        spine.state.setAnimation(0, MinesAnimations.CHARACTER_LOOP_1, false); // Safe animation

                        // Return to idle after reaction
                        setTimeout(() => {
                            if (characterSpineRef.current) {
                                const spine = characterSpineRef.current;
                                spine.state.clearTracks();
                                spine.state.clearListeners();
                                spine.skeleton.setToSetupPose();
                                spine.state.setAnimation(0, MinesAnimations.CHARACTER_IDLE, true);
                            }
                        }, 2000);
                    }

                    // Fallback timeout in case animation doesn't complete
                    setTimeout(() => {
                        if (onComplete) onComplete();
                    }, 2000);
                } catch (err) {
                    console.error(`Failed to reveal cell ${cellIndex}:`, err);
                    if (onComplete) onComplete();
                }
            }
        },
        explodeMine: (cellIndex: number, onComplete?: () => void) => {
            console.log(`Exploding mine at cell ${cellIndex}`);
            if (!isLoadedRef.current) return;

            const slot = gridSlotsRef.current[cellIndex];
            const mineSymbol = mineSpinesRef.current[cellIndex];

            if (slot && mineSymbol) {
                try {
                    // Disable slot interactivity
                    slot.eventMode = 'none';
                    slot.cursor = 'default';
                    
                    // Hide the placeholder slot
                    slot.visible = false;

                    // Show the mine symbol and play explosion animation
                    mineSymbol.visible = true;
                    mineSymbol.state.clearTracks();
                    mineSymbol.state.setAnimation(0, "loop", true);

                    // Change character to mine reaction animation (mine explosion)
                    if (characterSpineRef.current) {
                        const spine = characterSpineRef.current;
                        spine.state.clearTracks();
                        spine.state.clearListeners();
                        spine.skeleton.setToSetupPose();
                        spine.state.setAnimation(0, MinesAnimations.CHARACTER_LOOP_2, false); // Mine animation for mine opened

                        // Return to idle after reaction (runs in background)
                        setTimeout(() => {
                            if (characterSpineRef.current) {
                                const spine = characterSpineRef.current;
                                spine.state.clearTracks();
                                spine.state.clearListeners();
                                spine.skeleton.setToSetupPose();
                                spine.state.setAnimation(0, MinesAnimations.CHARACTER_IDLE, true);
                            }
                        }, 1500);
                    }

                    // Call onComplete immediately after explosion starts (minimal delay for visual feedback)
                    // Animation continues in background while results show
                    setTimeout(() => {
                        if (onComplete) onComplete();
                    }, 20);
                } catch (err) {
                    console.error(`Failed to explode mine at cell ${cellIndex}:`, err);
                    if (onComplete) onComplete();
                }
            }
        },
        showWinReaction: (onComplete?: () => void) => {
            console.log("Showing win reaction");

            // Change character to happy reaction animation (successful cashout = win)
            if (characterSpineRef.current) {
                const spine = characterSpineRef.current;
                spine.state.clearTracks();
                spine.state.clearListeners();
                spine.skeleton.setToSetupPose();
                spine.state.setAnimation(0, MinesAnimations.CHARACTER_LOOP_3, false); // Cashout animation for cashout

                // Return to idle after reaction
                setTimeout(() => {
                    if (characterSpineRef.current) {
                        const spine = characterSpineRef.current;
                        spine.state.clearTracks();
                        spine.state.clearListeners();
                        spine.skeleton.setToSetupPose();
                        spine.state.setAnimation(0, MinesAnimations.CHARACTER_IDLE, true);
                    }
                    if (onComplete) onComplete();
                }, 2000);
            } else if (onComplete) {
                onComplete();
            }
        },
        resetGrid: () => {
            console.log("Resetting mines grid - complete reset for new game");

            // Show all placeholder slots and reset them to idle
            gridSlotsRef.current.forEach(slot => {
                if (slot) {
                    slot.visible = true;
                    slot.alpha = 1; // Reset to full opacity
                    // Scale remains unchanged - no scale animations used
                    slot.eventMode = 'static'; // Re-enable interactivity
                    slot.cursor = 'pointer'; // Restore pointer cursor
                    slot.state.clearTracks();
                    slot.state.clearListeners();
                    slot.skeleton.setToSetupPose();
                    slot.state.setAnimation(0, MinesAnimations.SLOT_IDLE, true);
                }
            });

            // Hide all symbols (both gems and mines) and reset them
            symbolSpinesRef.current.forEach(symbol => {
                if (symbol) {
                    symbol.visible = false;
                    symbol.alpha = 1; // Reset to full opacity
                    // Scale remains unchanged - no scale animations used
                    symbol.state.clearTracks();
                    symbol.state.clearListeners();
                    symbol.skeleton.setToSetupPose();
                }
            });

            mineSpinesRef.current.forEach(mine => {
                if (mine) {
                    mine.visible = false;
                    mine.alpha = 1; // Reset to full opacity
                    // Scale remains unchanged - no scale animations used
                    mine.state.clearTracks();
                    mine.state.clearListeners();
                    mine.skeleton.setToSetupPose();
                }
            });

            // Reset character to idle with thorough clearing
            if (characterSpineRef.current) {
                const spine = characterSpineRef.current;
                spine.state.clearTracks();
                spine.state.clearListeners();
                spine.skeleton.setToSetupPose();
                spine.state.setAnimation(0, MinesAnimations.CHARACTER_IDLE, true);
            }

            // Note: Click state is controlled by parent component based on game state
            // Don't automatically enable clicks here - let parent decide based on isPlaying

            console.log("Grid reset complete - all tiles closed, animations reset");
        },
        stopAll: () => {
            const allRefs = [
                backgroundSpineRef.current,
                characterSpineRef.current,
                ...gridSlotsRef.current,
                ...symbolSpinesRef.current,
                ...mineSpinesRef.current
            ];
            allRefs.forEach(spine => {
                if (spine && isLoadedRef.current) {
                    try {
                        spine.state.clearTracks();
                    } catch (err) {
                        console.warn("Failed to stop animation:", err);
                    }
                }
            });
        },
        setClickHandler: (handler: (row: number, col: number) => void) => {
            clickHandlerRef.current = handler;
        },
        setClicksEnabled: (enabled: boolean) => {
            clicksEnabledRef.current = enabled;
            console.log(`Clicks ${enabled ? 'enabled' : 'disabled'} for mines grid`);
        },
    }));

    useEffect(() => {
        let isMounted = true;

        const initializePIXISpine = async () => {
            try {
                console.log(`Initializing Mines Spine animation with grid size: ${gridSize}`);
                if (!containerRef.current) return;

                // Clean up existing app
                if (appRef.current) {
                    console.log("Cleaning up existing PIXI app");
                    appRef.current.destroy(true, true);
                    appRef.current = null;
                }

                // Clear all spine refs
                backgroundSpineRef.current = null;
                characterSpineRef.current = null;
                gridSlotsRef.current = [];
                symbolSpinesRef.current = [];
                mineSpinesRef.current = [];

                containerRef.current.innerHTML = "";
                isLoadedRef.current = false;

                // Get container dimensions with responsive sizing
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = containerRef.current.clientHeight;
                const isMobile = containerWidth < 768; // md breakpoint
                const isVerySmall = containerWidth < 375; // Very small devices like iPhone SE
                const appWidth = containerWidth;
                const appHeight = containerHeight;

                // Create PIXI Application with high quality settings
                const app = new PIXI.Application();
// ... (rest of the code remains the same)
                await app.init({
                    width: appWidth,
                    height: appHeight,
                    backgroundColor: 0x1a1a2e,
                    antialias: true,
                    resolution: window.devicePixelRatio || 1, // Handle high DPI displays
                    autoDensity: true, // Automatically adjust for device pixel ratio
                    resizeTo: containerRef.current, // Auto-resize to container for responsive behavior
                });

                // Add responsive canvas styling
                app.canvas.style.width = '100%';
                app.canvas.style.height = '100%';
                app.canvas.style.display = 'block';
                app.canvas.style.borderRadius = '0.8rem';

                appRef.current = app;
                containerRef.current.appendChild(app.canvas);

                // Load all Spine assets
                await PIXI.Assets.add([
                    { alias: "mines-bg-skeleton", src: MINES_BG_JSON },
                    { alias: "mines-bg-atlas", src: MINES_BG_ATLAS },
                    { alias: "zoggy-skeleton", src: ZOGGY_JSON },
                    { alias: "zoggy-atlas", src: ZOGGY_ATLAS },
                    { alias: "mines-slot-skeleton", src: MINES_SLOT_JSON },
                    { alias: "mines-slot-atlas", src: MINES_SLOT_ATLAS },
                    { alias: "symbol2-skeleton", src: SYMBOL_2_JSON },
                    { alias: "symbol2-atlas", src: SYMBOL_2_ATLAS },
                    { alias: "symbol4-skeleton", src: SYMBOL_4_JSON },
                    { alias: "symbol4-atlas", src: SYMBOL_4_ATLAS },
                ]);

                await PIXI.Assets.load([
                    "mines-bg-skeleton", "mines-bg-atlas",
                    "zoggy-skeleton", "zoggy-atlas",
                    "mines-slot-skeleton", "mines-slot-atlas",
                    "symbol2-skeleton", "symbol2-atlas",
                    "symbol4-skeleton", "symbol4-atlas"
                ]);

                if (!isMounted) return;

                console.log("All mines assets loaded successfully");

                // Create background spine (G2_BG) with responsive scaling
                const backgroundSpine = Spine.from({
                    skeleton: "mines-bg-skeleton",
                    atlas: "mines-bg-atlas",
                    scale: 1,
                    autoUpdate: true,
                });
                backgroundSpineRef.current = backgroundSpine;

                // Responsive background scaling - use full height
                const bgBounds = backgroundSpine.getBounds();
                const scaleX = appWidth / bgBounds.width;
                const scaleY = appHeight / bgBounds.height;
                
                let fitScale;
                if (isMobile) {
                    // Mobile (including very small): Use full background coverage
                    fitScale = Math.max(scaleX, scaleY);
                } else {
                    // Desktop: Use full height scaling
                    fitScale = Math.max(scaleX, scaleY) * 0.95;
                }

                backgroundSpine.scale.set(fitScale);
                backgroundSpine.x = appWidth / 2;
                backgroundSpine.y = appHeight / 2;
                app.stage.addChild(backgroundSpine);

                // Create character spine (Zoggy) - hide on mobile
                const characterSpine = Spine.from({
                    skeleton: "zoggy-skeleton",
                    atlas: "zoggy-atlas",
                    scale: 0.8,
                    autoUpdate: true,
                });
                characterSpineRef.current = characterSpine;
                
                if (isMobile) {
                    // Hide Zoggy completely on mobile and very small devices
                    characterSpine.visible = false;
                } else {
                    // Desktop positioning
                    characterSpine.x = appWidth * 0.85;
                    characterSpine.y = appHeight * 0.65;
                    characterSpine.visible = true;
                }
                
                app.stage.addChild(characterSpine);

                // Create grid of slots and symbols
                const { rows, cols, totalCells } = getGridDimensions(gridSize);
                console.log(`Creating grid: ${rows}x${cols} = ${totalCells} cells`);

                // Responsive grid positioning - center the grid and use full space on mobile
                let gridStartX, gridStartY, availableWidthPercent, availableHeightPercent;
                
                if (isVerySmall) {
                    // Very small devices (iPhone SE): More centered and compact positioning
                    gridStartX = appWidth * 0.05; // Larger margin for iPhone SE
                    gridStartY = appHeight * 0.10; // More top margin for iPhone SE
                    availableWidthPercent = 0.90; // Use 80% of screen width for iPhone SE
                    availableHeightPercent = 0.80; // Use 70% of screen height for iPhone SE
                } else if (isMobile) {
                    // Mobile: Center grid and use full screen space since no Zoggy
                    gridStartX = appWidth * 0.05; // Small margin from left
                    gridStartY = appHeight * 0.08; // Start from top with small margin
                    availableWidthPercent = 0.9; // Use 90% of screen width
                    availableHeightPercent = 0.85; // Use 85% of screen height
                } else {
                    // Desktop: Original positioning with Zoggy on right
                    gridStartX = appWidth * 0.27;
                    gridStartY = appHeight * 0.1;
                    availableWidthPercent = 0.45;
                    availableHeightPercent = 0.8;
                }

                // Responsive gaps between slots - adjust for device size
                let gapX, gapY;
                if (isVerySmall) {
                    // Very small devices: Minimal gaps to fit more content
                    gapX = 3;
                    gapY = 3;
                } else if (isMobile) {
                    // Mobile: Reasonable gaps for touch interaction
                    gapX = 3;
                    gapY = 3;
                } else {
                    // Desktop: Larger gaps for better visual separation
                    gapX = 5;
                    gapY = 15;
                }
                
                const availableWidth = (appWidth * availableWidthPercent) - (gapX * (cols - 1));
                const availableHeight = (appHeight * availableHeightPercent) - (gapY * (rows - 1));

                // Calculate cell size based on available space
                const cellWidth = availableWidth / cols;
                const cellHeight = availableHeight / rows;

                // Responsive scale calculation - adjust for larger grids and device size
                let baseScale, scaleFactor;
                
                if (isVerySmall) {
                    // Very small devices (iPhone SE): Much more aggressive scaling
                    baseScale = 0.185;
                    if (totalCells > 36) { // 6x6 or larger
                        scaleFactor = Math.max(0.08, baseScale * (4.3 / Math.max(rows, cols)));
                    } else if (totalCells >= 25) { // 5x5
                        scaleFactor = Math.max(0.10, baseScale * (4.3 / Math.max(rows, cols)));
                    } else {
                        scaleFactor = Math.max(0.12, baseScale * (4.3 / Math.max(rows, cols)));
                    }
                } else if (isMobile) {
                    // Regular mobile: Moderate scaling
                    baseScale = 0.175;
                    if (totalCells > 36) { // 6x6 or larger
                        scaleFactor = Math.max(0.08, baseScale * (5 / Math.max(rows, cols)));
                    } else if (totalCells >= 25) { // 5x5
                        scaleFactor = Math.max(0.10, baseScale * (5 / Math.max(rows, cols)));
                    } else {
                        scaleFactor = Math.max(0.15, baseScale * (5 / Math.max(rows, cols)));
                    }
                } else {
                    // Desktop scaling remains the same
                    baseScale = 0.25;
                    scaleFactor = Math.max(0.15, Math.min(1.0, baseScale * (5 / Math.max(rows, cols))));
                }

                console.log(`Grid positioning: startX=${gridStartX}, startY=${gridStartY}, cellWidth=${cellWidth}, cellHeight=${cellHeight}, gapX=${gapX}, gapY=${gapY}, scale=${scaleFactor}`);

                gridSlotsRef.current = Array(totalCells).fill(null);
                symbolSpinesRef.current = Array(totalCells).fill(null);
                mineSpinesRef.current = Array(totalCells).fill(null);

                for (let i = 0; i < totalCells; i++) {
                    const row = Math.floor(i / cols);
                    const col = i % cols;

                    // Position with explicit gaps
                    const x = gridStartX + (col * (cellWidth + gapX)) + (cellWidth / 2);
                    const y = gridStartY + (row * (cellHeight + gapY)) + (cellHeight / 2);

                    // Create placeholder slot
                    const slot = Spine.from({
                        skeleton: "mines-slot-skeleton",
                        atlas: "mines-slot-atlas",
                        scale: scaleFactor, // Responsive scale based on grid size
                        autoUpdate: true,
                    });
                    slot.x = x;
                    slot.y = y;
                    slot.visible = true;

                    // Make slot interactive and clickable with smooth feedback
                    slot.eventMode = 'static';
                    slot.cursor = 'pointer';
                    
                    // Store original scale for animations
                    const originalScale = slot.scale.x;
                    // Store original scale on the slot object for reset purposes
                    (slot as any).originalScaleFactor = scaleFactor;
                    
                    // Hover effect - opacity change instead of scale
                    slot.on('pointerover', () => {
                        if (slot.visible && clicksEnabledRef.current) {
                            slot.alpha = 0.8; // Slight fade for hover feedback
                        }
                    });
                    
                    slot.on('pointerout', () => {
                        if (slot.visible) {
                            slot.alpha = 1; // Restore full opacity
                        }
                    });
                    
                    // Click effect - opacity flash instead of scale animation
                    slot.on('pointerdown', () => {
                        if (clickHandlerRef.current && slot.visible && clicksEnabledRef.current) {
                            // Immediate visual feedback - opacity flash
                            slot.alpha = 0.6;
                            
                            // Restore opacity
                            setTimeout(() => {
                                if (slot.visible) {
                                    slot.alpha = 0.8; // Hover state
                                }
                            }, 50);
                            
                            // Call handler immediately for instant response (especially for bombs)
                            setTimeout(() => {
                                if (clickHandlerRef.current) {
                                    clickHandlerRef.current(row, col);
                                }
                            }, 20);
                        }
                    });

                    gridSlotsRef.current[i] = slot;
                    app.stage.addChild(slot);

                    // Create diamond symbol (will be used for safe reveals)
                    const symbol = Spine.from({
                        skeleton: "symbol4-skeleton", // Use diamond symbol for safe cells
                        atlas: "symbol4-atlas",
                        scale: scaleFactor, // Match slot scale
                        autoUpdate: true,
                    });
                    symbol.x = x;
                    symbol.y = y;
                    symbol.visible = false;
                    symbolSpinesRef.current[i] = symbol;
                    app.stage.addChild(symbol);

                    // Create mine symbol (will be used for mine explosions)
                    const mineSymbol = Spine.from({
                        skeleton: "symbol2-skeleton", // Use mine symbol for explosions
                        atlas: "symbol2-atlas",
                        scale: scaleFactor, // Match slot scale
                        autoUpdate: true,
                    });
                    mineSymbol.x = x;
                    mineSymbol.y = y;
                    mineSymbol.visible = false;
                    mineSpinesRef.current[i] = mineSymbol;
                    app.stage.addChild(mineSymbol);
                }

                // Set all to setup pose initially
                const allSpines = [
                    backgroundSpine,
                    characterSpine,
                    ...gridSlotsRef.current.filter(Boolean),
                    ...symbolSpinesRef.current.filter(Boolean),
                    ...mineSpinesRef.current.filter(Boolean)
                ];
                allSpines.forEach(spine => {
                    if (spine) {
                        spine.skeleton.setToSetupPose();
                        spine.state.clearTracks();
                    }
                });

                isLoadedRef.current = true;

                // Start idle animations
                backgroundSpine.state.setAnimation(0, MinesAnimations.BG_LOOP, true);
                characterSpine.state.setAnimation(0, MinesAnimations.CHARACTER_IDLE, true);

                // Start slot idle animations
                gridSlotsRef.current.forEach(slot => {
                    if (slot) {
                        slot.state.setAnimation(0, MinesAnimations.SLOT_IDLE, true);
                    }
                });

                if (onLoadedRef.current) {
                    onLoadedRef.current();
                }
            } catch (err) {
                if (isMounted) {
                    const error = err instanceof Error ? err : new Error("Failed to initialize PIXI spine for mines");
                    console.error("PIXI spine initialization error:", error);
                    if (onErrorRef.current) {
                        onErrorRef.current(error);
                    }
                }
            }
        };

        initializePIXISpine();

        return () => {
            isMounted = false;

            if (appRef.current) {
                appRef.current.destroy(true, true);
                appRef.current = null;
            }

            backgroundSpineRef.current = null;
            characterSpineRef.current = null;
            gridSlotsRef.current = [];
            symbolSpinesRef.current = [];
            mineSpinesRef.current = [];
            isLoadedRef.current = false;
        };
    }, [gridSize]); // Re-initialize when grid size changes

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        />
    );
});

SpineMinesAnimation.displayName = "SpineMinesAnimation";

export default SpineMinesAnimation;
