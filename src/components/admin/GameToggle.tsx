interface GameToggleProps {
    enabled: boolean;
    running: boolean;
    onToggleEnabled: () => void;
    onToggleRunning: () => void;
    disabled?: boolean;
}

export default function GameToggle({ enabled, running, onToggleEnabled, onToggleRunning, disabled = false }: GameToggleProps) {
    return (
        <div className="flex space-x-2">
            <button
                onClick={onToggleEnabled}
                disabled={disabled}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-300 border ${enabled ? "bg-red-500/80 text-light border-red-500/30 hover:bg-red-500/60" : "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"} ${
                    disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
                {enabled ? "Disable" : "Enable"}
            </button>

            {enabled && (
                <button
                    onClick={onToggleRunning}
                    disabled={disabled}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-300 border ${running ? "bg-yellow-400/80 text-light  border-yellow-500/30 hover:bg-yellow-400/60" : "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"} ${
                        disabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                    {running ? "Stop" : "Start"}
                </button>
            )}
        </div>
    );
}
