import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as PIXI from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export interface SpineDiceAnimationHandle {
    playBackground: (animationName?: string, loop?: boolean) => void;
    playCharacter: (animationName?: string, loop?: boolean) => void;
    playDice: (animationName?: string, loop?: boolean) => void;
    startRolling: (targetNumber: number) => void;
    rollDice: (targetNumber: number, result: number, betType: "under" | "over", onComplete?: () => void) => void;
    resetDice: () => void;
    stopAll: () => void;
    updateProgressBar: (targetNumber: number, betType: "under" | "over", currentProgress?: number) => void;
}

interface SpineDiceAnimationProps {
    width?: number;
    height?: number;
    targetNumber?: number;
    betType?: "under" | "over";
    onLoaded?: () => void;
    onError?: (error: Error) => void;
}

// Asset paths for dice Spine animations
const DICE_JSON = "/assets/dice/Animations/json/DICE_v2_PS.json";
const DICE_ATLAS = "/assets/dice/Animations/json/DICE_v2_PS.atlas";

const CHARACTER_JSON = "/assets/coinflip/Animations/json/character_Dice_FlipCoin.json";
const CHARACTER_ATLAS = "/assets/coinflip/Animations/json/character_Dice_FlipCoin.atlas";

const DICE_BACKGROUND = "/assets/dice/Backgrounds/Frame.png";
const GAME_TABLE = "/assets/dice/CharactersSymbols/game_table.png";

// Animation mapping for dice
export const DiceAnimations = {
    CHARACTER_IDLE: "idle",
    CHARACTER_IDLE_2: "idle2",
    CHARACTER_LOOP_1: "loop1",
    CHARACTER_LOOP_2: "loop2",
    CHARACTER_LOOP_3: "loop3",
    CHARACTER_LOOP_4: "loop4",
    COIN_IDLE: "coin_idle",
} as const;

