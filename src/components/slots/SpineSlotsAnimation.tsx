import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as PIXI from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export interface SpineSlotsAnimationHandle {
    playBackground: (animationName?: string, loop?: boolean) => void;
    playCharacter: (animationName?: string, loop?: boolean) => void;
    //playSlotMachine: (animationName?: string, loop?: boolean) => void;
    playReel: (animationName?: string, loop?: boolean, onComplete?: () => void) => void;
    startSpin: () => void;
    // Individual reel controls
    startReel1: () => void;
    startReel2: () => void;
    startReel3: () => void;
    stopReel1: () => void;
    stopReel2: () => void;
    stopReel3: () => void;
    playSpinWithResult: (symbolsGrid: string[], onComplete?: () => void) => void;
    handleError: () => void;
    stopAll: () => void;
}

interface SpineSlotsAnimationProps {
    width?: number;
    height?: number;
    onLoaded?: () => void;
    onError?: (error: Error) => void;
}

// Asset paths for slots Spine animations
const SLOTS_BG_JSON = "/assets/Meme Slot/Animations/Export_animation_Meme_slot/G1_BG.json";
const SLOTS_BG_ATLAS = "/assets/Meme Slot/Animations/Export_animation_Meme_slot/G1_BG.atlas";

const ZOGGY_JSON = "/assets/Meme Slot/Animations/Export_animation_Meme_slot/Zoggy.json";
const ZOGGY_ATLAS = "/assets/Meme Slot/Animations/Export_animation_Meme_slot/Zoggy.atlas";

const SLOTS_MACHINE_JSON = "/assets/Meme Slot/Animations/Export_animation_Meme_slot/G1_slot.json";
const SLOTS_MACHINE_ATLAS = "/assets/Meme Slot/Animations/Export_animation_Meme_slot/G1_slot.atlas";
const REEL_JSON = "/assets/Meme Slot/Animations/Export_animation_Meme_slot/G1_reel.json";
const REEL_ATLAS = "/assets/Meme Slot/Animations/Export_animation_Meme_slot/G1_reel.atlas";

// Animation mapping for slots
export const SlotsAnimations = {
    // Background animations (G1_BG) - Available: idle, idle2
    BG_IDLE: "idle",
    BG_IDLE_2: "idle2",

    // Character animations (Zoggy) - Available: idle_1, idle_2
    CHARACTER_IDLE: "idle_1",
    CHARACTER_IDLE_2: "idle_2",

    // Reel animations (G1_reel) - Available: loop only
    REEL_LOOP: "loop",

    // Result animations (G1_slot) - Complete flow
    // Start animations
    START_1: "start_1",
    START_2: "start_2",
    START_3: "start_3",

    // Landing animations
    LANDING_1: "landing_1",
    LANDING_2: "landing_2",
    LANDING_3: "landing_3",

    // Idle animations (after landing)
    IDLE_1: "idle_1",
    IDLE_2: "idle_2",
    IDLE_3: "idle_3",

    // Win animations (for winning combinations)
    WIN_1: "win_1",
    WIN_2: "win_2",
    WIN_3: "win_3",

} as const;

// Helper function to map symbol names to skin numbers (1-10)
// Correct mapping based on actual skin testing results
const getSkinNumber = (symbolName: string): number => {
    const symbolMap: Record<string, number> = {
        "doge": 1,    // skin 1 = DOGE coin (green)
        "pepe": 6,    // skin 6 = PEPE coin (green)
        "bonk": 3,    // skin 3 = GONG coin (orange) - assuming this is bonk
        "shiba": 7,   // skin 7 = SHIBA coin (red)
        "zoggy": 10,  // skin 10 = ZOGGY character (should be the actual character)
        "floki": 5,   // skin 5 = ZOGGY character (golden) - might be floki
        "wif": 9,     // skin 9 = WIF coin (pink)
        "brett": 4,   // skin 4 = BRETT coin (blue)
        "sol": 8,     // skin 8 = SOLANA coin (purple)
        "default": 2  // skin 2 = 1000X JACKPOT
    };
    return symbolMap[symbolName] || symbolMap["default"];
};

