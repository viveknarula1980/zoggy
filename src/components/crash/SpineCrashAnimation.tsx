import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as PIXI from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { useGameSounds, CRASH_SOUNDS } from "@/hooks/useGameSounds";

export interface SpineCrashAnimationHandle {
    playRocket: (animationName?: string, loop?: boolean, onComplete?: () => void) => void;
    playReveal: (onComplete?: () => void) => void;
    playBackgroundSound: () => void;
    stopBackgroundSound: () => void;
    startFlight: () => void;
    updateFlight: (currentMultiplier: number) => void;
    updateScaleNumbers: (currentMultiplier: number) => void;
    explodeRocket: (onComplete?: () => void) => void;
    resetRocket: () => void;
    handleError: () => void;
    stopAll: () => void;
}

interface SpineCrashAnimationProps {
    width?: number;
    height?: number;
    onLoaded?: () => void;
    onError?: (error: Error) => void;
}

// Asset paths for crash Spine animations
const CRASH_ROCKET_JSON = "/assets/Crash/Animations/json/CRASH_ROCKET_PS.json";
const CRASH_ROCKET_ATLAS = "/assets/Crash/Animations/json/CRASH_ROCKET_PS.atlas";

// New background Spine animation
const CRASH_BG_JSON = "/assets/Crash/NEW_BG/json/BG.json";
const CRASH_BG_ATLAS = "/assets/Crash/NEW_BG/json/BG.atlas";

// Scale Spine animation
const CRASH_SCALE_JSON = "/assets/Crash/scale_v2/SCALE_v2.json";
const CRASH_SCALE_ATLAS = "/assets/Crash/scale_v2/SCALE_v2.atlas";

// Animation mapping for crash rocket
export const CrashAnimations = {
    // Rocket animations (CRASH_ROCKET_PS)
    ROCKET_REVEAL: "reveal",
    ROCKET_IDLE: "idle",
    ROCKET_EXPLOSION: "explosion",
} as const;