const SpineDiceAnimation = forwardRef<SpineDiceAnimationHandle, SpineDiceAnimationProps>(({ width, height, targetNumber = 50, betType = "under", onLoaded, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const backgroundSpineRef = useRef<Spine | null>(null);
    const characterSpineRef = useRef<Spine | null>(null);
    const diceSpineRef = useRef<Spine | null>(null);
    const progressBarRef = useRef<PIXI.Container | null>(null);
    const coinIconRef = useRef<PIXI.Sprite | null>(null);
    const isLoadedRef = useRef(false);
    const onLoadedRef = useRef(onLoaded);
    const onErrorRef = useRef(onError);
    const currentProgressRef = useRef(0);
    const isRollingRef = useRef(false);
    const rollingAnimationRef = useRef<number | null>(null);
    const diceNumberTextRef = useRef<PIXI.Text | null>(null);
    const currentRollingNumberRef = useRef(50);

    useEffect(() => {
        onLoadedRef.current = onLoaded;
        onErrorRef.current = onError;
    });

    useImperativeHandle(ref, () => ({
        playBackground: (animationName = "idle", loop = true) => {
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
        playCharacter: (animationName = DiceAnimations.CHARACTER_IDLE, loop = true) => {
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
        playDice: (animationName = DiceAnimations.COIN_IDLE, loop = true) => {
            console.log(`Playing dice animation: ${animationName}`);
            if (diceSpineRef.current && isLoadedRef.current) {
                try {
                    const spine = diceSpineRef.current;
                    spine.state.clearTracks();
                    spine.state.setAnimation(0, animationName, loop);
                } catch (err) {
                    console.error(`Failed to play dice animation "${animationName}":`, err);
                }
            }
        },
        startRolling: (targetNumber: number) => {
            console.log(`Starting continuous roll for target: ${targetNumber}`);
            if (!isLoadedRef.current) return;

            try {
                isRollingRef.current = true;

                // Start character rolling animation
                if (characterSpineRef.current) {
                    const spine = characterSpineRef.current;
                    spine.state.clearTracks();
                    spine.state.clearListeners();
                    spine.skeleton.setToSetupPose();
                    spine.state.setAnimation(0, DiceAnimations.CHARACTER_LOOP_1, true);
                }

                // Start dice rolling animation
                if (diceSpineRef.current) {
                    diceSpineRef.current.state.clearTracks();
                    diceSpineRef.current.state.setAnimation(0, DiceAnimations.COIN_IDLE, true);
                }

                // Start continuous coin animation
                const startTime = Date.now();
                
                // Cache container dimensions to avoid repeated DOM queries
                const containerRect = containerRef.current?.getBoundingClientRect();
                const isMobile = containerRect ? containerRect.width < 768 : false;
                const barWidth = isMobile ? 280 : 480;
                const barHalfWidth = barWidth / 2;
                
                const continuousRoll = () => {
                    if (!isRollingRef.current) return; 
                    const elapsed = Date.now() - startTime;
                    const oscillationFreq = 8; 
                    const oscillationAmplitude = 45; 
                    const centerPosition = 50; 
                    const oscillation = Math.sin(elapsed * oscillationFreq / 1000) * oscillationAmplitude;
                    const currentPosition = Math.max(0, Math.min(100, centerPosition + oscillation));
                    const randomNumber = Math.floor(Math.random() * 100) + 1;
                    currentRollingNumberRef.current = randomNumber;
                    if (diceNumberTextRef.current) {
                        diceNumberTextRef.current.text = randomNumber.toString();
                    }

                    if (coinIconRef.current) {
                        // Clamp position to keep coin within bar bounds (2% padding on each side)
                        const clampedPosition = Math.max(2, Math.min(98, currentPosition));
                        const coinX = -barHalfWidth + (clampedPosition / 100) * barWidth;
                        coinIconRef.current.x = coinX;
                        coinIconRef.current.y = 0;
                    }
                    rollingAnimationRef.current = requestAnimationFrame(continuousRoll);
                };
                continuousRoll();

            } catch (err) {
                isRollingRef.current = false;
            }
        },
        rollDice: (targetNumber: number, result: number, betType: "under" | "over", onComplete?: () => void) => {
            console.log(`Showing dice result: target=${targetNumber}, result=${result}`);
            if (!isLoadedRef.current) return;
            try {
                // Stop continuous rolling
                isRollingRef.current = false;
                if (rollingAnimationRef.current) {
                    cancelAnimationFrame(rollingAnimationRef.current);
                    rollingAnimationRef.current = null;
                }

                // Animate coin moving to final result position
                const rollDuration = 1500;
                const startTime = Date.now();
                let animationFrame: number;

                // Cache container dimensions for the roll animation
                const containerRect = containerRef.current?.getBoundingClientRect();
                const isMobile = containerRect ? containerRect.width < 768 : false;
                const barWidth = isMobile ? 280 : 480;
                const barHalfWidth = barWidth / 2;

                // Get current coin position as starting point
                const startPosition = coinIconRef.current ? 
                    ((coinIconRef.current.x + barHalfWidth) / barWidth) * 100 : 50; // Convert current X to percentage

                const animateCoin = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / rollDuration, 1);

                    let currentPosition;
                    if (progress < 1) {
                        // Smooth movement from current position to result with slight oscillation
                        const oscillationAmplitude = 10 * (1 - progress); // Decreasing amplitude
                        const basePosition = startPosition + (result - startPosition) * progress;
                        const oscillation = Math.sin(elapsed * 10 / 1000) * oscillationAmplitude;
                        currentPosition = Math.max(0, Math.min(100, basePosition + oscillation));

                        // Animate number transitioning to result
                        const displayNumber = Math.floor(currentRollingNumberRef.current + (result - currentRollingNumberRef.current) * progress);
                        if (diceNumberTextRef.current) {
                            diceNumberTextRef.current.text = displayNumber.toString();
                        }
                    } else {
                        // Final position
                        currentPosition = result;
                        // Show final result number
                        if (diceNumberTextRef.current) {
                            diceNumberTextRef.current.text = result.toString();
                        }
                    }

                    // Update coin position using cached dimensions
                    if (coinIconRef.current) {
                        // Clamp position to keep coin within bar bounds (2% padding on each side)
                        const clampedPosition = Math.max(2, Math.min(98, currentPosition));
                        const coinX = -barHalfWidth + (clampedPosition / 100) * barWidth;
                        coinIconRef.current.x = coinX;
                        coinIconRef.current.y = 0;
                    }

                    if (progress < 1) {
                        animationFrame = requestAnimationFrame(animateCoin);
                    } else {
                        // Roll completed - show character reaction
                        if (characterSpineRef.current) {
                            // Correct win/loss logic based on bet type
                            const isWin = betType === "under" ? result < targetNumber : result > targetNumber;
                            const reactionAnim = isWin ? DiceAnimations.CHARACTER_LOOP_3 : DiceAnimations.CHARACTER_LOOP_2;
                            const spine = characterSpineRef.current;
                            spine.state.clearTracks();
                            spine.state.clearListeners();
                            spine.skeleton.setToSetupPose();
                            spine.state.setAnimation(0, reactionAnim, false);

                            // Return to idle after reaction
                            setTimeout(() => {
                                if (characterSpineRef.current) {
                                    const spine = characterSpineRef.current;
                                    spine.state.clearTracks();
                                    spine.state.clearListeners();
                                    spine.skeleton.setToSetupPose();
                                    spine.state.setAnimation(0, DiceAnimations.CHARACTER_IDLE, true);
                                }
                            }, 2000);
                        }

                        if (onComplete) {
                            setTimeout(onComplete, 1000);
                        }
                    }
                };
                animateCoin();

            } catch (err) {
                console.error(`Failed to show dice result:`, err);
                if (onComplete) onComplete();
            }
        },
        resetDice: () => {
            console.log("Resetting dice");
            isRollingRef.current = false;
            if (rollingAnimationRef.current) {
                cancelAnimationFrame(rollingAnimationRef.current);
                rollingAnimationRef.current = null;
            }

        
            if (characterSpineRef.current) {
                const spine = characterSpineRef.current;
                spine.state.clearTracks();
                spine.state.clearListeners();
                spine.skeleton.setToSetupPose();
                spine.state.setAnimation(0, DiceAnimations.CHARACTER_IDLE, true);
            }

            if (diceSpineRef.current) {
                diceSpineRef.current.state.clearTracks();
                diceSpineRef.current.state.setAnimation(0, DiceAnimations.COIN_IDLE, true);
            }

            if (diceNumberTextRef.current) {
                diceNumberTextRef.current.text = "--";
            }
        },
        stopAll: () => {
            const allRefs = [
                backgroundSpineRef.current,
                characterSpineRef.current,
                diceSpineRef.current
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
        updateProgressBar: (targetNumber: number, betType: "under" | "over", currentProgress?: number) => {
            if (!progressBarRef.current || !isLoadedRef.current) return;

            try {
                const progressContainer = progressBarRef.current;
                const progressBar = progressContainer.getChildByName('progressBar') as PIXI.Graphics;
                const coinIcon = coinIconRef.current;

                if (progressBar) {
                    progressBar.clear();

                    // Get container dimensions to determine if mobile
                    const containerRect = containerRef.current?.getBoundingClientRect();
                    const isMobile = containerRect ? containerRect.width < 768 : false;

                    // Responsive container dimensions
                    const containerWidth = isMobile ? 320 : 520;
                    const containerHeight = isMobile ? 40 : 50;
                    const containerX = -containerWidth / 2;
                    const containerY = -containerHeight / 2;

                    // Responsive inner bar dimensions (smaller, centered inside container)
                    const barWidth = isMobile ? 280 : 480;
                    const barHeight = isMobile ? 16 : 20;
                    const barX = -barWidth / 2;
                    const barY = -barHeight / 2;

                    // Draw outer container with rounded corners and border
                    progressBar.roundRect(containerX, containerY, containerWidth, containerHeight, 15);
                    progressBar.fill({ color: 0x8B4513, alpha: 0.9 }); // Brown container
                    progressBar.stroke({ color: 0xffd700, width: 3 }); // Gold border

                    // Draw inner progress bar background
                    progressBar.roundRect(barX, barY, barWidth, barHeight, 8);
                    progressBar.fill({ color: 0x2a2a2a, alpha: 0.8 });

                    // Draw win/lose zones inside the inner bar
                    const winZoneColor = 0x10b981; // Green
                    const loseZoneColor = 0xef4444; // Red

                    if (betType === "under") {
                        // Win zone: 0 to targetNumber-1 (rounded left, square right)
                        const winWidth = ((targetNumber - 1) / 100) * barWidth;
                        if (winWidth > 0) {
                            progressBar.rect(barX, barY, winWidth, barHeight);
                            progressBar.fill({ color: winZoneColor, alpha: 0.8 });
                        }

                        // Lose zone: targetNumber to 100 (square left, rounded right)
                        const loseWidth = barWidth - winWidth;
                        if (loseWidth > 0) {
                            progressBar.rect(barX + winWidth, barY, loseWidth, barHeight);
                            progressBar.fill({ color: loseZoneColor, alpha: 0.8 });
                        }
                    } else {
                        // Lose zone: 0 to targetNumber (rounded left, square right)
                        const loseWidth = (targetNumber / 100) * barWidth;
                        if (loseWidth > 0) {
                            progressBar.rect(barX, barY, loseWidth, barHeight);
                            progressBar.fill({ color: loseZoneColor, alpha: 0.8 });
                        }

                        // Win zone: targetNumber+1 to 100 (square left, rounded right)
                        const winWidth = barWidth - loseWidth;
                        if (winWidth > 0) {
                            progressBar.rect(barX + loseWidth, barY, winWidth, barHeight);
                            progressBar.fill({ color: winZoneColor, alpha: 0.8 });
                        }
                    }

                    // Draw target line (adjusted slightly left)
                    const targetX = barX + (targetNumber / 100) * barWidth - 2;
                    progressBar.moveTo(targetX, containerY);
                    progressBar.lineTo(targetX, containerY + containerHeight);
                    progressBar.stroke({ color: 0xffd700, width: 4 });
                }

                // Update coin position (use inner bar dimensions)
                if (coinIcon && currentProgress !== undefined) {
                    // Make bar width responsive (must match the bar width used in drawing)
                    const containerRect = containerRef.current?.getBoundingClientRect();
                    const isMobile = containerRect ? containerRect.width < 768 : false;
                    const barWidth = isMobile ? 280 : 480; // Match the actual bar width
                    // Clamp position to keep coin within bar bounds (2% padding on each side)
                    const clampedProgress = Math.max(2, Math.min(98, currentProgress));
                    const coinX = (-barWidth / 2) + (clampedProgress / 100) * barWidth;
                    coinIcon.x = coinX;
                    coinIcon.y = 0; // Center vertically in the bar
                    currentProgressRef.current = currentProgress;
                }
            } catch (err) {
                console.error('Failed to update progress bar:', err);
            }
        },
    }));

    useEffect(() => {
        let isMounted = true;

        const initializePIXISpine = async () => {
            try {
                console.log("Initializing Dice Spine animation");
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
                diceSpineRef.current = null;

                containerRef.current.innerHTML = "";
                isLoadedRef.current = false;

                // Get container dimensions
                const appWidth = containerRef.current.clientWidth;
                const appHeight = containerRef.current.clientHeight;

                // Create PIXI Application with high-quality settings for crisp rendering
                const app = new PIXI.Application();
                await app.init({
                    width: appWidth,
                    height: appHeight,
                    backgroundColor: 0x1a1a2e,
                    antialias: true,
                    resolution: Math.max(window.devicePixelRatio || 1, 2), // Force minimum 2x resolution for crisp quality
                    autoDensity: true, // Automatically adjust for device pixel ratio
                    powerPreference: 'high-performance', // Use high-performance GPU when available
                    backgroundAlpha: 1, // Ensure full opacity background
                    resizeTo: containerRef.current, // Auto-resize to container for responsive behavior
                });

                // Add responsive canvas styling for mobile
                app.canvas.style.width = '100%';
                app.canvas.style.height = '100%';
                app.canvas.style.display = 'block';
                app.canvas.style.borderRadius = '0.8rem'; // rounded-md equivalent

                appRef.current = app;
                containerRef.current.appendChild(app.canvas);

                // Load all Spine assets and background
                await PIXI.Assets.add([
                    { alias: "dice-skeleton", src: DICE_JSON },
                    { alias: "dice-atlas", src: DICE_ATLAS },
                    { alias: "character-skeleton", src: CHARACTER_JSON },
                    { alias: "character-atlas", src: CHARACTER_ATLAS },
                    { alias: "dice-background", src: DICE_BACKGROUND },
                    { alias: "game-table", src: GAME_TABLE },
                    { alias: "coin-icon", src: "/assets/dice/UI-icons/coin.png" },
                ]);

                await PIXI.Assets.load([
                    "dice-skeleton", "dice-atlas",
                    "character-skeleton", "character-atlas",
                    "dice-background", "game-table", "coin-icon"
                ]);

                // Set texture quality settings for crisp rendering
                const diceAtlasTextureAsset = PIXI.Assets.get("dice-atlas");
                const characterAtlasTextureAsset = PIXI.Assets.get("character-atlas");
                const backgroundTextureAsset = PIXI.Assets.get("dice-background");
                const gameTableTextureAsset = PIXI.Assets.get("game-table");
                const coinIconTextureAsset = PIXI.Assets.get("coin-icon");
                
                // Ensure textures use high-quality filtering with proper null checks
                const textureAssets = [diceAtlasTextureAsset, characterAtlasTextureAsset, backgroundTextureAsset, gameTableTextureAsset, coinIconTextureAsset];
                textureAssets.forEach(texture => {
                    if (texture && texture.source) {
                        texture.source.scaleMode = 'linear'; // Use linear filtering for smooth scaling
                        texture.source.antialias = true;
                    }
                });

                if (!isMounted) return;

                // Determine if mobile based on width
                const isMobile = appWidth < 768; // md breakpoint

                // Create and add background sprite
                const backgroundTexture = PIXI.Assets.get("dice-background");
                const backgroundSprite = new PIXI.Sprite(backgroundTexture);

                // Scale background to fit the app dimensions
                backgroundSprite.width = appWidth;
                backgroundSprite.height = appHeight;
                backgroundSprite.x = 0;
                backgroundSprite.y = 0;

                // Add background to stage first (so it's behind everything)
                app.stage.addChild(backgroundSprite);

                // Create and add game table sprite with responsive scaling
                const gameTableTexture = PIXI.Assets.get("game-table");
                const gameTableSprite = new PIXI.Sprite(gameTableTexture);

                // Responsive table scaling and positioning
                const tableScale = isMobile ? 0.4 : 0.8;
                gameTableSprite.scale.set(tableScale);
                gameTableSprite.anchor.set(0.5);
                gameTableSprite.x = appWidth / 2;
                gameTableSprite.y = isMobile ? appHeight * 0.75 : appHeight * 0.77;
                gameTableSprite.zIndex = 2;

                // Add game table to stage (above background, below dice and character)
                app.stage.addChild(gameTableSprite);

                // Create progress bar container with responsive positioning
                const progressContainer = new PIXI.Container();
                progressContainer.x = appWidth / 2;
                progressContainer.y = isMobile ? appHeight * 0.88 : appHeight * 0.91;
                progressContainer.zIndex = 3;
                progressBarRef.current = progressContainer;

                // Create progress bar graphics
                const progressBar = new PIXI.Graphics();
                progressBar.name = 'progressBar';
                progressContainer.addChild(progressBar);

                // Create coin icon with responsive scaling
                const coinTexture = PIXI.Assets.get("coin-icon");
                
                // Apply high-quality settings to coin texture
                if (coinTexture && coinTexture.source) {
                    coinTexture.source.scaleMode = 'linear';
                    coinTexture.source.antialias = true;
                }
                
                const coinIcon = new PIXI.Sprite(coinTexture);
                coinIcon.anchor.set(0.5);
                coinIcon.scale.set(isMobile ? 0.12 : 0.15);
                coinIcon.y = 0;
                coinIconRef.current = coinIcon;
                progressContainer.addChild(coinIcon);

                // Add progress container to stage
                app.stage.addChild(progressContainer);

                // Create dice/coin spine (DICE_v2_PS) - this contains the rolling dice/coin
                const diceScale = isMobile ? 0.5 : 0.8;
                const diceSpine = Spine.from({
                    skeleton: "dice-skeleton",
                    atlas: "dice-atlas",
                    scale: diceScale,
                    autoUpdate: true,
                });
                diceSpineRef.current = diceSpine;

                // Position dice higher on the table
                diceSpine.x = appWidth / 2;
                diceSpine.y = isMobile ? appHeight * 0.45 : appHeight * 0.47;
                diceSpine.zIndex = 2;
                app.stage.addChild(diceSpine);

                // Create text for displaying number on dice
                const diceNumberText = new PIXI.Text({
                    text: "--",
                    style: {
                        fontFamily: 'Arial, sans-serif',
                        fontSize: isMobile ? 48 : 64,
                        fontWeight: 'bold',
                        fill: 0xFFFFFF,
                        stroke: { color: 0x606060 },
                        dropShadow: {
                            alpha: 0.2,
                            angle: Math.PI / 6,
                            blur: 2,
                            color: 0x000000,
                            distance: 1,
                        },
                    },
                });
                diceNumberText.anchor.set(0.5);
                diceNumberText.x = 0;
                diceNumberText.y = appHeight * 0.25;
                diceNumberText.zIndex = 10;
                diceNumberTextRef.current = diceNumberText;
                diceSpine.addChild(diceNumberText);

                // Create character spine (character_Dice_FlipCoin) - Zoggy with chair
                const characterSpine = Spine.from({
                    skeleton: "character-skeleton",
                    atlas: "character-atlas",
                    scale: isMobile ? 0.25 : 0.35,
                    autoUpdate: true,
                });
                characterSpineRef.current = characterSpine;

                // Apply high-quality rendering settings to Spine textures
                try {
                    const spineObjects = [diceSpine, characterSpine];
                    spineObjects.forEach(spine => {
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
                    });
                } catch (err) {
                    console.warn("Could not apply texture quality settings to Spine objects:", err);
                }

                // Position character on the right side (like in the image)
                characterSpine.x = appWidth / 2;
                characterSpine.y = appHeight * 0.58;
                characterSpine.zIndex = 1;
                app.stage.addChild(characterSpine);

                // Set all to setup pose initially
                const allSpines = [diceSpine, characterSpine];
                allSpines.forEach(spine => {
                    if (spine) {
                        spine.skeleton.setToSetupPose();
                        spine.state.clearTracks();
                    }
                });

                isLoadedRef.current = true;

                // Start idle animations
                diceSpine.state.setAnimation(0, DiceAnimations.COIN_IDLE, true);
                characterSpine.state.setAnimation(0, DiceAnimations.CHARACTER_IDLE, true);

                // Initialize progress bar with responsive dimensions
                if (progressBarRef.current) {
                    const progressBar = progressBarRef.current.getChildByName('progressBar') as PIXI.Graphics;
                    if (progressBar) {
                        // Responsive container dimensions
                        const containerWidth = isMobile ? 320 : 520; // Smaller on mobile
                        const containerHeight = isMobile ? 40 : 50; // Smaller on mobile
                        const containerX = -containerWidth / 2;
                        const containerY = -containerHeight / 2;

                        // Responsive inner bar dimensions (smaller, centered inside container)
                        const barWidth = isMobile ? 280 : 480; // Smaller on mobile
                        const barHeight = isMobile ? 16 : 20; // Smaller on mobile
                        const barX = -barWidth / 2;
                        const barY = -barHeight / 2;

                        // Draw outer container with rounded corners and border
                        progressBar.roundRect(containerX, containerY, containerWidth, containerHeight, 15);
                        progressBar.fill({ color: 0x8B4513, alpha: 0.9 }); // Brown container
                        progressBar.stroke({ color: 0xffd700, width: 3 }); // Gold border

                        // Draw inner progress bar background
                        progressBar.roundRect(barX, barY, barWidth, barHeight, 8);
                        progressBar.fill({ color: 0x2a2a2a, alpha: 0.8 });

                        // Draw initial zones based on default target
                        const winZoneColor = 0x10b981;
                        const loseZoneColor = 0xef4444;

                        if (betType === "under") {
                            const winWidth = ((targetNumber - 1) / 100) * barWidth;
                            if (winWidth > 0) {
                                progressBar.rect(barX, barY, winWidth, barHeight);
                                progressBar.fill({ color: winZoneColor, alpha: 0.8 });
                            }

                            const loseWidth = barWidth - winWidth;
                            if (loseWidth > 0) {
                                progressBar.rect(barX + winWidth, barY, loseWidth, barHeight);
                                progressBar.fill({ color: loseZoneColor, alpha: 0.8 });
                            }
                        } else {
                            const loseWidth = (targetNumber / 100) * barWidth;
                            if (loseWidth > 0) {
                                progressBar.rect(barX, barY, loseWidth, barHeight);
                                progressBar.fill({ color: loseZoneColor, alpha: 0.8 });
                            }

                            const winWidth = barWidth - loseWidth;
                            if (winWidth > 0) {
                                progressBar.rect(barX + loseWidth, barY, winWidth, barHeight);
                                progressBar.fill({ color: winZoneColor, alpha: 0.8 });
                            }
                        }

                        // Draw target line (adjusted slightly left)
                        const targetX = barX + (targetNumber / 100) * barWidth - 2;
                        progressBar.moveTo(targetX, containerY);
                        progressBar.lineTo(targetX, containerY + containerHeight);
                        progressBar.stroke({ color: 0xffd700, width: 4 });
                    }

                    // Position coin at start - center it in the bar
                    if (coinIconRef.current) {
                        coinIconRef.current.x = 0; // Start position (center of bar)
                        coinIconRef.current.y = 0; // Center vertically in bar
                    }
                }

                if (onLoadedRef.current) {
                    onLoadedRef.current();
                }
            } catch (err) {
                if (isMounted) {
                    const error = err instanceof Error ? err : new Error("Failed to initialize PIXI spine for dice");
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

            // Stop any ongoing rolling animation
            isRollingRef.current = false;
            if (rollingAnimationRef.current) {
                cancelAnimationFrame(rollingAnimationRef.current);
                rollingAnimationRef.current = null;
            }

            if (appRef.current) {
                appRef.current.destroy(true, true);
                appRef.current = null;
            }

            backgroundSpineRef.current = null;
            characterSpineRef.current = null;
            diceSpineRef.current = null;
            progressBarRef.current = null;
            coinIconRef.current = null;
            diceNumberTextRef.current = null;
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        />
    );
});

SpineDiceAnimation.displayName = "SpineDiceAnimation";

export default SpineDiceAnimation;