const SpineSlotsAnimation = forwardRef<SpineSlotsAnimationHandle, SpineSlotsAnimationProps>(({ width, height, onLoaded, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const backgroundSpineRef = useRef<Spine | null>(null);
    const characterSpineRef = useRef<Spine | null>(null);
    const slotMachineSpineRef = useRef<Spine | null>(null);
    const reel1SpineRef = useRef<Spine | null>(null);
    const reel2SpineRef = useRef<Spine | null>(null);
    const reel3SpineRef = useRef<Spine | null>(null);
    // Result slot instances for 3x3 grid (9 total)
    const resultSlotsRef = useRef<(Spine | null)[]>(Array(9).fill(null));
    const isLoadedRef = useRef(false);
    const isSpinningRef = useRef(false);
    const hasErrorRef = useRef(false);
    const isProcessingResultRef = useRef(false); // Prevent multiple result processing
    const onLoadedRef = useRef(onLoaded);
    const onErrorRef = useRef(onError);

    // Update refs when props change
    useEffect(() => {
        onLoadedRef.current = onLoaded;
        onErrorRef.current = onError;
    });

    useImperativeHandle(ref, () => ({
        playBackground: (animationName = SlotsAnimations.BG_IDLE, loop = true) => {
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
        playCharacter: (animationName = SlotsAnimations.CHARACTER_IDLE, loop = true) => {
            console.log(`Playing character animation: ${animationName}`);
            if (characterSpineRef.current && isLoadedRef.current) {
                try {
                    const spine = characterSpineRef.current;
                    spine.state.clearTracks();
                    spine.state.setAnimation(0, animationName, loop);
                } catch (err) {
                    console.error(`Failed to play character animation "${animationName}":`, err);
                }
            }
        },

        playReel: (animationName = SlotsAnimations.REEL_LOOP, loop = false, onComplete?: () => void) => {
            console.log(`Playing reel animation: ${animationName}`);
            if (isLoadedRef.current) {
                // Play animation on all 3 reels
                [reel1SpineRef, reel2SpineRef, reel3SpineRef].forEach((reelRef, index) => {
                    if (reelRef.current) {
                        try {
                            const spine = reelRef.current;
                            spine.state.clearTracks();
                            const trackEntry = spine.state.setAnimation(0, animationName, loop);

                            // Only call onComplete for the last reel
                            if (trackEntry && onComplete && !loop && index === 2) {
                                trackEntry.listener = {
                                    complete: () => {
                                        console.log(`Reel animation ${animationName} completed`);
                                        onComplete();
                                    },
                                };
                            }
                        } catch (err) {
                            console.error(`Failed to play reel ${index + 1} animation "${animationName}":`, err);
                        }
                    }
                });
            }
        },
        startSpin: () => {
            console.log("Starting all reels spin animation (waiting for server result)");
            if (!isLoadedRef.current || isSpinningRef.current) {
                console.log("Cannot start spin - already loaded:", isLoadedRef.current, "already spinning:", isSpinningRef.current);
                return;
            }

            isSpinningRef.current = true;
            hasErrorRef.current = false; // Reset error state
            isProcessingResultRef.current = false; // Reset processing flag for new spin

            // Hide all result slots and clear their animations
            resultSlotsRef.current.forEach(slot => {
                if (slot) {
                    slot.visible = false;
                    slot.state.clearTracks();
                }
            });

            // Start all reels using individual functions
            console.log("Starting all reel animations...");

            // Use the individual reel start functions
            if (isLoadedRef.current) {
                // Start each reel individually
                if (reel1SpineRef.current) {
                    reel1SpineRef.current.state.clearTracks();
                    reel1SpineRef.current.visible = true;
                    reel1SpineRef.current.state.setAnimation(0, SlotsAnimations.REEL_LOOP, true);
                    console.log("Reel 1 started spinning");
                }

                if (reel2SpineRef.current) {
                    reel2SpineRef.current.state.clearTracks();
                    reel2SpineRef.current.visible = true;
                    reel2SpineRef.current.state.setAnimation(0, SlotsAnimations.REEL_LOOP, true);
                    console.log("Reel 2 started spinning");
                }

                if (reel3SpineRef.current) {
                    reel3SpineRef.current.state.clearTracks();
                    reel3SpineRef.current.visible = true;
                    reel3SpineRef.current.state.setAnimation(0, SlotsAnimations.REEL_LOOP, true);
                    console.log("Reel 3 started spinning");
                }
            }
        },

        // Individual reel start functions
        startReel1: () => {
            console.log("Starting reel 1");
            if (!isLoadedRef.current || !reel1SpineRef.current) {
                console.log("Cannot start reel 1 - not loaded or ref missing");
                return;
            }

            try {
                reel1SpineRef.current.state.clearTracks();
                reel1SpineRef.current.visible = true;
                reel1SpineRef.current.state.setAnimation(0, SlotsAnimations.REEL_LOOP, true);
                console.log("Reel 1 started successfully");
            } catch (err) {
                console.error("Failed to start reel 1:", err);
            }
        },

        startReel2: () => {
            console.log("Starting reel 2");
            if (!isLoadedRef.current || !reel2SpineRef.current) {
                console.log("Cannot start reel 2 - not loaded or ref missing");
                return;
            }

            try {
                reel2SpineRef.current.state.clearTracks();
                reel2SpineRef.current.visible = true;
                reel2SpineRef.current.state.setAnimation(0, SlotsAnimations.REEL_LOOP, true);
                console.log("Reel 2 started successfully");
            } catch (err) {
                console.error("Failed to start reel 2:", err);
            }
        },

        startReel3: () => {
            console.log("Starting reel 3");
            if (!isLoadedRef.current || !reel3SpineRef.current) {
                console.log("Cannot start reel 3 - not loaded or ref missing");
                return;
            }

            try {
                reel3SpineRef.current.state.clearTracks();
                reel3SpineRef.current.visible = true;
                reel3SpineRef.current.state.setAnimation(0, SlotsAnimations.REEL_LOOP, true);
                console.log("Reel 3 started successfully");
            } catch (err) {
                console.error("Failed to start reel 3:", err);
            }
        },

        // Individual reel stop functions
        stopReel1: () => {
            console.log("Stopping reel 1");
            if (!reel1SpineRef.current) {
                console.log("Cannot stop reel 1 - ref missing");
                return;
            }

            try {
                reel1SpineRef.current.state.clearTracks();
                reel1SpineRef.current.visible = false;
                console.log("Reel 1 stopped successfully");
            } catch (err) {
                console.error("Failed to stop reel 1:", err);
            }
        },

        stopReel2: () => {
            console.log("Stopping reel 2");
            if (!reel2SpineRef.current) {
                console.log("Cannot stop reel 2 - ref missing");
                return;
            }

            try {
                reel2SpineRef.current.state.clearTracks();
                reel2SpineRef.current.visible = false;
                console.log("Reel 2 stopped successfully");
            } catch (err) {
                console.error("Failed to stop reel 2:", err);
            }
        },

        stopReel3: () => {
            console.log("Stopping reel 3");
            if (!reel3SpineRef.current) {
                console.log("Cannot stop reel 3 - ref missing");
                return;
            }

            try {
                reel3SpineRef.current.state.clearTracks();
                reel3SpineRef.current.visible = false;
                console.log("Reel 3 stopped successfully");
            } catch (err) {
                console.error("Failed to stop reel 3:", err);
            }
        },
        playSpinWithResult: (symbolsGrid: string[], onComplete?: () => void) => {
            console.log("Server result received, stopping reels with result:", symbolsGrid);

            // Check if we're already processing a result
            if (isProcessingResultRef.current) {
                console.log("Already processing result, ignoring duplicate call");
                return;
            }

            if (!isLoadedRef.current || hasErrorRef.current || !isSpinningRef.current) {
                console.log("Cannot show results - animation not loaded, error occurred, or not spinning");
                return;
            }

            // Mark that we're processing a result
            isProcessingResultRef.current = true;
            console.log("Starting result processing - blocking further calls");

            // Pre-apply all result symbols while reels are still spinning
            symbolsGrid.forEach((symbol, index) => {
                const slot = resultSlotsRef.current[index];
                if (slot && symbol) {
                    const skinNumber = getSkinNumber(symbol);
                    // Determine landing animation based on row position
                    let landingAnimation;
                    const row = Math.floor(index / 3);
                    if (row === 0) landingAnimation = SlotsAnimations.LANDING_1; // Top row
                    else if (row === 1) landingAnimation = SlotsAnimations.LANDING_2; // Middle row
                    else landingAnimation = SlotsAnimations.LANDING_3; // Bottom row

                    try {
                        slot.skeleton.setSkinByName(skinNumber.toString());
                        slot.skeleton.setSlotsToSetupPose();

                        // Use start animation first, then queue landing animation
                        const startAnimation = row === 0 ? SlotsAnimations.START_1 :
                            row === 1 ? SlotsAnimations.START_2 :
                                SlotsAnimations.START_3;

                        slot.state.setAnimation(0, startAnimation, false);
                        // Queue landing animation to play after start (final state)
                        slot.state.addAnimation(0, landingAnimation, false, 0);

                        slot.visible = false; // Keep hidden until reveal
                        console.log(`Pre-applied skin ${skinNumber} to slot ${index} with animation sequence: ${startAnimation} -> ${landingAnimation} for symbol ${symbol}`);
                    } catch (err) {
                        console.error(`Failed to pre-apply skin ${skinNumber} to slot ${index}:`, err);
                    }
                }
            });

            const minSpinTime = 1000;

            // Stop reel 1 and show column 1 results using individual function
            setTimeout(() => {
                // Use individual stop function for reel 1
                if (reel1SpineRef.current && reel1SpineRef.current.visible) {
                    try {
                        reel1SpineRef.current.state.clearTracks();
                        reel1SpineRef.current.visible = false;
                        console.log("Reel 1 stopped using individual control");
                    } catch (err) {
                        console.error("Failed to stop reel 1:", err);
                    }
                }

                // Show pre-applied results for column 1 (cells 0, 3, 6)
                [0, 3, 6].forEach(cellIndex => {
                    const slot = resultSlotsRef.current[cellIndex];
                    if (slot && symbolsGrid[cellIndex]) {
                        slot.visible = true;
                        console.log(`Showing pre-applied slot ${cellIndex} for symbol ${symbolsGrid[cellIndex]}`);
                    }
                });
            }, minSpinTime);

            // Stop reel 2 and show column 2 results using individual function
            setTimeout(() => {
                // Use individual stop function for reel 2
                if (reel2SpineRef.current && reel2SpineRef.current.visible) {
                    try {
                        reel2SpineRef.current.state.clearTracks();
                        reel2SpineRef.current.visible = false;
                        console.log("Reel 2 stopped using individual control");
                    } catch (err) {
                        console.error("Failed to stop reel 2:", err);
                    }
                }

                // Show pre-applied results for column 2 (cells 1, 4, 7)
                [1, 4, 7].forEach(cellIndex => {
                    const slot = resultSlotsRef.current[cellIndex];
                    if (slot && symbolsGrid[cellIndex]) {
                        slot.visible = true;
                        console.log(`Showing pre-applied slot ${cellIndex} for symbol ${symbolsGrid[cellIndex]}`);
                    }
                });
            }, minSpinTime + 300);

            // Stop reel 3 and show column 3 results using individual function
            setTimeout(() => {
                // Use individual stop function for reel 3
                if (reel3SpineRef.current && reel3SpineRef.current.visible) {
                    try {
                        reel3SpineRef.current.state.clearTracks();
                        reel3SpineRef.current.visible = false;
                        console.log("Reel 3 stopped using individual control");
                    } catch (err) {
                        console.error("Failed to stop reel 3:", err);
                    }
                }

                // Show pre-applied results for column 3 (cells 2, 5, 8)
                [2, 5, 8].forEach(cellIndex => {
                    const slot = resultSlotsRef.current[cellIndex];
                    if (slot && symbolsGrid[cellIndex]) {
                        slot.visible = true;
                        console.log(`Showing pre-applied slot ${cellIndex} for symbol ${symbolsGrid[cellIndex]}`);
                    }
                });

                isSpinningRef.current = false;
                isProcessingResultRef.current = false; // Reset processing flag
                console.log("Result processing completed - ready for next spin");

                if (onComplete) {
                    onComplete();
                }
            }, minSpinTime + 600);
        },
        handleError: () => {
            console.log("Handling animation error - stopping reels without showing results");

            // Mark that we have an error
            hasErrorRef.current = true;

            // Stop all reel animations immediately using individual controls
            console.log("Stopping all reels due to error");

            // Stop reel 1
            if (reel1SpineRef.current) {
                try {
                    reel1SpineRef.current.state.clearTracks();
                    reel1SpineRef.current.visible = false;
                    console.log("Reel 1 stopped due to error");
                } catch (err) {
                    console.warn("Failed to stop reel 1 on error:", err);
                }
            }

            // Stop reel 2
            if (reel2SpineRef.current) {
                try {
                    reel2SpineRef.current.state.clearTracks();
                    reel2SpineRef.current.visible = false;
                    console.log("Reel 2 stopped due to error");
                } catch (err) {
                    console.warn("Failed to stop reel 2 on error:", err);
                }
            }

            // Stop reel 3
            if (reel3SpineRef.current) {
                try {
                    reel3SpineRef.current.state.clearTracks();
                    reel3SpineRef.current.visible = false;
                    console.log("Reel 3 stopped due to error");
                } catch (err) {
                    console.warn("Failed to stop reel 3 on error:", err);
                }
            }

            // Hide all result slots (don't show fake results)
            resultSlotsRef.current.forEach(slot => {
                if (slot) {
                    slot.visible = false;
                    slot.state.clearTracks();
                }
            });

            // Reset spinning state
            isSpinningRef.current = false;
            isProcessingResultRef.current = false; // Reset processing flag on error
        },
        stopAll: () => {
            [backgroundSpineRef, characterSpineRef, slotMachineSpineRef, reel1SpineRef, reel2SpineRef, reel3SpineRef].forEach(ref => {
                if (ref.current && isLoadedRef.current) {
                    try {
                        ref.current.state.clearTracks();
                    } catch (err) {
                        console.warn("Failed to stop animation:", err);
                    }
                }
            });
        },
    }));

    useEffect(() => {
        let isMounted = true;

        const initializePIXISpine = async () => {
            try {
                if (!containerRef.current) return;

                // Clean up existing app
                if (appRef.current) {
                    appRef.current.destroy(true, true);
                    appRef.current = null;
                }

                // Clear all spine refs
                backgroundSpineRef.current = null;
                characterSpineRef.current = null;
                slotMachineSpineRef.current = null;
                reel1SpineRef.current = null;
                reel2SpineRef.current = null;
                reel3SpineRef.current = null;
                resultSlotsRef.current = Array(9).fill(null);

                containerRef.current.innerHTML = "";
                isLoadedRef.current = false;

                // Get container dimensions for full size
                const containerRect = containerRef.current.getBoundingClientRect();
                const appWidth = width || containerRect.width || 800;
                const appHeight = height || containerRect.height || 600;

                // Create PIXI Application with high quality settings
                const app = new PIXI.Application();
                await app.init({
                    width: appWidth,
                    height: appHeight,
                    backgroundColor: 0x1a1a2e,
                    antialias: true,
                    resolution: window.devicePixelRatio || 1, // Handle high DPI displays
                    autoDensity: true, // Automatically adjust for device pixel ratio
                    resizeTo: containerRef.current, // Auto-resize to container for responsive behavior
                });

                // Add responsive canvas styling for mobile
                app.canvas.style.width = '100%';
                app.canvas.style.height = '100%';
                app.canvas.style.display = 'block';
                app.canvas.style.borderRadius = '0.8rem';

                appRef.current = app;
                containerRef.current.appendChild(app.canvas);

                // Load all Spine assets
                await PIXI.Assets.add([
                    { alias: "slots-bg-skeleton", src: SLOTS_BG_JSON },
                    { alias: "slots-bg-atlas", src: SLOTS_BG_ATLAS },
                    { alias: "zoggy-skeleton", src: ZOGGY_JSON },
                    { alias: "zoggy-atlas", src: ZOGGY_ATLAS },
                    { alias: "slots-machine-skeleton", src: SLOTS_MACHINE_JSON },
                    { alias: "slots-machine-atlas", src: SLOTS_MACHINE_ATLAS },
                    { alias: "reel-skeleton", src: REEL_JSON },
                    { alias: "reel-atlas", src: REEL_ATLAS },
                ]);

                await PIXI.Assets.load([
                    "slots-bg-skeleton", "slots-bg-atlas",
                    "zoggy-skeleton", "zoggy-atlas",
                    "slots-machine-skeleton", "slots-machine-atlas",
                    "reel-skeleton", "reel-atlas"
                ]);

                if (!isMounted) return;

                console.log("All slots assets loaded successfully");

                // Determine device size based on window width (not container width)
                const windowWidth = window.innerWidth;
                const isMobile = windowWidth < 768; // md breakpoint
                const isVerySmall = windowWidth <= 375; // Very small devices
                const isMedium = windowWidth < 420;
                // Create background spine (G1_BG) - fit to container like object-fit: contain
                const backgroundSpine = Spine.from({
                    skeleton: "slots-bg-skeleton",
                    atlas: "slots-bg-atlas",
                    scale: 1,
                    autoUpdate: true,
                });
                backgroundSpineRef.current = backgroundSpine;

                // Calculate scale to fit container with mobile-specific adjustments
                const bgBounds = backgroundSpine.getBounds();
                const scaleX = appWidth / bgBounds.width;
                const scaleY = appHeight / bgBounds.height;

                let fitScale;
                if (isMobile) {
                    // Mobile: Use cover-like behavior to fill more of the screen
                    fitScale = Math.max(scaleX, scaleY) * 0.9;

                } else {
                    // Desktop: Use contain behavior
                    fitScale = Math.min(scaleX, scaleY) * 0.9;
                }

                backgroundSpine.scale.set(fitScale);
                backgroundSpine.x = isMobile ? appWidth / 1.68 : appWidth / 2;
                backgroundSpine.y = isMobile ? appHeight / 1.9 : appHeight / 2;
                app.stage.addChild(backgroundSpine);

                // // Create slot machine spine (G1_slot) - positioned in center-left
                // const slotMachineSpine = Spine.from({
                //     skeleton: "slots-machine-skeleton",
                //     atlas: "slots-machine-atlas",
                //     scale: 0.5, // Reduced scale
                //     autoUpdate: true,
                // });
                // slotMachineSpineRef.current = slotMachineSpine;
                // slotMachineSpine.x = appWidth * 0.4; // Move to center-left
                // slotMachineSpine.y = appHeight / 2.2; // Aligned with background
                // app.stage.addChild(slotMachineSpine);

                // Create 3 reel spines (G1_reel) - positioned as 3 columns with responsive scaling
                let reelScale, reelY, reelPositions;

                if (isVerySmall) {
                    // Very small devices: Much smaller scale and tighter positioning
                    reelScale = 0.41;
                    reelY = appHeight / 2;
                    reelPositions = {
                        left: appWidth * 0.17,
                        center: appWidth * 0.50,
                        right: appWidth * 0.83
                    };
                }
                else if(isMedium){
                    reelScale = 0.445;
                    reelY = appHeight / 2;
                    reelPositions = {
                        left: appWidth * 0.17,
                        center: appWidth * 0.50,
                        right: appWidth * 0.83
                    };
                 }                   
                 else if (isMobile) {
                    // Regular mobile: Moderate scaling
                    reelScale = 0.445;
                    reelY = appHeight / 2;
                    reelPositions = {
                        left: appWidth * 0.19,
                        center: appWidth * 0.50,
                        right: appWidth * 0.81
                    };
                } else {
                    // Desktop: Original scaling
                    reelScale = 0.59;
                    reelY = appHeight / 2.15;
                    reelPositions = {
                        left: appWidth * 0.31,
                        center: appWidth * 0.4580,
                        right: appWidth * 0.6050
                    };
                }

                // Reel 1 (Left)
                const reel1Spine = Spine.from({
                    skeleton: "reel-skeleton",
                    atlas: "reel-atlas",
                    scale: reelScale,
                    autoUpdate: true,
                });
                reel1SpineRef.current = reel1Spine;
                reel1Spine.x = reelPositions.left;
                reel1Spine.y = reelY;
                app.stage.addChild(reel1Spine);

                // Reel 2 (Center)
                const reel2Spine = Spine.from({
                    skeleton: "reel-skeleton",
                    atlas: "reel-atlas",
                    scale: reelScale,
                    autoUpdate: true,
                });
                reel2SpineRef.current = reel2Spine;
                reel2Spine.x = reelPositions.center;
                reel2Spine.y = reelY;
                app.stage.addChild(reel2Spine);

                // Reel 3 (Right)
                const reel3Spine = Spine.from({
                    skeleton: "reel-skeleton",
                    atlas: "reel-atlas",
                    scale: reelScale,
                    autoUpdate: true,
                });
                reel3SpineRef.current = reel3Spine;
                reel3Spine.x = reelPositions.right;
                reel3Spine.y = reelY;
                app.stage.addChild(reel3Spine);

                // Create 9 result slot instances - positioned at column centers, animations handle vertical positioning
                const resultScale = reelScale; // Same scale as reels (responsive)
                const columnPositions = [
                    reelPositions.left,   // Left column (matches reel positions)
                    reelPositions.center, // Center column  
                    reelPositions.right,  // Right column
                ];
                const baseY = reelY; // Base Y position (matches reel Y)

                // Create 9 result slots in proper 3x3 grid layout
                for (let i = 0; i < 9; i++) {
                    const row = Math.floor(i / 3); // 0, 0, 0, 1, 1, 1, 2, 2, 2
                    const col = i % 3; // 0, 1, 2, 0, 1, 2, 0, 1, 2

                    const resultSlot = Spine.from({
                        skeleton: "slots-machine-skeleton",
                        atlas: "slots-machine-atlas",
                        scale: resultScale,
                        autoUpdate: true,
                    });

                    resultSlot.x = columnPositions[col];
                    resultSlot.y = baseY;
                    resultSlot.visible = false;

                    resultSlotsRef.current[i] = resultSlot;
                    app.stage.addChild(resultSlot);
                }


                // Create character spine (Zoggy) - positioned responsively
                let characterScale, characterSpine;

                if (isVerySmall) {
                    // Very small devices: Hide character or make very small
                    characterScale = 0.25;
                } else if (isMobile) {
                    // Regular mobile: Smaller character
                    characterScale = 0.35;
                } else {
                    // Desktop: Normal size
                    characterScale = 0.6;
                }

                characterSpine = Spine.from({
                    skeleton: "zoggy-skeleton",
                    atlas: "zoggy-atlas",
                    scale: characterScale,
                    autoUpdate: true,
                });
                characterSpineRef.current = characterSpine;

                // Position character based on device size
                if (isVerySmall) {
                    // Very small: Hide character completely to save space
                    characterSpine.visible = false;
                } else if (isMobile) {
                    characterSpine.x = appWidth * 0.88; // Further right on mobile
                    characterSpine.y = appHeight * 0.82; // Lower position on mobile
                    characterSpine.visible = true;
                } else {
                    characterSpine.x = appWidth * 0.75; // Desktop position
                    characterSpine.y = appHeight * 0.65; // Desktop position
                    characterSpine.visible = true;
                }

                app.stage.addChild(characterSpine);

                // Set all to setup pose initially
                const allSpines = [backgroundSpine, characterSpine, reel1Spine, reel2Spine, reel3Spine, ...resultSlotsRef.current.filter(Boolean)];
                allSpines.forEach(spine => {
                    if (spine) {
                        spine.skeleton.setToSetupPose();
                        spine.state.clearTracks();
                    }
                });

                isLoadedRef.current = true;

                console.log("Background animations:", backgroundSpine.skeleton.data.animations.map(anim => anim.name));
                console.log("Character animations:", characterSpine.skeleton.data.animations.map(anim => anim.name));
                // console.log("Slot machine animations:", slotMachineSpine.skeleton.data.animations.map(anim => anim.name));
                console.log("Reel animations:", reel1Spine.skeleton.data.animations.map((anim: any) => anim.name));

                // Start idle animations
                backgroundSpine.state.setAnimation(0, SlotsAnimations.BG_IDLE, true);
                characterSpine.state.setAnimation(0, SlotsAnimations.CHARACTER_IDLE, true);
                // slotMachineSpine.state.setAnimation(0, SlotsAnimations.SLOT_IDLE_1, true);

                if (onLoadedRef.current) {
                    onLoadedRef.current();
                }
            } catch (err) {
                if (isMounted) {
                    const error = err instanceof Error ? err : new Error("Failed to initialize PIXI spine for slots");
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
            slotMachineSpineRef.current = null;
            reel1SpineRef.current = null;
            reel2SpineRef.current = null;
            reel3SpineRef.current = null;
            resultSlotsRef.current = Array(9).fill(null);
            isLoadedRef.current = false;
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                display: "block",
            }}
        />
    );
});

SpineSlotsAnimation.displayName = "SpineSlotsAnimation";

export default SpineSlotsAnimation;