const SpineCrashAnimation = forwardRef<SpineCrashAnimationHandle, SpineCrashAnimationProps>(({ width, height, onLoaded, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const rocketSpineRef = useRef<Spine | null>(null);
    const bgSpineRef = useRef<Spine | null>(null);
    const scaleSpineRef = useRef<Spine | null>(null);
    const scaleTextRefs = useRef<PIXI.Text[]>([]);
    const trajectoryGraphicsRef = useRef<PIXI.Graphics | null>(null);
    const graphScaleRef = useRef<PIXI.Graphics | null>(null);
    const isLoadedRef = useRef(false);
    const isFlightRef = useRef(false);
    const flightAnimationRef = useRef<number | null>(null);
    const targetPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const lastFrameTimeRef = useRef<number>(0);
    const bgVerticalOffsetRef = useRef<number>(0);
    const onLoadedRef = useRef(onLoaded);
    const onErrorRef = useRef(onError);
    const isMobileRef = useRef(false);

    // Initialize crash sounds
    const { playSound } = useGameSounds(CRASH_SOUNDS);

    // Update refs when props change
    useEffect(() => {
        onLoadedRef.current = onLoaded;
        onErrorRef.current = onError;
    });

    useImperativeHandle(ref, () => ({
        playRocket: (animationName = CrashAnimations.ROCKET_IDLE, loop = true, onComplete?: () => void) => {
            console.log(`Playing rocket animation: ${animationName}`);
            if (rocketSpineRef.current && isLoadedRef.current) {
                try {
                    const spine = rocketSpineRef.current;
                    spine.state.clearTracks();
                    const trackEntry = spine.state.setAnimation(0, animationName, loop);

                    if (trackEntry && onComplete && !loop) {
                        trackEntry.listener = {
                            complete: () => {
                                console.log(`Rocket animation ${animationName} completed`);
                                onComplete();
                            },
                        };
                    }
                } catch (err) {
                    console.error(`Failed to play rocket animation "${animationName}":`, err);
                }
            }
        },
        playReveal: (onComplete?: () => void) => {
            console.log("Playing reveal animation");
            // Play reveal sound when animation starts
            playSound('reveal');
            
            if (rocketSpineRef.current && isLoadedRef.current) {
                try {
                    const spine = rocketSpineRef.current;
                    spine.state.clearTracks();
                    const trackEntry = spine.state.setAnimation(0, CrashAnimations.ROCKET_REVEAL, false);

                    if (trackEntry && onComplete) {
                        trackEntry.listener = {
                            complete: () => {
                                console.log("Reveal animation completed");
                                // Transition to idle animation
                                spine.state.setAnimation(0, CrashAnimations.ROCKET_IDLE, true);
                                onComplete();
                            },
                        };
                    } else {
                        // Fallback to idle if no completion callback
                        setTimeout(() => {
                            spine.state.setAnimation(0, CrashAnimations.ROCKET_IDLE, true);
                        }, 1000);
                    }
                } catch (err) {
                    console.error("Failed to play reveal animation:", err);
                    if (onComplete) onComplete();
                }
            }
        },
        playBackgroundSound: () => {
            console.log("Playing background sound for idle mode");
            playSound('lounge'); // Background lounge sound for idle mode (same as other games)
        },
        stopBackgroundSound: () => {
            console.log("Stopping background sound");
            // Sound will be stopped by parent component's sound management
        },
        startFlight: () => {
            console.log("Starting rocket flight");
            if (!isLoadedRef.current || isFlightRef.current) return;

            isFlightRef.current = true;
            lastFrameTimeRef.current = Date.now();
            bgVerticalOffsetRef.current = 0; // Reset vertical offset tracking
            
            // Play idle (rocket engine) sound during flight
            console.log("Starting flight - playing rocket idle sound");
            playSound('idle');

            const rocket = rocketSpineRef.current;
            if (rocket) {
                // Play idle animation with fire effects during flight
                rocket.state.clearTracks();
                rocket.state.setAnimation(0, CrashAnimations.ROCKET_IDLE, true);
                
                // Initialize target position to current position
                targetPositionRef.current = { x: rocket.x, y: rocket.y };
            }

            // Create trajectory graphics if not exists
            if (!trajectoryGraphicsRef.current && appRef.current) {
                const trajectoryGraphics = new PIXI.Graphics();
                trajectoryGraphicsRef.current = trajectoryGraphics;
                appRef.current.stage.addChild(trajectoryGraphics);
            }

            // Clear previous trajectory and start fresh trail
            if (trajectoryGraphicsRef.current) {
                trajectoryGraphicsRef.current.clear();
            }

            // Start continuous animation loop
            const animate = () => {
                if (!isFlightRef.current) return;
                
                const currentTime = Date.now();
                let deltaTime = (currentTime - lastFrameTimeRef.current) / 1000; // Convert to seconds
                
                // Cap deltaTime to prevent huge jumps (e.g., when tab becomes active after being inactive)
                deltaTime = Math.min(deltaTime, 0.1); // Max 100ms per frame
                
                lastFrameTimeRef.current = currentTime;
                
                const rocket = rocketSpineRef.current;
                const bgSpine = bgSpineRef.current;
                
                if (rocket && bgSpine) {
                    // Smooth interpolation towards target position (60 FPS independent)
                    // Higher value = faster movement, lower = smoother but slower
                    const lerpSpeed = 12; // Increased for more responsive movement
                    const lerpFactor = Math.min(1, deltaTime * lerpSpeed);
                    rocket.x += (targetPositionRef.current.x - rocket.x) * lerpFactor;
                    rocket.y += (targetPositionRef.current.y - rocket.y) * lerpFactor;
                    
                    // Continuous background movement (Spine animation handles looping internally)
                    const mainTransformBone = bgSpine.skeleton.findBone("main_transform");
                    if (mainTransformBone) {
                        // Simple continuous horizontal movement (Spine loops automatically)
                        mainTransformBone.x -= 2 * deltaTime * 60; // Frame-independent movement
                        
                        // Only move vertically until we reach a certain limit
                        const maxVerticalOffset = -200; // Stop vertical movement after this offset
                        if (bgVerticalOffsetRef.current > maxVerticalOffset) {
                            const verticalMovement = 0.4 * deltaTime * 60;
                            mainTransformBone.y -= verticalMovement;
                            bgVerticalOffsetRef.current -= verticalMovement;
                        }
                    }
                }
                
                flightAnimationRef.current = requestAnimationFrame(animate);
            };
            
            flightAnimationRef.current = requestAnimationFrame(animate);
            console.log("Rocket flight started with continuous animation loop");
        },
        updateFlight: (currentMultiplier: number) => {
            if (!isFlightRef.current || !isLoadedRef.current) return;

            const rocket = rocketSpineRef.current;
            const scaleSpine = scaleSpineRef.current;
            if (!rocket || !scaleSpine) return;

            // Calculate target position based on multiplier
            // The animation loop will smoothly interpolate to this target
            const app = appRef.current;
            if (app) {
                const appHeight = app.screen.height;
                const appWidth = app.screen.width;
                const isMobile = isMobileRef.current;
                
                // Get current scale values from text elements
                const currentScaleValues = scaleTextRefs.current.map(text => {
                    const value = parseFloat(text.text.replace('X', ''));
                    return isNaN(value) ? 0 : value;
                });
                
                if (currentScaleValues.length === 0) return;
                
                // Find rocket position relative to current scale
                // With ascending order: [1, 1.5, 2, 3, 5, 10] - rocket moves from top to bottom as multiplier increases
                let targetBlockIndex = 0;
                let rocketPosition = 0; // 0 = top block, 1 = bottom block
                
                // If multiplier is higher than the bottom/highest scale value, rocket stays at bottom (position 1)
                if (currentMultiplier >= currentScaleValues[currentScaleValues.length - 1]) {
                    targetBlockIndex = currentScaleValues.length - 1;
                    rocketPosition = 1; // Stay at bottom (highest position)
                } else if (currentMultiplier <= currentScaleValues[0]) {
                    // If multiplier is below the top/lowest scale value, rocket stays at top
                    targetBlockIndex = 0;
                    rocketPosition = 0; // Stay at top (lowest position)
                } else {
                    // Find the appropriate block position based on current multiplier (ascending order)
                    for (let i = 0; i < currentScaleValues.length - 1; i++) {
                        const currentValue = currentScaleValues[i];
                        const nextValue = currentScaleValues[i + 1];
                        
                        if (currentMultiplier >= currentValue && currentMultiplier <= nextValue) {
                            // Interpolate position between these two blocks
                            const range = nextValue - currentValue;
                            const offset = currentMultiplier - currentValue;
                            const interpolation = range > 0 ? offset / range : 0;
                            
                            targetBlockIndex = i;
                            rocketPosition = i / (currentScaleValues.length - 1) + 
                                           (interpolation / (currentScaleValues.length - 1));
                            break;
                        }
                    }
                }
                
                // Calculate target Y position based on rocket position
                const blockPositions = [0, 160, 320, 480, 640, 800];
                const blockAttachmentOffset = 30.67;
                
                // Interpolate between block positions
                const topBlockY = blockPositions[0] + blockAttachmentOffset;
                const bottomBlockY = blockPositions[blockPositions.length - 1] + blockAttachmentOffset;
                const interpolatedBlockY = topBlockY + (rocketPosition * (bottomBlockY - topBlockY));
                
                const targetY = scaleSpine.y - (interpolatedBlockY * scaleSpine.scale.y);
                
                // Move rocket horizontally as it goes up (trajectory curve)
                const baseX = appWidth * 0.1;
                const curveDistance = isMobile ? appWidth * 0.7 : appWidth * 0.6;
                const targetX = baseX + (rocketPosition * curveDistance);
                
                // Update target position - the animation loop will smoothly interpolate
                targetPositionRef.current = { x: targetX, y: targetY };
                
                console.log(`Rocket target updated: multiplier=${currentMultiplier}, rocketPosition=${rocketPosition.toFixed(2)}, targetBlock=${targetBlockIndex}, targetX=${targetX.toFixed(0)}, targetY=${targetY.toFixed(0)}`);
            }
        },
        updateScaleNumbers: (currentMultiplier: number) => {
            if (!isLoadedRef.current || scaleTextRefs.current.length === 0) return;

            // Get current scale values from text elements
            const currentScaleValues = scaleTextRefs.current.map(text => {
                const value = parseFloat(text.text.replace('X', ''));
                return isNaN(value) ? 0 : value;
            });

            // Check if we need to shift the scale up (when rocket reaches or exceeds the bottom/highest value)
            // With ascending order: [1, 1.5, 2, 3, 5, 10] - highest value is at bottom (index 5)
            const bottomValue = currentScaleValues[currentScaleValues.length - 1];
            const shouldShiftUp = currentMultiplier >= bottomValue;

            let newScaleValues = [...currentScaleValues];

            if (shouldShiftUp && bottomValue > 0) {
                // Calculate the next tier of values
                // When rocket reaches bottom/highest value, shift all values and add new higher values at bottom
                const multiplier = bottomValue >= 100 ? 10 : (bottomValue >= 10 ? 5 : 2);
                
                // Shift existing values by removing top/lowest value and adding new bottom/highest value
                newScaleValues = [
                    ...currentScaleValues.slice(1),  // Keep all except the top/lowest value
                    bottomValue * multiplier         // New bottom value (higher than current bottom)
                ];
                
                console.log(`Scale shifted up: multiplier=${currentMultiplier}, oldBottom=${bottomValue}, newBottom=${newScaleValues[newScaleValues.length - 1]}`);
            } else if (currentScaleValues.every(val => val === 0)) {
                // Initialize scale values if they're all zero (first time)
                newScaleValues = [1, 1.5, 2, 3, 5, 10];
            }

            // Update each scale text with new values
            scaleTextRefs.current.forEach((textElement, index) => {
                if (textElement && index < newScaleValues.length) {
                    const value = newScaleValues[index];
                    textElement.text = `${value.toFixed(value < 10 ? 1 : 0)}X`;
                    
                    // Highlight the scale block closest to current multiplier
                    // With ascending order: [1, 1.5, 2, 3, 5, 10] - lowest at top, highest at bottom
                    let isActive = false;
                    
                    if (currentMultiplier >= newScaleValues[newScaleValues.length - 1]) {
                        // If multiplier is above bottom/highest value, highlight bottom block
                        isActive = index === newScaleValues.length - 1;
                    } else if (currentMultiplier <= newScaleValues[0]) {
                        // If multiplier is below top/lowest value, highlight top block
                        isActive = index === 0;
                    } else {
                        // Find the range where current multiplier falls (ascending order)
                        for (let i = 0; i < newScaleValues.length - 1; i++) {
                            if (currentMultiplier >= newScaleValues[i] && currentMultiplier <= newScaleValues[i + 1]) {
                                isActive = index === i || index === i + 1;
                                break;
                            }
                        }
                    }
                    
                    textElement.style.fill = isActive ? 0x00ff00 : 0xffffff; // Green for active
                    textElement.style.fontWeight = isActive ? 'bold' : 'normal';
                    
                    // Add glow effect for the active block
                    // if (isActive) {
                    //     textElement.style.dropShadow = true;
                    // } else {
                    //     textElement.style.dropShadow = false;
                    // }
                }
            });
        },
        explodeRocket: (onComplete?: () => void) => {
            console.log("Exploding rocket");
            if (!isLoadedRef.current) return;

            // Stop flight animation loop
            if (flightAnimationRef.current) {
                cancelAnimationFrame(flightAnimationRef.current);
                flightAnimationRef.current = null;
            }
            isFlightRef.current = false;

            // Play explosion sound when rocket crashes
            console.log("Rocket exploding - playing explosion sound");
            playSound('explosion');

            const rocket = rocketSpineRef.current;
            if (rocket) {
                try {
                    // Play explosion animation
                    rocket.state.clearTracks();
                    const trackEntry = rocket.state.setAnimation(0, CrashAnimations.ROCKET_EXPLOSION, false);

                    if (trackEntry && onComplete) {
                        trackEntry.listener = {
                            complete: () => {
                                console.log("Rocket explosion animation completed");
                                // Keep rocket visible in final explosion state for results display
                                rocket.visible = true;
                                rocket.alpha = 1.0;
                                // Clear animation tracks to stop any further animation
                                rocket.state.clearTracks();
                                onComplete();
                            },
                        };
                    }
                } catch (err) {
                    console.error("Failed to play explosion animation:", err);
                    if (onComplete) onComplete();
                }
            }
        },
        resetRocket: () => {
            console.log("Resetting rocket");

            // Stop flight animation
            if (flightAnimationRef.current) {
                cancelAnimationFrame(flightAnimationRef.current);
                flightAnimationRef.current = null;
            }
            isFlightRef.current = false;

            const rocket = rocketSpineRef.current;
            const bgSpine = bgSpineRef.current;
            if (rocket) {
                try {
                    // Force clear any existing animation listeners and tracks
                    rocket.state.clearListeners();
                    rocket.state.clearTracks();
                    
                    // Reset rocket animation and position with explicit visibility
                    rocket.rotation = 0; 
                    rocket.alpha = 1.0; 
                    rocket.visible = true;
                    rocket.renderable = true; // Ensure it's renderable

                    // Reset rocket to initial position
                    const app = appRef.current;
                    if (app) {
                        rocket.x = app.screen.width * 0.1;  // Initial X position
                        rocket.y = app.screen.height * 0.8; // Initial Y position
                        console.log(`Rocket position reset to x=${rocket.x}, y=${rocket.y}, visible=${rocket.visible}, alpha=${rocket.alpha}`);
                    }

                    // Set to setup pose first, then start idle animation
                    rocket.skeleton.setToSetupPose();
                    rocket.state.setAnimation(0, CrashAnimations.ROCKET_IDLE, true);

                    // Reset target position to match current position
                    targetPositionRef.current = { x: rocket.x, y: rocket.y };

                    // Clear trajectory graphics
                    if (trajectoryGraphicsRef.current) {
                        trajectoryGraphicsRef.current.clear();
                    }

                    // Reset scale text values to initial state (ascending order, lowest to highest)
                    const initialValues = [1, 1.5, 2, 3, 5, 10]; // Ascending order, lowest to highest
                    scaleTextRefs.current.forEach((textElement, index) => {
                        if (textElement && index < initialValues.length) {
                            textElement.text = `${initialValues[index]}X`;
                            textElement.style.fill = 0xffffff;
                            textElement.style.fontWeight = 'normal';
                            textElement.style.dropShadow = false;
                        }
                    });

                    // Reset background position
                    if (bgSpine) {
                        const mainTransformBone = bgSpine.skeleton.findBone("main_transform");
                        if (mainTransformBone) {
                            mainTransformBone.x = 0;
                            mainTransformBone.y = 0;
                            bgVerticalOffsetRef.current = 0; // Reset vertical offset tracking
                            console.log("Background position reset to (0, 0)");
                        }
                    }

                    console.log("Rocket and background reset complete - rocket should be visible and ready");
                } catch (err) {
                    console.error("Failed to reset rocket:", err);
                }
            } else {
                console.warn("Rocket spine reference is null during reset");
            }
        },
        handleError: () => {
            console.log("Handling animation error - stopping rocket without showing results");

            // Stop flight animation immediately
            if (flightAnimationRef.current) {
                cancelAnimationFrame(flightAnimationRef.current);
                flightAnimationRef.current = null;
            }
            isFlightRef.current = false;

            const rocket = rocketSpineRef.current;
            if (rocket) {
                try {
                    rocket.state.clearTracks();
                    rocket.state.setAnimation(0, CrashAnimations.ROCKET_IDLE, true);
                } catch (err) {
                    console.warn("Failed to handle rocket error:", err);
                }
            }
        },
        stopAll: () => {
            if (flightAnimationRef.current) {
                cancelAnimationFrame(flightAnimationRef.current);
                flightAnimationRef.current = null;
            }
            isFlightRef.current = false;

            if (rocketSpineRef.current && isLoadedRef.current) {
                try {
                    rocketSpineRef.current.state.clearTracks();
                } catch (err) {
                    console.warn("Failed to stop rocket animation:", err);
                }
            }
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

                // Clear refs
                rocketSpineRef.current = null;
                bgSpineRef.current = null;
                scaleSpineRef.current = null;
                scaleTextRefs.current = [];
                trajectoryGraphicsRef.current = null;
                graphScaleRef.current = null;
                containerRef.current.innerHTML = "";
                isLoadedRef.current = false;

                // Get container dimensions - use full available space
                const containerRect = containerRef.current.getBoundingClientRect();
                const appWidth = containerRect.width || width || 800;
                const appHeight = containerRect.height || height || 600;

                // Determine if mobile based on width (following dice game pattern)
                const isMobile = appWidth < 768; // md breakpoint
                isMobileRef.current = isMobile; // Store for use in imperative methods

                // Create PIXI Application with high quality settings
                const app = new PIXI.Application();
                await app.init({
                    width: appWidth,
                    height: appHeight,
                    backgroundColor: 0x0a0a1a, // Dark space background
                    antialias: true,
                    resolution: window.devicePixelRatio || 1, // Handle high DPI displays
                    autoDensity: true, // Automatically adjust for device pixel ratio
                    resizeTo: containerRef.current, // Auto-resize to container for responsive behavior
                });

                // Add responsive canvas styling for mobile (following dice game pattern)
                app.canvas.style.width = '100%';
                app.canvas.style.height = '100%';
                app.canvas.style.display = 'block';
                app.canvas.style.borderRadius = '0.8rem'; // rounded-md equivalent

                appRef.current = app;
                containerRef.current.appendChild(app.canvas);

                // Load all assets
                console.log("Adding assets to PIXI.Assets:");
                console.log("  - Rocket JSON:", CRASH_ROCKET_JSON);
                console.log("  - Rocket Atlas:", CRASH_ROCKET_ATLAS);
                console.log("  - BG JSON:", CRASH_BG_JSON);
                console.log("  - BG Atlas:", CRASH_BG_ATLAS);

                await PIXI.Assets.add([
                    { alias: "crash-rocket-skeleton", src: CRASH_ROCKET_JSON },
                    { alias: "crash-rocket-atlas", src: CRASH_ROCKET_ATLAS },
                    { alias: "crash-bg-skeleton", src: CRASH_BG_JSON },
                    { alias: "crash-bg-atlas", src: CRASH_BG_ATLAS },
                    { alias: "crash-scale-skeleton", src: CRASH_SCALE_JSON },
                    { alias: "crash-scale-atlas", src: CRASH_SCALE_ATLAS },
                ]);

                console.log("Loading assets...");
                const loadedAssets = await PIXI.Assets.load([
                    "crash-rocket-skeleton", "crash-rocket-atlas",
                    "crash-bg-skeleton", "crash-bg-atlas",
                    "crash-scale-skeleton", "crash-scale-atlas"
                ]);

                console.log("Loaded assets:", Object.keys(loadedAssets));
                console.log("BG skeleton loaded:", !!loadedAssets["crash-bg-skeleton"]);
                console.log("BG atlas loaded:", !!loadedAssets["crash-bg-atlas"]);

                if (!isMounted) return;

                console.log("All crash assets loaded successfully");

                // Create background spine
                const bgSpine = Spine.from({
                    skeleton: "crash-bg-skeleton",
                    atlas: "crash-bg-atlas",
                    autoUpdate: true,
                });
                bgSpineRef.current = bgSpine;

                // Calculate scale first to cover entire container with extra space for movement
                const bgBounds = bgSpine.getBounds();
                console.log(`BG bounds: width=${bgBounds.width}, height=${bgBounds.height}`);
                console.log(`Container: width=${appWidth}, height=${appHeight}`);
                
                const scaleX = appWidth / bgBounds.width;
                const scaleY = appHeight / bgBounds.height;
                // Responsive background scaling - smaller multiplier on mobile for better performance
                const bgScale = Math.max(scaleX, scaleY) * (isMobile ? 1.8 : 2.0); // Slightly smaller on mobile
                bgSpine.scale.set(bgScale);
                
                // Position background lower to reduce empty space
                bgSpine.x = 0;
                bgSpine.y = appHeight / 4; // Lowered from /10 to /4
                
                // Set initial position of main_transform bone to center the content
                const mainTransformBone = bgSpine.skeleton.findBone("main_transform");
                if (mainTransformBone) {
                    mainTransformBone.x = 0;
                    mainTransformBone.y = 0;
                }
                
                // Play background animation for looping effect
                bgSpine.state.setAnimation(0, "animation", true);
                
                app.stage.addChild(bgSpine);
                console.log(`Background spine scaled to ${bgScale} (scaleX: ${scaleX}, scaleY: ${scaleY})`);

                // Create scale spine
                const scaleSpine = Spine.from({
                    skeleton: "crash-scale-skeleton",
                    atlas: "crash-scale-atlas",
                    autoUpdate: true,
                });
                scaleSpineRef.current = scaleSpine;

                // Position scale on the left side of canvas with responsive scaling
                scaleSpine.x = appWidth * 0.05; // Left side position
                scaleSpine.y = appHeight / 1.2; // Top position
                const scaleSpineScale = isMobile ? 0.35 : 0.5; // Smaller on mobile
                scaleSpine.scale.set(scaleSpineScale);
                app.stage.addChild(scaleSpine);

                // Create text overlays for scale blocks with mobile awareness
                await createScaleTexts(app, scaleSpine, appWidth, appHeight, isMobile);

                console.log(`Scale spine positioned at x=${scaleSpine.x}, y=${scaleSpine.y}`);

                console.log("Scale spine and text overlays created successfully");

                // Create rocket spine
                const rocketSpine = Spine.from({
                    skeleton: "crash-rocket-skeleton",
                    atlas: "crash-rocket-atlas",
                    autoUpdate: true,
                });
                rocketSpineRef.current = rocketSpine;

                // Position rocket at center with responsive scaling
                rocketSpine.x = appWidth * 0.1;
                rocketSpine.y = appHeight * 0.8;
                const rocketScale = isMobile ? 0.1 : 0.35; // Even smaller on mobile
                rocketSpine.scale.set(rocketScale);
                rocketSpine.alpha = 1.0;
                app.stage.addChild(rocketSpine);

                console.log(`Rocket positioned at center: x=${rocketSpine.x}, y=${rocketSpine.y} (container: ${appWidth}x${appHeight})`);

                // Set to setup pose and start idle animation
                rocketSpine.skeleton.setToSetupPose();
                rocketSpine.state.clearTracks();
                rocketSpine.state.setAnimation(0, CrashAnimations.ROCKET_IDLE, true);

                // Log available bones in background
                console.log("Background bones:", bgSpine.skeleton.bones.map((bone: any) => bone.data.name));
                console.log("Rocket animations:", rocketSpine.skeleton.data.animations.map((anim: any) => anim.name));

                isLoadedRef.current = true;

                // Assets loaded - ready for idle state (no sound on load)
                console.log("Assets loaded - ready for idle state");

                if (onLoadedRef.current) {
                    onLoadedRef.current();
                }
            } catch (err) {
                if (isMounted) {
                    const error = err instanceof Error ? err : new Error("Failed to initialize PIXI spine for crash");
                    console.error("PIXI spine initialization error:", error);
                    if (onErrorRef.current) {
                        onErrorRef.current(error);
                    }
                }
            }
        };

        // Create text overlays for scale blocks
        const createScaleTexts = async (app: PIXI.Application, scaleSpine: Spine, appWidth: number, appHeight: number, isMobile: boolean = false) => {
            try {
                // Clear existing scale texts
                scaleTextRefs.current.forEach(text => {
                    if (text.parent) {
                        text.parent.removeChild(text);
                    }
                });
                scaleTextRefs.current = [];

                // Scale has 6 blocks positioned at y: 0, 160, 320, 480, 640, 800 (in spine coordinates)
                // Block attachment has y offset of 30.67 according to JSON
                const blockPositions = [0, 160, 320, 480, 640, 800];
                const blockAttachmentOffset = 30.67; // From spine JSON: block attachment y offset
                // Initial scale values - ascending order, lowest to highest (top to bottom)
                const scaleValues = [1, 1.5, 2, 3, 5, 10]; // Multiplier values for each block (top to bottom)

                blockPositions.forEach((blockY, index) => {
                    // Calculate exact world coordinates for block center
                    // Spine coordinate system: bone position + attachment offset, scaled and positioned
                    const localBlockY = blockY + blockAttachmentOffset;
                    const worldX = scaleSpine.x;
                    const worldY = scaleSpine.y - (localBlockY * scaleSpine.scale.y);

                    // Create text for this scale block with responsive font size
                    const scaleText = new PIXI.Text(`${scaleValues[index]}X`, {
                        fontFamily: 'Arial',
                        fontSize: isMobile ? 10 : 14, // Smaller font on mobile
                        fill: 0xffffff,
                        fontWeight: 'bold',
                        align: 'center'
                    });

                    // Position text exactly in center of block
                    scaleText.anchor.set(0.5, 0.5);
                    scaleText.x = worldX;
                    scaleText.y = worldY;

                    app.stage.addChild(scaleText);
                    scaleTextRefs.current.push(scaleText);

                    console.log(`Block ${index + 1}: Spine Y=${blockY}, World Y=${worldY}, Value=${scaleValues[index]}X`);
                });

                console.log("Scale text overlays created for 6 blocks with exact positioning");
            } catch (err) {
                console.warn("Failed to create scale texts:", err);
            }
        };

        initializePIXISpine();

        return () => {
            isMounted = false;

            if (flightAnimationRef.current) {
                cancelAnimationFrame(flightAnimationRef.current);
                flightAnimationRef.current = null;
            }

            if (appRef.current) {
                appRef.current.destroy(true, true);
                appRef.current = null;
            }

            rocketSpineRef.current = null;
            bgSpineRef.current = null;
            scaleSpineRef.current = null;
            scaleTextRefs.current = [];
            trajectoryGraphicsRef.current = null;
            graphScaleRef.current = null;
            isLoadedRef.current = false;
            isFlightRef.current = false;
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        />
    );
});

SpineCrashAnimation.displayName = "SpineCrashAnimation";

export default SpineCrashAnimation;
