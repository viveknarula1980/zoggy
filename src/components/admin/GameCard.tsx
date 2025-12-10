import { GameSettings } from "./GameSettingsModal";

interface GameCardProps {
    game: GameSettings;
    onClick: (game: GameSettings) => void;
}

export default function GameCard({ game, onClick }: GameCardProps) {
    return (
        <div onClick={() => onClick(game)} className="glass p-6 rounded-2xl h-full flex flex-col relative overflow-hidden">
            {/* Status Badge */}
            <div className="absolute top-4 right-4 z-10">
                <span className={`text-xs px-2 py-1 rounded-full border ${game.enabled ? (game.running ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30") : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                    {game.enabled ? (game.running ? "Running" : "Stopped") : "Disabled"}
                </span>
            </div>

            {/* Game Icon */}
            <div className="text-5xl mb-4 relative z-10">{game.icon}</div>

            {/* Game Title */}
            <h3 className="text-xl font-bold text-light mb-3 relative z-10">{game.name}</h3>

            {/* Game Stats */}
            <div className="space-y-3 mb-4 flex-grow relative z-10">
                <div className="flex items-center justify-between">
                    <span className="text-soft text-sm">Games Played</span>
                    <span className="text-light font-semibold">{game.totalPlayed.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-soft text-sm">Revenue</span>
                    <span className="text-green-400 font-bold">${game.revenue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-soft text-sm">House Edge</span>
                    <span className="text-light font-semibold">{game.houseEdge}%</span>
                </div>
            </div>

            {/* Bet Limits */}
            <div className="mb-6 relative z-10">
                <p className="text-soft text-sm mb-2">Bet Limits</p>
                <div className="flex items-center justify-between text-sm glass-dark rounded-lg p-3">
                    <span className="text-light">Min: ${game.minBet}</span>
                    <span className="text-light">Max: ${game.maxBet}</span>
                </div>
            </div>

            {/* Manage Button */}
            <button className="w-full bg-neon-pink text-light py-3 rounded-xl font-semibold border border-purple/30 relative z-10 hover:bg-purple cursor-pointer transition-all duration-300">Manage Game</button>
        </div>
    );
}
