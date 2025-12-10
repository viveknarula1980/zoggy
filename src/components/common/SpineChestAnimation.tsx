import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as PIXI from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { useGameSounds, CHEST_SOUNDS } from "@/hooks/useGameSounds";

export interface SpineChestAnimationHandle {
    playReveal: (onComplete?: () => void) => void;
    playOpen: (onComplete?: () => void) => void;
    playIdleOpen: (loop?: boolean) => void;
    stopAll: () => void;
}

interface SpineChestAnimationProps {
    width?: number;
    height?: number;
    chestType: "daily" | "weekly";
    onLoaded?: () => void;
    onError?: (error: Error) => void;
}

// Asset paths for chest Spine animations
const CHEST_1_JSON = "/assets/Chests/chest_1/proj_1_zoggy_chest_PS.json";
const CHEST_1_ATLAS = "/assets/Chests/chest_1/proj_1_zoggy_chest_PS.atlas";

const CHEST_2_JSON = "/assets/Chests/chest_2/proj_1_zoggy_chest_PS_V2.json";
const CHEST_2_ATLAS = "/assets/Chests/chest_2/proj_1_zoggy_chest_PS_V2.atlas";

// Animation mapping for chests
export const ChestAnimations = {
    // Available animations based on memory
    REVEAL: "reveal",
    OPEN: "open", 
    IDLE_OPEN: "idle_open", // or "open_idle" - we'll check both
} as const;

