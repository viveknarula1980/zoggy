import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as PIXI from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import Matter, { Bodies, Body, Composite, Engine, Events, Runner, World } from "matter-js";

export interface SpinePlinkoAnimationHandle {
    playBackground: () => void;
    playCharacter: (animationName?: string, loop?: boolean) => void;
    playRandomIdleAnimation: () => void;
    dropBall: (ballIndex: number, targetSlot: number, onComplete?: () => void) => void;
    triggerPegHit: (pegIndex: number) => void;
    triggerSlotWin: (slotIndex: number, multiplier: number) => void;
    resetGame: () => void;
    stopAll: () => void;
    setBallPhysics: (ballsData: Array<{ x: number; y: number; ballIndex: number }>) => void;
}

interface SpinePlinkoAnimationProps {
    width?: number;
    height?: number;
    rows: number;
    multipliers: string[];
    onLoaded?: () => void;
    onError?: (error: Error) => void;
}

// Asset paths for Plinko Spine animations
const PLINKO_PS_JSON = "/assets/Plinko/Animations/json/Plinko_PS.json";
const PLINKO_PS_ATLAS = "/assets/Plinko/Animations/json/Plinko_PS.atlas";

const ZOGGY_JSON = "/assets/Plinko/Animations/json/Zoggy.json";
const ZOGGY_ATLAS = "/assets/Plinko/Animations/json/Zoggy.atlas";

// Background assets (PNG/JPG)
const BG_IMAGE = "/assets/Plinko/Backgrounds/bg.png";
const BOARD_IMAGE = "/assets/Plinko/Backgrounds/board.png";
const ZOGGY_COIN_IMAGE = "/assets/Plinko/CharactersSymbols/Zoggy-coin.png";

// Animation mapping for Plinko
export const PlinkoAnimations = {
    // Zoggy character animations - Available: idle_1, idle_2, idle_3, idle_4, loop_1, loop_2, loop_3, loop_4
    CHARACTER_IDLE_1: "idle_1",
    CHARACTER_IDLE_2: "idle_2",
    CHARACTER_IDLE_3: "idle_3",
    CHARACTER_IDLE_4: "idle_4",
    CHARACTER_LOOP_1: "loop_1", // Ball drop reaction
    CHARACTER_LOOP_2: "loop_2", // Small win reaction
    CHARACTER_LOOP_3: "loop_3", // Medium win reaction
    CHARACTER_LOOP_4: "loop_4", // Big win reaction

    // Plinko_PS animations
    PEG_VFX: "peg_vfx",
    BUTTON_RED: "button_red",
    BUTTON_ORANGE: "button_orange",
    BUTTON_YELLOW: "button_yellow",
    BUTTON_DARK_BLUE: "button_darkblue",
    BUTTON_BLUE: "button_blue",
    HOLE_VFX: "hole_vfx",
} as const;

// Slot colors mapping to animations
const SLOT_ANIMATIONS = [
    PlinkoAnimations.BUTTON_RED,
    PlinkoAnimations.BUTTON_ORANGE,
    PlinkoAnimations.BUTTON_YELLOW,
    PlinkoAnimations.BUTTON_DARK_BLUE,
    PlinkoAnimations.BUTTON_BLUE,
];

