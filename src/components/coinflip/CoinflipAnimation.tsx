import React, { useEffect, useState } from "react";

interface CoinFlipAnimationProps {
    isFlipping: boolean;
    onFlipComplete?: (results: ("heads" | "tails")[]) => void;
    desiredResult?: "heads" | "tails"; // authoritative result from server
}

const CoinFlipAnimation: React.FC<CoinFlipAnimationProps> = ({ isFlipping, onFlipComplete, desiredResult }) => {
    const numberOfCoins = 1;
    const [coinResults, setCoinResults] = useState<("heads" | "tails")[]>(Array(numberOfCoins).fill("heads"));
    const [animatingCoins, setAnimatingCoins] = useState<boolean[]>(Array(numberOfCoins).fill(false));

    // Sync arrays if coin count changed (kept for compatibility)
    useEffect(() => {
        setCoinResults((prev) => {
            const newResults = Array(numberOfCoins).fill("heads");
            for (let i = 0; i < Math.min(prev.length, numberOfCoins); i++) {
                newResults[i] = prev[i];
            }
            return newResults;
        });
        setAnimatingCoins(Array(numberOfCoins).fill(false));
    }, [numberOfCoins]);

    useEffect(() => {
        // Only animate when we know the server's desired result.
        if (!isFlipping || !desiredResult) return;

        const results = Array(numberOfCoins).fill(desiredResult) as ("heads" | "tails")[];

        // Start animations with stagger
        results.forEach((_res, index) => {
            setTimeout(() => {
                setAnimatingCoins((prev) => {
                    const newAnimating = [...prev];
                    newAnimating[index] = true;
                    return newAnimating;
                });
            }, index * 100);
        });

        // Set results and stop animations after animation completes
        const totalMs = 2000 + (numberOfCoins - 1) * 100;
        const t = setTimeout(() => {
            setCoinResults(results);
            setAnimatingCoins(Array(numberOfCoins).fill(false));
            onFlipComplete?.(results);
        }, totalMs);

        return () => clearTimeout(t);
    }, [isFlipping, numberOfCoins, onFlipComplete, desiredResult]);

    // Grid logic (kept for potential multi-coin reuse)
    const { cols, rows } = (() => {
        if (numberOfCoins <= 1) return { cols: 1, rows: 1 };
        if (numberOfCoins <= 4) return { cols: 2, rows: 2 };
        if (numberOfCoins <= 6) return { cols: 3, rows: 2 };
        if (numberOfCoins <= 9) return { cols: 3, rows: 3 };
        return { cols: 4, rows: 3 };
    })();

    const coinSize = numberOfCoins === 1 ? 128 : numberOfCoins <= 4 ? 80 : 60;

    return (
        <>
            <style jsx>{`
                .coin {
                    position: relative;
                    border-radius: 50%;
                    background: linear-gradient(45deg, #ffd700, #ffed4e, #ffd700);
                    border: 2px solid #cc9900;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: #996600;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                    transition: transform 0.1s ease;
                }
                .coin:hover {
                    transform: scale(1.05);
                }
                .coin-flip {
                    animation: flip 2s ease-in-out;
                }
                @keyframes flip {
                    0% {
                        transform: translateY(0) rotateY(0deg);
                    }
                    25% {
                        transform: translateY(-40px) rotateY(450deg);
                    }
                    50% {
                        transform: translateY(-60px) rotateY(900deg);
                    }
                    75% {
                        transform: translateY(-40px) rotateY(1350deg);
                    }
                    100% {
                        transform: translateY(0) rotateY(1800deg);
                    }
                }
                .heads {
                    background: linear-gradient(45deg, #ffd700, #ffed4e, #ffd700);
                }
                .tails {
                    background: linear-gradient(45deg, #c9c9c9, #e6e6e6, #c9c9c9);
                    color: #666;
                    border-color: #999;
                }
                .coin-shadow {
                    position: absolute;
                    bottom: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 60%;
                    height: 8px;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 50%;
                    filter: blur(4px);
                }
                .coin-flip .coin-shadow {
                    animation: shadow-flip 2s ease-in-out;
                }
                @keyframes shadow-flip {
                    0%,
                    100% {
                        transform: translateX(-50%) scale(1);
                        opacity: 0.3;
                    }
                    25%,
                    75% {
                        transform: translateX(-50%) scale(0.7);
                        opacity: 0.2;
                    }
                    50% {
                        transform: translateX(-50%) scale(0.5);
                        opacity: 0.1;
                    }
                }
            `}</style>

            <div className="absolute inset-4 flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="relative">
                        <div
                            className="grid gap-4 mx-auto"
                            style={{
                                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                gridTemplateRows: `repeat(${rows}, 1fr)`,
                                width: `${cols * (coinSize + 16)}px`,
                                height: `${rows * (coinSize + 16)}px`,
                            }}
                        >
                            {coinResults.map((result, index) => (
                                <div key={index} className="relative">
                                    <div
                                        className={`coin ${result} ${animatingCoins[index] ? "coin-flip" : ""}`}
                                        style={{
                                            width: coinSize,
                                            height: coinSize,
                                            fontSize: coinSize > 80 ? "24px" : coinSize > 60 ? "18px" : "14px",
                                        }}
                                    >
                                        {result === "heads" ? "$" : "T"}
                                    </div>
                                    <div className="coin-shadow"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {isFlipping && !desiredResult && <div className="text-lg font-semibold text-neon-pink animate-pulse">Waiting for server…</div>}

                    {isFlipping && desiredResult && (
                        <div className="text-lg font-semibold text-neon-pink animate-pulse">
                            Flipping {numberOfCoins} coin{numberOfCoins > 1 ? "s" : ""}…
                        </div>
                    )}

                    {/* {!isFlipping && coinResults.length > 0 && (
            <div className="text-sm text-gray-400">
              Results: {coinResults.join(", ")}
            </div>
          )} */}
                </div>
            </div>
        </>
    );
};

export default CoinFlipAnimation;