const SpineChestAnimation = forwardRef<SpineChestAnimationHandle, SpineChestAnimationProps>(({ width = 400, height = 400, chestType, onLoaded, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const chestSpineRef = useRef<Spine | null>(null);
    const isLoadedRef = useRef(false);
    const onLoadedRef = useRef(onLoaded);
    const onErrorRef = useRef(onError);

    // Initialize chest sounds
    const { playSound } = useGameSounds(CHEST_SOUNDS);

    // Update refs when props change
    useEffect(() => {
        onLoadedRef.current = onLoaded;
        onErrorRef.current = onError;
    });

    useImperativeHandle(ref, () => ({
        playReveal: (onComplete?: () => void) => {
            console.log("Playing reveal animation");
            // Play reveal sound when animation starts
            playSound('reveal');
            
            if (chestSpineRef.current && isLoadedRef.current) {
                try {
                    const spine = chestSpineRef.current;
                    spine.state.clearTracks();
                    const trackEntry = spine.state.setAnimation(0, ChestAnimations.REVEAL, false);
                    
                    if (trackEntry && onComplete) {
                        trackEntry.listener = {
                            complete: () => {
                                console.log("Reveal animation completed");
                                onComplete();
                            },
                        };
                    }
                    
                    // Fallback timeout
                    setTimeout(() => {
                        if (onComplete) onComplete();
                    }, 2000);
                } catch (err) {
                    console.error(`Failed to play reveal animation:`, err);
                    if (onComplete) onComplete();
                }
            } else if (onComplete) {
                onComplete();
            }
        },
        playOpen: (onComplete?: () => void) => {
            console.log("Playing open animation");
            // Play open sound when animation starts
            playSound('open');
            
            if (chestSpineRef.current && isLoadedRef.current) {
                try {
                    const spine = chestSpineRef.current;
                    spine.state.clearTracks();
                    const trackEntry = spine.state.setAnimation(0, ChestAnimations.OPEN, false);
                    
                    if (trackEntry && onComplete) {
                        trackEntry.listener = {
                            complete: () => {
                                console.log("Open animation completed");
                                onComplete();
                            },
                        };
                    }
                    
                    // Fallback timeout
                    setTimeout(() => {
                        if (onComplete) onComplete();
                    }, 2000);
                } catch (err) {
                    console.error(`Failed to play open animation:`, err);
                    if (onComplete) onComplete();
                }
            } else if (onComplete) {
                onComplete();
            }
        },
        playIdleOpen: (loop = true) => {
            console.log("Playing idle_open animation");
            if (chestSpineRef.current && isLoadedRef.current) {
                try {
                    const spine = chestSpineRef.current;
                    spine.state.clearTracks();
                    
                    // Try both possible animation names
                    let animationName: string = ChestAnimations.IDLE_OPEN;
                    if (!spine.state.data.skeletonData.findAnimation(animationName)) {
                        animationName = "open_idle"; // Alternative name
                    }
                    
                    spine.state.setAnimation(0, animationName, loop);
                } catch (err) {
                    console.error(`Failed to play idle_open animation:`, err);
                }
            }
        },
        stopAll: () => {
            if (chestSpineRef.current && isLoadedRef.current) {
                try {
                    chestSpineRef.current.state.clearTracks();
                } catch (err) {
                    console.warn("Failed to stop animation:", err);
                }
            }
        },
    }));

    useEffect(() => {
        let isMounted = true;

        const initializePIXISpine = async () => {
            try {
                console.log(`Initializing Chest Spine animation for ${chestType} chest`);
                if (!containerRef.current) return;

                // Clean up existing app
                if (appRef.current) {
                    console.log("Cleaning up existing PIXI app");
                    appRef.current.destroy(true, true);
                    appRef.current = null;
                }

                // Clear spine ref
                chestSpineRef.current = null;
                containerRef.current.innerHTML = "";
                isLoadedRef.current = false;

                // Create PIXI Application with high quality settings
                const app = new PIXI.Application();
                await app.init({
                    width: width,
                    height: height,
                    backgroundColor: 0x000000, // Transparent background
                    backgroundAlpha: 0,
                    antialias: true,
                    resolution: window.devicePixelRatio || 1, // Handle high DPI displays
                    autoDensity: true, // Automatically adjust for device pixel ratio
                });

                // Add rounded corners to match popup styling
                app.canvas.style.borderRadius = '1rem';

                appRef.current = app;
                containerRef.current.appendChild(app.canvas);

                // Determine which chest assets to load
                const chestJSON = chestType === "daily" ? CHEST_1_JSON : CHEST_2_JSON;
                const chestATLAS = chestType === "daily" ? CHEST_1_ATLAS : CHEST_2_ATLAS;

                // Load Spine assets
                await PIXI.Assets.add([
                    { alias: "chest-skeleton", src: chestJSON },
                    { alias: "chest-atlas", src: chestATLAS },
                ]);

                await PIXI.Assets.load([
                    "chest-skeleton", "chest-atlas"
                ]);

                if (!isMounted) return;

                console.log(`${chestType} chest assets loaded successfully`);

                // Create chest spine
                const chestSpine = Spine.from({
                    skeleton: "chest-skeleton",
                    atlas: "chest-atlas",
                    scale: 1,
                    autoUpdate: true,
                });
                chestSpineRef.current = chestSpine;

                // Scale chest to fit container with some padding
                const chestBounds = chestSpine.getBounds();
                const scaleX = (width * 0.8) / chestBounds.width;
                const scaleY = (height * 0.8) / chestBounds.height;
                const fitScale = Math.min(scaleX, scaleY);

                chestSpine.scale.set(fitScale);
                chestSpine.x = width / 2;
                chestSpine.y = height / 2;
                app.stage.addChild(chestSpine);

                // Set to setup pose initially
                chestSpine.skeleton.setToSetupPose();
                chestSpine.state.clearTracks();

                isLoadedRef.current = true;

                // Log available animations for debugging
                console.log("Available chest animations:", chestSpine.skeleton.data.animations.map(anim => anim.name));

                if (onLoadedRef.current) {
                    onLoadedRef.current();
                }
            } catch (err) {
                if (isMounted) {
                    const error = err instanceof Error ? err : new Error("Failed to initialize PIXI spine for chest");
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

            chestSpineRef.current = null;
            isLoadedRef.current = false;
        };
    }, [chestType, width, height]); // Re-initialize when chest type or dimensions change

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

SpineChestAnimation.displayName = "SpineChestAnimation";

export default SpineChestAnimation;
