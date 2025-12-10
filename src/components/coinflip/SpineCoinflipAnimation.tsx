import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as PIXI from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export interface SpineCoinflipAnimationHandle {
    play: (animationName: string, loop?: boolean, onComplete?: () => void) => void;
    stop: () => void;
    startSpinning: (duration: number, finalResult: "heads" | "tails", onComplete?: () => void) => void;
    playRevealAnimation: (onComplete?: () => void) => void;
}

interface SpineCoinflipAnimationProps {
    width?: number;
    height?: number;
    initialAnimation?: string;
    onLoaded?: () => void;
    onError?: (error: Error) => void;
}

const COINFLIP_JSON = "/assets/coinflip/Animations/json/CoinFlip_PS.json";
const COINFLIP_ATLAS = "/assets/coinflip/Animations/json/CoinFlip_PS.atlas";
const COINFLIP_BACKGROUND = "/assets/coinflip/Backgrounds/Game Screen.jpg";

// Animation mapping for coinflip results
export const CoinflipAnimations = {
    // Starting from bronze (neutral state)
    FLIP_TO_HEAD: "flip_bronze_to_gold", // Gold = HEAD
    FLIP_TO_TAILS: "flip_bronze_to_silver", // Silver = TAILS

    // Continuing flips
    HEAD_TO_HEAD: "flip_gold_to_gold", // Gold to Gold
    HEAD_TO_TAILS: "flip_gold_to_silver", // Gold to Silver
    TAILS_TO_HEAD: "flip_silver_to_gold", // Silver to Gold
    TAILS_TO_TAILS: "flip_silver_to_silver", // Silver to Silver
} as const;

// Animation durations in milliseconds (from JSON analysis)
export const CoinflipAnimationDurations = {
    flip_bronze_to_gold: 933, // 0.9333 seconds
    flip_bronze_to_silver: 933, // Assuming same duration
    flip_gold_to_gold: 933,
    flip_gold_to_silver: 933,
    flip_silver_to_gold: 933,
    flip_silver_to_silver: 933,
} as const;