const SpinePlinkoAnimation = forwardRef<SpinePlinkoAnimationHandle, SpinePlinkoAnimationProps>(({
    rows,
    multipliers,
    onLoaded,
    onError
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);

    // Spine refs
    const characterSpineRef = useRef<Spine | null>(null);
    const plinkoSpineRef = useRef<Spine | null>(null);

    // Background elements
    const backgroundRef = useRef<PIXI.Sprite | null>(null);
    const boardRef = useRef<PIXI.Sprite | null>(null);

    // Game elements
    const pegsRef = useRef<Spine[]>([]);
    const ballsRef = useRef<PIXI.Sprite[]>([]);
    const slotsRef = useRef<Spine[]>([]);
    const holesRef = useRef<Spine[]>([]);

    // Matter.js physics
    const engineRef = useRef<Engine | null>(null);
    const runnerRef = useRef<Runner | null>(null);
    const physicsBodyRef = useRef<Body[]>([]);
    const ballBodiesRef = useRef<Body[]>([]);

    const isLoadedRef = useRef(false);
    const onLoadedRef = useRef(onLoaded);
    const onErrorRef = useRef(onError);

    // Update refs when props change
    useEffect(() => {
        onLoadedRef.current = onLoaded;
        onErrorRef.current = onError;
    });

    useImperativeHandle(ref, () => ({
        playBackground: () => {
            console.log("Playing background animation");
            // Background is static PNG, no animation needed
        },
        playCharacter: (animationName = PlinkoAnimations.CHARACTER_IDLE_1, loop = true) => {
            console.log(`Playing character animation: ${animationName}`);
            if (characterSpineRef.current && isLoadedRef.current) {
                try {
                    const spine = characterSpineRef.current;
                    // More thorough clearing for better animation transitions
                    spine.state.clearTracks();
                    spine.state.clearListeners();
                    spine.skeleton.setToSetupPose();
                    spine.state.setAnimation(0, animationName, loop);
                } catch (err) {
                    console.error(`Failed to play character animation "${animationName}":`, err);
                }
            }
        },
        playRandomIdleAnimation: () => {
            console.log("Playing random idle animation");
            if (characterSpineRef.current && isLoadedRef.current) {
                try {
                    const idleAnimations = [
                        PlinkoAnimations.CHARACTER_IDLE_1,
                        PlinkoAnimations.CHARACTER_IDLE_2,
                        PlinkoAnimations.CHARACTER_IDLE_3,
                        PlinkoAnimations.CHARACTER_IDLE_4
                    ];
                    const randomIdle = idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
                    
                    const spine = characterSpineRef.current;
                    spine.state.clearTracks();
                    spine.state.clearListeners();
                    spine.skeleton.setToSetupPose();
                    spine.state.setAnimation(0, randomIdle, true);
                } catch (err) {
                    console.error(`Failed to play random idle animation:`, err);
                }
            }
        },
        dropBall: (ballIndex: number, targetSlot: number, onComplete?: () => void) => {
            console.log(`Dropping ball ${ballIndex} to slot ${targetSlot}`);
            if (!isLoadedRef.current || !engineRef.current || !appRef.current) return;

            // Create ball sprite using zoggy-coin texture
            const coinTexture = PIXI.Assets.get("zoggy-coin");
            const ball = new PIXI.Sprite(coinTexture);
            ball.x = appRef.current.screen.width / 2; // Start from center top
            ball.y = 50;
            ball.anchor.set(0.5);
            ball.scale.set(0.15); // Smaller scale for realistic size

            // Create Matter.js physics body for the ball
            const ballBody = Bodies.circle(ball.x, ball.y, 8, {
                restitution: 0.6,
                friction: 0.1,
                frictionAir: 0.01,
                density: 0.001,
                label: `ball-${ballIndex}`
            });

            // Store references
            ballsRef.current[ballIndex] = ball;
            ballBodiesRef.current[ballIndex] = ballBody;
            (ballBody as any).ballIndex = ballIndex;
            (ballBody as any).targetSlot = targetSlot;
            (ballBody as any).onComplete = onComplete;

            // Add to physics world and display
            World.add(engineRef.current.world, ballBody);
            appRef.current.stage.addChild(ball);
            
            // Character reaction to ball drop
            if (characterSpineRef.current) {
                const spine = characterSpineRef.current;
                spine.state.clearTracks();
                spine.state.clearListeners();
                spine.skeleton.setToSetupPose();
                spine.state.setAnimation(0, PlinkoAnimations.CHARACTER_LOOP_1, false);
                
                // Return to idle after ball drop reaction
                setTimeout(() => {
                    if (characterSpineRef.current) {
                        const spine = characterSpineRef.current;
                        spine.state.clearTracks();
                        spine.state.clearListeners();
                        spine.skeleton.setToSetupPose();
                        spine.state.setAnimation(0, PlinkoAnimations.CHARACTER_IDLE_1, true);
                    }
                }, 1500);
            }
        },
        triggerPegHit: (pegIndex: number) => {
            console.log(`Triggering peg hit effect at peg ${pegIndex}`);
            if (pegsRef.current[pegIndex] && isLoadedRef.current) {
                try {
                    // Play peg VFX animation on the specific peg
                    const pegSpine = pegsRef.current[pegIndex];
                    pegSpine.state.setAnimation(0, PlinkoAnimations.PEG_VFX, false);

                    // Return to idle after VFX
                    setTimeout(() => {
                        if (pegSpine) {
                            pegSpine.state.clearTracks();
                        }
                    }, 500);
                } catch (err) {
                    console.error(`Failed to play peg VFX:`, err);
                }
            }
        },
        triggerSlotWin: (slotIndex: number, multiplier: number) => {
            console.log(`Triggering slot win at slot ${slotIndex} with multiplier ${multiplier}`);
            if (holesRef.current[slotIndex] && isLoadedRef.current) {
                try {
                    const holeSpine = holesRef.current[slotIndex];

                    // Play hole VFX animation based on multiplier value
                    if (multiplier >= 5) {
                        // High multiplier - play intense VFX
                        holeSpine.state.setAnimation(0, "hole_vfx", false);
                    } else if (multiplier >= 2) {
                        // Medium multiplier - play medium VFX
                        holeSpine.state.setAnimation(0, "hole_vfx", false);
                    } else {
                        // Low multiplier - play subtle VFX
                        holeSpine.state.setAnimation(0, "hole_vfx", false);
                    }

                    // Character reaction based on multiplier value
                    if (characterSpineRef.current) {
                        const spine = characterSpineRef.current;
                        spine.state.clearTracks();
                        spine.state.clearListeners();
                        spine.skeleton.setToSetupPose();
                        
                        let reactionAnim;
                        if (multiplier >= 10) {
                            // Big win reaction for high multipliers
                            reactionAnim = PlinkoAnimations.CHARACTER_LOOP_4;
                        } else if (multiplier >= 5) {
                            // Medium win reaction
                            reactionAnim = PlinkoAnimations.CHARACTER_LOOP_3;
                        } else if (multiplier >= 2) {
                            // Small win reaction
                            reactionAnim = PlinkoAnimations.CHARACTER_LOOP_2;
                        } else {
                            // Minimal reaction for low multipliers
                            reactionAnim = PlinkoAnimations.CHARACTER_LOOP_2;
                        }
                        
                        spine.state.setAnimation(0, reactionAnim, false);
                        
                        // Return to idle after reaction
                        setTimeout(() => {
                            if (characterSpineRef.current) {
                                const spine = characterSpineRef.current;
                                spine.state.clearTracks();
                                spine.state.clearListeners();
                                spine.skeleton.setToSetupPose();
                                spine.state.setAnimation(0, PlinkoAnimations.CHARACTER_IDLE_1, true);
                            }
                        }, 2500);
                    }

                    // Return to idle after animation
                    setTimeout(() => {
                        if (holeSpine) {
                            holeSpine.state.clearTracks();
                        }
                    }, 2000);
                } catch (err) {
                    console.error(`Failed to play hole win animation:`, err);
                }
            }
        },
        resetGame: () => {
            console.log("Resetting Plinko game");

            // Clear all balls from display and physics
            ballsRef.current.forEach(ball => {
                if (ball && ball.parent) {
                    ball.parent.removeChild(ball);
                }
            });

            // Remove physics bodies
            if (engineRef.current) {
                ballBodiesRef.current.forEach(body => {
                    if (body) {
                        World.remove(engineRef.current!.world, body);
                    }
                });
            }

            ballsRef.current = [];
            ballBodiesRef.current = [];

            // Reset character to idle with thorough clearing
            if (characterSpineRef.current) {
                const spine = characterSpineRef.current;
                spine.state.clearTracks();
                spine.state.clearListeners();
                spine.skeleton.setToSetupPose();
                spine.state.setAnimation(0, PlinkoAnimations.CHARACTER_IDLE_1, true);
            }

            // Reset all slot animations
            slotsRef.current.forEach(slot => {
                if (slot) {
                    slot.state.clearTracks();
                }
            });
        },
        stopAll: () => {
            const allSpines = [
                characterSpineRef.current,
                plinkoSpineRef.current,
                ...slotsRef.current
            ];
            allSpines.forEach(spine => {
                if (spine && isLoadedRef.current) {
                    try {
                        spine.state.clearTracks();
                    } catch (err) {
                        console.warn("Failed to stop animation:", err);
                    }
                }
            });
        },
        setBallPhysics: (ballsData: Array<{ x: number; y: number; ballIndex: number }>) => {
            // This method is now handled internally by Matter.js physics engine
            // Ball positions are automatically synced in the physics update loop
        },
    }));

    useEffect(() => {
        let isMounted = true;

        const initializePIXISpine = async () => {
            try {
                console.log(`Initializing Plinko Spine animation with ${rows} rows`);
                if (!containerRef.current) return;

                // Clean up existing app
                if (appRef.current) {
                    console.log("Cleaning up existing PIXI app");
                    appRef.current.destroy(true, true);
                    appRef.current = null;
                }

                // Clear all refs
                characterSpineRef.current = null;
                plinkoSpineRef.current = null;
                backgroundRef.current = null;
                boardRef.current = null;
                pegsRef.current = [];
                ballsRef.current = [];
                slotsRef.current = [];

                containerRef.current.innerHTML = "";
                isLoadedRef.current = false;

                // Get container dimensions
                const appWidth = 1080;
                const appHeight = 600;

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

                // Enable z-index sorting
                app.stage.sortableChildren = true;

                // Add rounded corners to match game area styling
                app.canvas.style.borderRadius = '0.8rem';

                appRef.current = app;
                containerRef.current.appendChild(app.canvas);

                // Load all assets
                await PIXI.Assets.add([
                    { alias: "plinko-bg", src: BG_IMAGE },
                    { alias: "plinko-board", src: BOARD_IMAGE },
                    { alias: "zoggy-coin", src: ZOGGY_COIN_IMAGE },
                    { alias: "zoggy-skeleton", src: ZOGGY_JSON },
                    { alias: "zoggy-atlas", src: ZOGGY_ATLAS },
                    { alias: "plinko-skeleton", src: PLINKO_PS_JSON },
                    { alias: "plinko-atlas", src: PLINKO_PS_ATLAS },
                ]);

                await PIXI.Assets.load([
                    "plinko-bg", "plinko-board", "zoggy-coin",
                    "zoggy-skeleton", "zoggy-atlas",
                    "plinko-skeleton", "plinko-atlas"
                ]);

                if (!isMounted) return;

                console.log("All Plinko assets loaded successfully");

                // Create background (bg.png)
                const bgTexture = PIXI.Assets.get("plinko-bg");
                const background = new PIXI.Sprite(bgTexture);

                // Scale background to fit container
                const bgScaleX = appWidth / background.width;
                const bgScaleY = appHeight / background.height;
                const bgScale = Math.max(bgScaleX, bgScaleY); // Cover the entire area

                background.scale.set(bgScale);
                background.x = -450;
                background.y = (appHeight - background.height * bgScale) / 2;
                background.zIndex = 0; // Behind everything

                backgroundRef.current = background;
                app.stage.addChild(background);

                // Create board (board.png) - positioned in middle bottom
                const boardTexture = PIXI.Assets.get("plinko-board");
                const board = new PIXI.Sprite(boardTexture);

                // Scale board appropriately
                const boardScale = 0.6;
                board.scale.set(boardScale);
                board.anchor.set(0.5, 1); // Anchor bottom center
                board.x = appWidth / 2.7;
                board.y = appHeight - 50; // 50px from bottom
                board.zIndex = 1; // Behind pegs and holes

                boardRef.current = board;
                app.stage.addChild(board);

                // Create Zoggy character spine
                const characterSpine = Spine.from({
                    skeleton: "zoggy-skeleton",
                    atlas: "zoggy-atlas",
                    scale: 1.2,
                    autoUpdate: true,
                });
                characterSpineRef.current = characterSpine;
                characterSpine.x = appWidth / 1.55; // Right side
                characterSpine.y = appHeight / 1.6;
                characterSpine.zIndex = 0; // In front
                app.stage.addChild(characterSpine);

                // Create Plinko_PS spine for slots and effects
                const plinkoSpine = Spine.from({
                    skeleton: "plinko-skeleton",
                    atlas: "plinko-atlas",
                    scale: 0.8,
                    autoUpdate: true,
                });
                plinkoSpineRef.current = plinkoSpine;
                plinkoSpine.x = appWidth / 2;
                plinkoSpine.y = appHeight - 100; // Bottom area for slots
                plinkoSpine.zIndex = 2; // Behind pegs but in front of board
                app.stage.addChild(plinkoSpine);

                // Initialize Matter.js physics engine
                const engine = Engine.create();
                engine.gravity.y = 0.8;
                engineRef.current = engine;

                const runner = Runner.create();
                runnerRef.current = runner;
                Runner.run(runner, engine);

                // Create physics boundaries
                const walls = [
                    Bodies.rectangle(appWidth / 2, -25, appWidth, 50, { isStatic: true }), // Top
                    Bodies.rectangle(-25, appHeight / 2, 50, appHeight, { isStatic: true }), // Left
                    Bodies.rectangle(appWidth + 25, appHeight / 2, 50, appHeight, { isStatic: true }), // Right
                    Bodies.rectangle(appWidth / 2, appHeight + 25, appWidth, 50, { isStatic: true }) // Bottom
                ];
                World.add(engine.world, walls);

                // Calculate board bounds based on the board sprite with better spacing
                const boardBounds = {
                    x: appWidth / 2.7 - (boardRef.current!.width * 0.6) / 2 + 40, // More left margin
                    y: appHeight * 0.25, // Start lower for better spacing
                    width: boardRef.current!.width * 0.6 * 0.6, // Narrower width for better fit
                    height: appHeight * 0.35 // Shorter height for better proportions
                };

                // Create pegs using Plinko_PS eclipse spine animation with better spacing
                const pegRadius = 16;
                const horizontalGap = boardBounds.width / (rows - 6.5); // More spacing
                const verticalGap = boardBounds.height / (rows - 3.5); // More spacing

                for (let row = 0; row < rows; row++) {
                    const pegsInRow = row + 1;
                    const rowWidth = (pegsInRow - 1) * horizontalGap;
                    const startX = (boardBounds.x + (boardBounds.width - rowWidth) / 2) - 30;
                    const y = boardBounds.y + row * verticalGap;

                    for (let col = 0; col < pegsInRow; col++) {
                        const x = startX + col * horizontalGap;

                        // Create peg using Plinko_PS eclipse spine
                        const pegSpine = Spine.from({
                            skeleton: "plinko-skeleton",
                            atlas: "plinko-atlas",
                            scale: 0.6, // Smaller scale for better proportions
                            autoUpdate: true,
                        });
                        pegSpine.x = x;
                        pegSpine.y = y;

                        // Set eclipse attachment to show the peg visual
                        pegSpine.skeleton.setToSetupPose();

                        // Set eclipse slot to visible and attach eclipse
                        const eclipseSlot = pegSpine.skeleton.findSlot("eclipse");
                        if (eclipseSlot) {
                            eclipseSlot.color.a = 1.0; // Make slot visible
                            pegSpine.skeleton.setAttachment("eclipse", "eclipse");
                            console.log(`Created peg at (${x}, ${y}) with eclipse attachment`);
                        } else {
                            console.log("Eclipse slot not found!");
                        }

                        // Make peg visible and in front
                        pegSpine.alpha = 1.0;
                        pegSpine.visible = true;
                        pegSpine.zIndex = 10; // In front of everything

                        // Create physics body for peg collision
                        const pegBody = Bodies.circle(x, y, pegRadius, {
                            isStatic: true,
                            restitution: 0.8,
                            label: 'peg'
                        });
                        World.add(engine.world, pegBody);

                        pegsRef.current.push(pegSpine);
                        physicsBodyRef.current.push(pegBody);
                        app.stage.addChild(pegSpine);
                    }
                }

                // Create holes at the bottom using Plinko_PS Spine animations
                const holeCount = rows + 1;
                const holeY = appHeight - 120; // Position at bottom of board area

                // Define hole colors for different multiplier values
                const holeColors = ['hole_red', 'hole_orange', 'hole_yellow', 'hole_blue', 'hole_dark_blue'];
                for (let i = 0; i < holeCount; i++) {
                    // Better hole spacing - align with board bounds
                    const holeSpacing = boardBounds.width / (holeCount - 8);
                    const holeX = (boardBounds.x + i * holeSpacing) - 80;

                    // Create hole using Plinko_PS spine - single instance approach
                    const holeSpine = Spine.from({
                        skeleton: "plinko-skeleton",
                        atlas: "plinko-atlas",
                        scale: 0.4, // Smaller scale for better proportions
                        autoUpdate: true,
                    });
                    holeSpine.x = holeX;
                    holeSpine.y = holeY;
                    holeSpine.zIndex = 8;

                    // Set to setup pose and make all slots visible
                    holeSpine.skeleton.setToSetupPose();

                    // Make all hole-related slots visible
                    const allSlots = holeSpine.skeleton.slots;
                    for (const slot of allSlots) {
                        if (slot.data.name.includes('hole')) {
                            slot.color.a = 1.0;
                            slot.color.r = 1.0;
                            slot.color.g = 1.0;
                            slot.color.b = 1.0;
                        }
                    }

                    // Set the main hole attachment
                    holeSpine.skeleton.setAttachment("hole", "hole");

                    // Make spine visible
                    holeSpine.alpha = 1.0;
                    holeSpine.visible = true;

                    // Create sensor for ball detection
                    const sensor = Bodies.rectangle(holeX, holeY, 40, 40, {
                        isStatic: true,
                        isSensor: true,
                        label: `hole-${i}`
                    });
                    (sensor as any).slotIndex = i;
                    World.add(engine.world, sensor);

                    holesRef.current.push(holeSpine);
                    physicsBodyRef.current.push(sensor);
                    app.stage.addChild(holeSpine);

                    console.log(`Created Spine hole ${i} at (${holeX}, ${holeY})`);
                }

                // Setup collision detection for ball landing
                Events.on(engine, 'collisionStart', (event) => {
                    event.pairs.forEach((pair) => {
                        const { bodyA, bodyB } = pair;

                        // Check if ball hits hole sensor
                        const ball = bodyA.label.startsWith('ball-') ? bodyA :
                            bodyB.label.startsWith('ball-') ? bodyB : null;
                        const hole = bodyA.label.startsWith('hole-') ? bodyA :
                            bodyB.label.startsWith('hole-') ? bodyB : null;

                        if (ball && hole) {
                            const ballIndex = (ball as any).ballIndex;
                            const slotIndex = (hole as any).slotIndex;
                            const onComplete = (ball as any).onComplete;

                            // Remove ball from physics and display
                            setTimeout(() => {
                                World.remove(engine.world, ball);
                                const ballSprite = ballsRef.current[ballIndex];
                                if (ballSprite && ballSprite.parent) {
                                    ballSprite.parent.removeChild(ballSprite);
                                }
                                ballsRef.current[ballIndex] = null as any;
                                ballBodiesRef.current[ballIndex] = null as any;

                                if (onComplete) onComplete();
                            }, 100);
                        }
                    });
                });

                // Physics update loop to sync ball positions
                const updatePhysics = () => {
                    if (!engineRef.current) return;

                    ballBodiesRef.current.forEach((body, index) => {
                        if (body && ballsRef.current[index]) {
                            const ball = ballsRef.current[index];
                            ball.x = body.position.x;
                            ball.y = body.position.y;
                            ball.rotation = body.angle;
                        }
                    });

                    requestAnimationFrame(updatePhysics);
                };
                updatePhysics();

                // Set all to setup pose initially
                const allSpines = [
                    characterSpine,
                    plinkoSpine,
                    ...slotsRef.current
                ];
                allSpines.forEach(spine => {
                    if (spine) {
                        spine.skeleton.setToSetupPose();
                        spine.state.clearTracks();
                    }
                });

                isLoadedRef.current = true;

                // Start idle animations
                characterSpine.state.setAnimation(0, PlinkoAnimations.CHARACTER_IDLE_1, true);

                if (onLoadedRef.current) {
                    onLoadedRef.current();
                }
            } catch (err) {
                if (isMounted) {
                    const error = err instanceof Error ? err : new Error("Failed to initialize PIXI spine for Plinko");
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

            // Stop physics engine
            if (runnerRef.current) {
                Runner.stop(runnerRef.current);
                runnerRef.current = null;
            }
            if (engineRef.current) {
                Engine.clear(engineRef.current);
                engineRef.current = null;
            }

            if (appRef.current) {
                appRef.current.destroy(true, true);
                appRef.current = null;
            }

            characterSpineRef.current = null;
            plinkoSpineRef.current = null;
            backgroundRef.current = null;
            boardRef.current = null;
            pegsRef.current = [];
            ballsRef.current = [];
            ballBodiesRef.current = [];
            slotsRef.current = [];
            holesRef.current = [];
            physicsBodyRef.current = [];
            isLoadedRef.current = false;
        };
    }, [rows, multipliers.length]); // Re-initialize when rows or slot count changes

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

SpinePlinkoAnimation.displayName = "SpinePlinkoAnimation";

export default SpinePlinkoAnimation;
