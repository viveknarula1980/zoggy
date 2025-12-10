import React from "react";

interface SlotsJackpotDisplayProps {
    jackpotAmount: number;
    setBetAmount: (amount: number) => void;
    isPlaying: boolean;
}

const SlotsJackpotDisplay: React.FC<SlotsJackpotDisplayProps> = ({
    jackpotAmount,
    setBetAmount,
    isPlaying
}) => {
    return (
        <div className="glass rounded-xl p-4 border border-purple/20">
            <h3 className="text-light text-base font-bold mb-3">Jackpot</h3>
            <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-neon-pink">
                    ${jackpotAmount.toLocaleString()}
                </div>
                <div className="text-xs text-soft">
                    Current Jackpot Prize
                </div>
                <div className="flex gap-2 mt-3">
                    <button 
                        onClick={() => setBetAmount(1)} 
                        className="flex-1 bg-background-secondary border border-purple/30 rounded-lg px-3 py-2 text-soft hover:border-purple/50 transition-colors text-sm disabled:opacity-50" 
                        disabled={isPlaying}
                    >
                        Min Bet
                    </button>
                    <button 
                        onClick={() => setBetAmount(10)} 
                        className="flex-1 bg-background-secondary border border-purple/30 rounded-lg px-3 py-2 text-soft hover:border-purple/50 transition-colors text-sm disabled:opacity-50" 
                        disabled={isPlaying}
                    >
                        Max Bet
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SlotsJackpotDisplay;