const SpineCoinflipAnimation = forwardRef<SpineCoinflipAnimationHandle, SpineCoinflipAnimationProps>(({ width, height, initialAnimation, onLoaded, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const spineRef = useRef<Spine | null>(null);
    const isLoadedRef = useRef(false);
    const onLoadedRef = useRef(onLoaded);
    const onErrorRef = useRef(onError);

    // Update refs when props change
    useEffect(() => {
        onLoadedRef.current = onLoaded;
        onErrorRef.current = onError;
    });

    useImperativeHandle(ref, () => ({
        play: (animationName: string, loop = false, onComplete?: () => void) => {
            console.log(`Attempting to play PIXI animation: ${animationName}`);
            if (spineRef.current && isLoadedRef.current) {
                try {
                    const spine = spineRef.current;

                    // Clear existing tracks
                    spine.state.clearTracks();

                    // Set new animation
                    const trackEntry = spine.state.setAnimation(0, animationName, loop);
                    if (trackEntry) {
                        trackEntry.mixDuration = 0;

                        // Set up completion listener using PIXI Spine API
                        if (onComplete && !loop) {
                            trackEntry.listener = {
                                complete: () => {
                                    console.log(`PIXI Animation ${animationName} completed`);
                                    onComplete();
                                },
                            };
                        }
                    }
                    console.log(`PIXI Animation ${animationName} started with loop=${loop}`);
                } catch (err) {
                    console.error(`Failed to play PIXI animation "${animationName}":`, err);
                }
            } else {
                console.warn(`Cannot play animation - Spine ready: ${!!spineRef.current}, Loaded: ${isLoadedRef.current}`);
            }
        },
        stop: () => {
            if (spineRef.current && isLoadedRef.current) {
                try {
                    spineRef.current.state.clearTracks();
                } catch (err) {
                    console.warn("Failed to stop PIXI animation:", err);
                }
            }
        },
        startSpinning: (duration: number, finalResult: "heads" | "tails", onComplete?: () => void) => {
            console.log(`Starting ${duration}ms spinning animation for result: ${finalResult}`);
            if (spineRef.current && isLoadedRef.current) {
                try {
                    const spine = spineRef.current;
                    
                    // Clear existing tracks
                    spine.state.clearTracks();
                    
                    // Use the target result animation on loop for the entire duration
                    const resultAnimation = finalResult === "heads" ? 
                        CoinflipAnimations.FLIP_TO_HEAD : 
                        CoinflipAnimations.FLIP_TO_TAILS;
                    
                    // Start looping the result animation for spinning effect
                    const trackEntry = spine.state.setAnimation(0, resultAnimation, true); // Loop = true
                    if (trackEntry) {
                        trackEntry.mixDuration = 0;
                        // Speed up for spinning effect
                        trackEntry.timeScale = 1.5; // Faster for spinning
                    }
                    
                    // After the duration, slow down to normal speed and stop looping
                    setTimeout(() => {
                        if (spineRef.current && isLoadedRef.current && trackEntry) {
                            // Slow down to normal speed for final reveal
                            trackEntry.timeScale = 1.0;
                            
                            // Play one final cycle at normal speed
                            const finalTrackEntry = spine.state.setAnimation(0, resultAnimation, false);
                            if (finalTrackEntry && onComplete) {
                                finalTrackEntry.mixDuration = 0.2;
                                finalTrackEntry.listener = {
                                    complete: () => {
                                        console.log(`Spinning animation completed for result: ${finalResult}`);
                                        onComplete();
                                    },
                                };
                            }
                        }
                    }, duration);
                    
                } catch (err) {
                    console.error(`Failed to start spinning animation:`, err);
                }
            } else {
                console.warn(`Cannot start spinning - Spine ready: ${!!spineRef.current}, Loaded: ${isLoadedRef.current}`);
            }
        },
        playRevealAnimation: (onComplete?: () => void) => {
            console.log(`Playing reveal animation`);
            if (spineRef.current && isLoadedRef.current) {
                try {
                    const spine = spineRef.current;
                    
                    // Clear existing tracks
                    spine.state.clearTracks();
                    
                    // Play the reveal animation
                    const trackEntry = spine.state.setAnimation(0, "reveal", false);
                    if (trackEntry) {
                        trackEntry.mixDuration = 0;
                        
                        if (onComplete) {
                            trackEntry.listener = {
                                complete: () => {
                                    console.log(`Reveal animation completed`);
                                    onComplete();
                                },
                            };
                        }
                    }
                } catch (err) {
                    console.error(`Failed to play reveal animation:`, err);
                }
            } else {
                console.warn(`Cannot play reveal - Spine ready: ${!!spineRef.current}, Loaded: ${isLoadedRef.current}`);
            }
        },
    }));

    useEffect(() => {
        let isMounted = true;
        let resizeTimeout: NodeJS.Timeout;
        let scrollTimeout: NodeJS.Timeout;
        let isScrolling = false;

        const handleScroll = () => {
            isScrolling = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 150);
        };

        const handleResize = () => {
            // Skip resize handling if currently scrolling
            if (isScrolling) {
                console.log("Skipping resize - scrolling detected");
                return;
            }
            // Debounce resize events to avoid excessive re-renders
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (appRef.current && spineRef.current && containerRef.current) {
                    // Use app dimensions instead of container getBoundingClientRect to avoid scroll issues
                    const newWidth = appRef.current.screen.width;
                    const newHeight = appRef.current.screen.height;
                    
                    // Get container dimensions for comparison to detect significant changes
                    const containerRect = containerRef.current.getBoundingClientRect();
                    const containerWidth = containerRect.width;
                    const containerHeight = containerRect.height;
                    
                    // Only update if there's a significant size change (more than 50px difference)
                    // This prevents minor scroll-induced viewport changes from affecting the coin
                    const widthDiff = Math.abs(newWidth - containerWidth);
                    const heightDiff = Math.abs(newHeight - containerHeight);
                    
                    if (widthDiff < 50 && heightDiff < 50) {
                        console.log("Skipping resize - minor change detected (likely scroll):", { widthDiff, heightDiff });
                        return;
                    }
                    
                    // Update background scaling to maintain aspect ratio
                    const backgroundSprite = appRef.current.stage.children[0] as PIXI.Sprite;
                    if (backgroundSprite && backgroundSprite.texture) {
                        const bgAspectRatio = backgroundSprite.texture.width / backgroundSprite.texture.height;
                        const appAspectRatio = newWidth / newHeight;
                        
                        let bgWidth, bgHeight;
                        if (bgAspectRatio > appAspectRatio) {
                            bgHeight = newHeight;
                            bgWidth = newHeight * bgAspectRatio;
                        } else {
                            bgWidth = newWidth;
                            bgHeight = newWidth / bgAspectRatio;
                        }
                        
                        backgroundSprite.width = bgWidth;
                        backgroundSprite.height = bgHeight;
                        backgroundSprite.x = (newWidth - bgWidth) / 2;
                        backgroundSprite.y = (newHeight - bgHeight) / 2;
                    }
                    
                    // Update spine positioning and scaling for new container size
                    const spine = spineRef.current;
                    
                    // Recalculate responsive scale - match initialization logic
                    const baseScale = 0.32;
                    const minScale = 0.20;
                    const maxScale = 0.45;
                    
                    let responsiveScale = baseScale;
                    if (newWidth < 480) {
                        // Mobile phones - significantly smaller coin
                        responsiveScale = Math.max(minScale, baseScale * 0.55);
                    } else if (newWidth < 768) {
                        // Tablets - moderately smaller coin
                        responsiveScale = baseScale * 0.8;
                    } else if (newWidth > 1200) {
                        // Large screens - slightly larger coin
                        responsiveScale = Math.min(maxScale, baseScale * 1.15);
                    }
                    
                    // Update spine scale and position
                    spine.scale.set(responsiveScale);
                    spine.x = newWidth / 2.05; // Match initialization positioning
                    
                    let yPosition = newHeight / 1.65;
                    if (newWidth < 480) {
                        // Mobile: move coin down for better positioning
                        yPosition = newHeight / 1.4;
                    } else if (newWidth < 768) {
                        // Tablet: slight adjustment
                        yPosition = newHeight / 1.55;
                    }
                    
                    spine.y = yPosition;
                    
                    console.log("Spine resized:", { 
                        newWidth, 
                        newHeight, 
                        scale: responsiveScale,
                        x: spine.x,
                        y: spine.y 
                    });
                }
            }, 300); // Increased debounce to 300ms for better stability
        };

        const initializePIXISpine = async () => {
            try {
                if (!containerRef.current) return;

                // Clean up existing app
                if (appRef.current) {
                    appRef.current.destroy(true, true);
                    appRef.current = null;
                }
                if (spineRef.current) {
                    spineRef.current = null;
                }
                containerRef.current.innerHTML = "";
                isLoadedRef.current = false;

                // Get container dimensions for full size
                const containerRect = containerRef.current.getBoundingClientRect();
                const appWidth = width || containerRect.width || 800;
                const appHeight = height || containerRect.height || 500;

                // Create PIXI Application with high-quality settings for crisp rendering
                const app = new PIXI.Application();
                await app.init({
                    width: appWidth,
                    height: appHeight,
                    backgroundColor: 0x222222,
                    antialias: true,
                    resizeTo: containerRef.current, // Auto-resize to container
                    resolution: Math.max(window.devicePixelRatio || 1, 2), // Force minimum 2x resolution for crisp quality
                    autoDensity: true, // Automatically adjust for device pixel ratio
                    powerPreference: 'high-performance', // Use high-performance GPU when available
                    backgroundAlpha: 1, // Ensure full opacity background
                });

                appRef.current = app;
                containerRef.current.appendChild(app.canvas);

                // Load Spine assets and background image using proper PIXI Assets API
                await PIXI.Assets.add([
                    { alias: "coinflip-skeleton", src: COINFLIP_JSON },
                    { alias: "coinflip-atlas", src: COINFLIP_ATLAS },
                    { alias: "coinflip-background", src: COINFLIP_BACKGROUND },
                ]);

                // Load skeleton, atlas, and background assets
                await PIXI.Assets.load(["coinflip-skeleton", "coinflip-atlas", "coinflip-background"]);

                // Set texture quality settings for crisp rendering
                const atlasTexture = PIXI.Assets.get("coinflip-atlas");
                const backgroundTextureAsset = PIXI.Assets.get("coinflip-background");
                
                // Ensure textures use high-quality filtering with proper null checks
                if (atlasTexture && atlasTexture.source) {
                    atlasTexture.source.scaleMode = 'linear'; // Use linear filtering for smooth scaling
                    atlasTexture.source.antialias = true;
                }
                if (backgroundTextureAsset && backgroundTextureAsset.source) {
                    backgroundTextureAsset.source.scaleMode = 'linear';
                    backgroundTextureAsset.source.antialias = true;
                }

                if (!isMounted) return;

                console.log("Assets loaded successfully");

                // Create and add background sprite
                const backgroundTexture = backgroundTextureAsset;
                const backgroundSprite = new PIXI.Sprite(backgroundTexture);

                // Scale background to cover the app dimensions while maintaining aspect ratio
                const bgAspectRatio = backgroundTexture.width / backgroundTexture.height;
                const appAspectRatio = appWidth / appHeight;
                
                let bgWidth, bgHeight;
                if (bgAspectRatio > appAspectRatio) {
                    // Background is wider than app - fit to height and crop sides
                    bgHeight = appHeight;
                    bgWidth = appHeight * bgAspectRatio;
                } else {
                    // Background is taller than app - fit to width and crop top/bottom
                    bgWidth = appWidth;
                    bgHeight = appWidth / bgAspectRatio;
                }
                
                backgroundSprite.width = bgWidth;
                backgroundSprite.height = bgHeight;
                // Center the background
                backgroundSprite.x = (appWidth - bgWidth) / 2;
                backgroundSprite.y = (appHeight - bgHeight) / 2;

                // Add background to stage first (so it's behind everything)
                app.stage.addChild(backgroundSprite);

                // Calculate responsive scale based on container size
                const baseScale = 0.32;
                const minScale = 0.20; // Minimum scale for very small screens
                const maxScale = 0.45;  // Maximum scale for large screens
                
                // Scale based on container width (mobile-first approach)
                let responsiveScale = baseScale;
                if (appWidth < 480) {
                    // Mobile phones - significantly smaller coin
                    responsiveScale = Math.max(minScale, baseScale * 0.55);
                } else if (appWidth < 768) {
                    // Tablets - moderately smaller coin
                    responsiveScale = baseScale * 0.8;
                } else if (appWidth > 1200) {
                    // Large screens - slightly larger coin
                    responsiveScale = Math.min(maxScale, baseScale * 1.15);
                }

                // Create Spine instance using the official Spine.from() method
                const spine = Spine.from({
                    skeleton: "coinflip-skeleton",
                    atlas: "coinflip-atlas",
                    scale: responsiveScale, // Use calculated responsive scale
                    autoUpdate: true,
                });
                
                // Apply high-quality rendering settings to Spine textures
                try {
                    if (spine.skeleton && spine.skeleton.slots) {
                        spine.skeleton.slots.forEach(slot => {
                            if (slot.attachment && (slot.attachment as any).region && (slot.attachment as any).region.texture) {
                                const texture = (slot.attachment as any).region.texture;
                                if (texture && texture.source) {
                                    texture.source.scaleMode = 'linear';
                                    texture.source.antialias = true;
                                }
                            }
                        });
                    }
                } catch (err) {
                    console.warn("Could not apply texture quality settings to Spine:", err);
                }
                
                spineRef.current = spine;
                isLoadedRef.current = true;

                // Responsive positioning - center horizontally, adjust vertically based on screen size
                spine.x = appWidth / 2.05;
                
                // Adjust Y position based on screen size
                let yPosition = appHeight / 1.65; // Default position
                if (appWidth < 480) {
                    // Mobile: move coin down for better positioning
                    yPosition = appHeight / 1.7;
                } else if (appWidth < 768) {
                    // Tablet: slight adjustment
                    yPosition = appHeight / 1.6;
                }
                
                spine.y = yPosition;
                console.log("Responsive spine positioning:", { 
                    x: spine.x, 
                    y: spine.y, 
                    scale: responsiveScale,
                    containerSize: { width: appWidth, height: appHeight }
                });

                // Set skeleton to setup pose first
                spine.skeleton.setToSetupPose();
                spine.state.clearTracks();

                // Hide all bok (side) attachments and other coins, show only bronze coin face
                try {
                    spine.skeleton.setAttachment("bronze_bok", null as any);
                    spine.skeleton.setAttachment("silver_bok", null as any);
                    spine.skeleton.setAttachment("gold_bok", null as any);
                    spine.skeleton.setAttachment("coin_silver", null as any);
                    spine.skeleton.setAttachment("coin_gold", null as any);
                    // Keep bronze coin visible as the default state
                    spine.skeleton.setAttachment("coin_bronze", "coin_bronze");
                    console.log("Initial coin attachments set - showing only bronze coin face");
                } catch (err) {
                    console.warn("Failed to set initial coin attachments:", err);
                }

                // Add spine to stage (on top of background)
                app.stage.addChild(spine);

                console.log("PIXI Spine loaded successfully for coinflip : ", spine.skeleton);
                console.log(
                    "Available animations:",
                    spine.skeleton.data.animations.map((anim) => anim.name)
                );

                // Call onLoaded callback using ref to get latest version
                if (onLoadedRef.current) {
                    onLoadedRef.current();
                }
            } catch (err) {
                if (isMounted) {
                    const error = err instanceof Error ? err : new Error("Failed to initialize PIXI spine");
                    console.error("PIXI spine initialization error:", error);
                    if (onErrorRef.current) {
                        onErrorRef.current(error);
                    }
                }
            }
        };

        initializePIXISpine();

        // Add resize and scroll event listeners
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            isMounted = false;
            clearTimeout(resizeTimeout);
            clearTimeout(scrollTimeout);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('scroll', handleScroll);

            if (appRef.current) {
                appRef.current.destroy(true, true);
                appRef.current = null;
            }
            spineRef.current = null;
            isLoadedRef.current = false;
        };
    }, []); // Remove dependencies to prevent re-renders

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                minHeight: "300px", // Ensure minimum height on very small screens
                touchAction: "pan-y", // Allow vertical scrolling but prevent other touch gestures
                WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
                // Prevent size changes during scroll on mobile
                contain: "layout style", // CSS containment to prevent layout shifts
            }}
        />
    );
});

export default SpineCoinflipAnimation;
