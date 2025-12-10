import React from "react";

interface GameControlsProps {
    // Bet Controls
    betAmount: number;
    setBetAmount: (amount: number) => void;
    
    // Game State
    isPlaying: boolean;
    onStartGame: () => void;
    onCashOut: () => void;
    
    // Game-specific controls (optional)
    gameSpecificControls?: React.ReactNode;
    
    // Play button customization
    startButtonText?: string;
    cashOutButtonText?: string;
    disableStart?: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
    betAmount,
    setBetAmount,
    isPlaying,
    onStartGame,
    onCashOut,
    gameSpecificControls,
    startButtonText = "Start Game",
    cashOutButtonText = "Cash Out",
    disableStart = false
}) => {
    return (
        <div className="lg:w-72 space-y-4">
            {/* Bet Controls */}
            <div className="glass rounded-xl p-4 border border-purple/20">
                <h3 className="text-light text-base font-bold mb-3">Bet Amount</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-soft text-sm">$</span>
                        <input
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(Number(e.target.value))}
                            className="flex-1 bg-background-secondary border border-purple/30 rounded-lg px-3 py-2 text-light focus:border-neon-pink focus:outline-none"
                            min="0.01"
                            step="0.01"
                            disabled={isPlaying}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setBetAmount(betAmount / 2)} 
                            className="flex-1 bg-background-secondary border border-purple/30 rounded-lg px-3 py-2 text-soft hover:border-purple/50 transition-colors disabled:opacity-50" 
                            disabled={isPlaying}
                        >
                            ÷2
                        </button>
                        <button 
                            onClick={() => setBetAmount(betAmount * 2)} 
                            className="flex-1 bg-background-secondary border border-purple/30 rounded-lg px-3 py-2 text-soft hover:border-purple/50 transition-colors disabled:opacity-50" 
                            disabled={isPlaying}
                        >
                            ×2
                        </button>
                    </div>
                </div>
            </div>

            {/* Game-specific controls */}
            {gameSpecificControls}

            {/* Play Button */}
            {isPlaying ? (
                <button 
                    className="w-full bg-purple text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow" 
                    onClick={onCashOut}
                >
                    {cashOutButtonText}
                </button>
            ) : (
                <button 
                    className="w-full bg-neon-pink text-light px-4 py-3 rounded-xl font-bold text-base hover:shadow-glow disabled:opacity-50" 
                    onClick={onStartGame}
                    disabled={disableStart}
                >
                    {startButtonText}
                </button>
            )}
        </div>
    );
};

export default GameControls;
