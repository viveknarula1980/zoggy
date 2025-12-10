interface GameStatusIndicatorProps {
    enabled: boolean;
    running: boolean;
    className?: string;
}

export default function GameStatusIndicator({ enabled, running, className = "" }: GameStatusIndicatorProps) {
    const getStatusColor = () => {
        if (!enabled) return 'bg-red-400';
        return running ? 'bg-green-400' : 'bg-yellow-400';
    };

    const getStatusText = () => {
        if (!enabled) return 'Disabled';
        return running ? 'Running' : 'Stopped';
    };

    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <span className="text-xs text-gray-400">{getStatusText()}</span>
        </div>
    );
}
