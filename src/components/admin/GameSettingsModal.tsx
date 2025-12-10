"use client";

import { useState } from "react";
import { X } from "lucide-react";

export interface GameSettings {
    id: string;
    name: string;
    icon: string;
    enabled: boolean;
    running: boolean;
    minBet: number;
    maxBet: number;
    houseEdge: number;
    totalPlayed: number;
    revenue: number;
}

interface GameSettingsModalProps {
    game: GameSettings;
    onSave: (game: GameSettings) => void;
    onClose: () => void;
}

export default function GameSettingsModal({ game, onSave, onClose }: GameSettingsModalProps) {
    const [settings, setSettings] = useState<GameSettings>({ ...game });

    const handleSave = () => {
        onSave(settings);
    };

    const updateSetting = (key: keyof GameSettings, value: any) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card/30 backdrop-blur-md rounded-xl p-6 border border-border/50 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <span className="text-2xl">{game.icon}</span>
                        <h2 className="text-xl font-bold text-white">{game.name} Settings</h2>
                    </div>
                    <button onClick={onClose} className="text-soft hover:text-white transition-colors cursor-pointer">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Min Bet */}
                    <div>
                        <label className="block text-sm font-medium text-soft mb-2">Minimum Bet ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={settings.minBet}
                            onChange={(e) => updateSetting("minBet", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-background/50 border border-border/30 rounded-lg text-white focus:border-neon-pink/50 focus:outline-none transition-colors"
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
                            onChange={(e) => updateSetting("maxBet", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-background/50 border border-border/30 rounded-lg text-white focus:border-neon-pink/50 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* House Edge */}
                    <div>
                        <label className="block text-sm font-medium text-soft mb-2">House Edge (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={settings.houseEdge}
                            onChange={(e) => updateSetting("houseEdge", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-background/50 border border-border/30 rounded-lg text-white focus:border-neon-pink/50 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Game Status */}
                    <div>
                        <label className="block text-sm font-medium text-soft mb-2">Game Status</label>
                        <div className="space-y-2">
                            <label className="flex items-center space-x-2">
                                <input type="checkbox" checked={settings.enabled} onChange={(e) => updateSetting("enabled", e.target.checked)} className="rounded border-border/30 bg-background/50 text-neon-pink focus:ring-neon-pink/50" />
                                <span className="text-white text-sm">Game Enabled</span>
                            </label>

                            {settings.enabled && (
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={settings.running} onChange={(e) => updateSetting("running", e.target.checked)} className="rounded border-border/30 bg-background/50 text-blue-400 focus:ring-blue-400/50" />
                                    <span className="text-white text-sm">Game Running</span>
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-2 px-4 bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition-all duration-300">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="flex-1 py-2 px-4 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-lg hover:bg-neon-pink/30 hover:scale-[1.02] transition-all duration-300">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
