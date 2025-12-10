"use client";

import { useState, useEffect } from "react";
import { GameSettings } from "./GameSettingsModal";
import GameStatusIndicator from "./GameStatusIndicator";
import GameToggle from "./GameToggle";
import { X } from "lucide-react";

interface GameManagementModalProps {
    game: GameSettings;
    onSave: (game: GameSettings) => void;
    onClose: () => void;
    onToggleEnabled: (gameId: string) => void;
    onToggleRunning: (gameId: string) => void;
}

export default function GameManagementModal({ game, onSave, onClose, onToggleEnabled, onToggleRunning }: GameManagementModalProps) {
    const [settings, setSettings] = useState<GameSettings>({ ...game });
    const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);
    const [isTogglingRunning, setIsTogglingRunning] = useState(false);

    // Update local state when game prop changes
    useEffect(() => {
        setSettings({ ...game });
        // Reset loading states when game state changes
        setIsTogglingEnabled(false);
        setIsTogglingRunning(false);
    }, [game]);

    const handleSave = () => {
        // Make sure we're using the latest game state for enabled and running
        const updatedSettings = {
            ...settings,
            enabled: game.enabled,
            running: game.running,
        };
        onSave(updatedSettings);
    };

    const handleToggleEnabled = async () => {
        setIsTogglingEnabled(true);
        try {
            await onToggleEnabled(game.id);
        } finally {
            // Loading state will be reset by useEffect when game prop changes
        }
    };

    const handleToggleRunning = async () => {
        setIsTogglingRunning(true);
        try {
            await onToggleRunning(game.id);
        } finally {
            // Loading state will be reset by useEffect when game prop changes
        }
    };

    const updateSetting = (key: keyof GameSettings, value: any) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="fixed inset-0 bg-background-secondary/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-background-secondary backdrop-blur-md rounded-xl border border-soft/10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <span className="text-3xl">{game.icon}</span>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{game.name} Management</h2>
                                <GameStatusIndicator enabled={game.enabled} running={game.running} />
                            </div>
                        </div>
                        <button onClick={onClose} className="text-soft hover:text-white transition-colors cursor-pointer">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Game Controls */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-3">Game Controls</h3>
                        <div className="bg-background/30 rounded-lg p-4">
                            <GameToggle enabled={game.enabled} running={game.running} onToggleEnabled={handleToggleEnabled} onToggleRunning={handleToggleRunning} disabled={isTogglingEnabled || isTogglingRunning} />
                        </div>
                    </div>

                    {/* Game Statistics */}
                    {/* <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-3">Statistics</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-background/30 rounded-lg p-4 border border-border/20">
                                <p className="text-sm text-gray-400">Total Games Played</p>
                                <p className="text-2xl font-bold text-white">{game.totalPlayed}</p>
                            </div>
                            <div className="bg-background/30 rounded-lg p-4 border border-border/20">
                                <p className="text-sm text-gray-400">Total Revenue</p>
                                <p className="text-2xl font-bold text-green-400">${game.revenue.toFixed(2)}</p>
                            </div>
                        </div>
                    </div> */}

                    {/* Game Settings */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-3">Game Settings</h3>
                        <div className="space-y-4">
                            {/* Min Bet */}
                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">Minimum Bet ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={settings.minBet}
                                    onChange={(e) => {
                                        const inputValue = e.target.value;
                                        if (inputValue === '') {
                                            updateSetting("minBet", '');
                                        } else {
                                            const value = parseFloat(inputValue);
                                            if (!isNaN(value)) {
                                                updateSetting("minBet", Math.max(0, value));
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (e.target.value === '' || isNaN(parseFloat(e.target.value))) {
                                            updateSetting("minBet", 0);
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-background/50 rounded-lg text-white focus:border-neon-pink/50 focus:outline-none transition-colors"
                                />
                            </div>

                            {/* Max Bet */}
                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">Maximum Bet ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min={settings.minBet}
                                    value={settings.maxBet}
                                    onChange={(e) => {
                                        const inputValue = e.target.value;
                                        if (inputValue === '') {
                                            updateSetting("maxBet", '');
                                        } else {
                                            const value = parseFloat(inputValue);
                                            if (!isNaN(value)) {
                                                updateSetting("maxBet", Math.max(settings.minBet || 0, value));
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (e.target.value === '' || isNaN(parseFloat(e.target.value))) {
                                            updateSetting("maxBet", settings.minBet || 0);
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-background/50 rounded-lg text-white focus:border-neon-pink/50 focus:outline-none transition-colors"
                                />
                            </div>

                            {/* House Edge */}
                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">House Edge (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={settings.houseEdge}
                                    onChange={(e) => {
                                        const inputValue = e.target.value;
                                        if (inputValue === '') {
                                            updateSetting("houseEdge", '');
                                        } else {
                                            const value = parseFloat(inputValue);
                                            if (!isNaN(value)) {
                                                updateSetting("houseEdge", Math.min(100, Math.max(0, value)));
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (e.target.value === '' || isNaN(parseFloat(e.target.value))) {
                                            updateSetting("houseEdge", 0);
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-background/50 rounded-lg text-white focus:border-neon-pink/50 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="flex-1 py-3 px-4 bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition-all duration-300">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="flex-1 py-3 px-4 bg-neon-pink text-light border border-neon-pink/30 rounded-lg hover:bg-neon-pink/80">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
