"use client";

import React from "react";

interface MinesGridProps {
    gridSize: string; // "RxC"
    minesCount: number; // purely for info display
    picks: number;
    multiplier: number;
    revealed: Set<number>; // safe indexes from backend
    boomIndex: number | null; // bomb index if exploded
    onOpenCell: (row: number, col: number) => void;
    isGameOver?: boolean; // disable clicking when game is over
    isSpineMode?: boolean; // when true, make grid transparent for spine overlay
}

const MinesGrid: React.FC<MinesGridProps> = ({ gridSize, minesCount, picks, multiplier, revealed, boomIndex, onOpenCell, isGameOver = false, isSpineMode = false }) => {
    const [rows, cols] = gridSize.split("x").map(Number);
    const totalCells = rows * cols;

    const handleClick = (r: number, c: number) => {
        if (!isGameOver) {
            onOpenCell(r, c);
        }
    };

    if (isSpineMode) {
        // In Spine mode, render transparent clickable overlay positioned to match Spine grid
        return (
            <div className="absolute inset-0">
                <div
                    className="grid absolute"
                    style={{
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        gridTemplateRows: `repeat(${rows}, 1fr)`,
                        gap: "10px", // Small gap to match Spine spacing
                        left: '25%', // Match Spine gridStartX (25% of 1000px)
                        top: '15%',  // Match Spine gridStartY (15% of 800px)
                        ["--cell-size" as any]: `${Math.floor((500 / cols) - 10)}px`, // Match Spine cellWidth calculation (50% of 1000px width)
                        width: `calc(var(--cell-size) * ${cols} + ${(cols - 1) * 10}px)`,
                        height: `calc(var(--cell-size) * ${rows} + ${(rows - 1) * 10}px)`,
                    }}
                >
                    {Array.from({ length: totalCells }).map((_, i) => {
                        const r = Math.floor(i / cols);
                        const c = i % cols;

                        return (
                            <div
                                key={i}
                                onClick={() => handleClick(r, c)}
                                className="cursor-pointer bg-transparent hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all duration-150"
                                style={{ width: "var(--cell-size)", height: "var(--cell-size)" }}
                                title={`Cell ${i} (${r},${c})`}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }

    // Regular mode - show full UI
    return (
        <div className="flex flex-col gap-2 h-full">
            {/* Stats */}
            <div className="flex justify-between text-light text-sm px-2 flex-shrink-0">
                <div>Picks: {picks}</div>
                <div>Mines: {minesCount}</div>
                <div>Multiplier: {multiplier.toFixed(2)}×</div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 min-h-0 flex items-center justify-center">
                <div
                    className="grid"
                    style={{
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        gridTemplateRows: `repeat(${rows}, 1fr)`,
                        gap: cols > 10 || rows > 10 ? "2px" : cols > 6 || rows > 6 ? "4px" : "6px",
                        ["--cell-size" as any]: `min(${Math.floor((600 - 32 - (cols - 1) * (cols > 10 || rows > 10 ? 2 : cols > 6 || rows > 6 ? 4 : 6)) / cols)}px, ${Math.floor((600 - 80 - (rows - 1) * (cols > 10 || rows > 10 ? 2 : cols > 6 || rows > 6 ? 4 : 6)) / rows)}px)`,
                        width: `calc(var(--cell-size) * ${cols} + ${(cols - 1) * (cols > 10 || rows > 10 ? 2 : cols > 6 || rows > 6 ? 4 : 6)}px)`,
                        height: `calc(var(--cell-size) * ${rows} + ${(rows - 1) * (cols > 10 || rows > 10 ? 2 : cols > 6 || rows > 6 ? 4 : 6)}px)`,
                    }}
                >
                    {Array.from({ length: totalCells }).map((_, i) => {
                        const r = Math.floor(i / cols);
                        const c = i % cols;

                        const isRevealedSafe = revealed.has(i);
                        const isBoom = boomIndex === i;

                        const classes = [
                            "rounded-lg flex items-center justify-center font-bold transition-all duration-150",
                            !isGameOver && "cursor-pointer",
                            cols > 12 || rows > 12 ? "text-xs" : cols > 8 || rows > 8 ? "text-sm" : cols > 5 || rows > 5 ? "text-lg" : "text-2xl",
                            isRevealedSafe ? "bg-green-600 text-white" : isBoom ? "bg-red-600 text-white" : isGameOver ? "bg-background-secondary text-purple/40" : "bg-background-secondary hover:bg-background text-purple/40 hover:scale-95",
                        ].join(" ");

                        return (
                            <div key={i} onClick={() => handleClick(r, c)} className={classes} style={{ width: "var(--cell-size)", height: "var(--cell-size)" }}>
                                {isRevealedSafe ? "💎" : isBoom ? "💣" : ""}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MinesGrid;
