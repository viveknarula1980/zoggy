"use client";

import { useState } from "react";
import { Settings, Save, RotateCcw, AlertTriangle } from "lucide-react";

interface BotConfig {
    userPoolSize: number;
    minBetSize: number;
    maxBetSize: number;
    winRate: number;
    activityInterval: { min: number; max: number };
    quietModeChance: number;
    bigWinFrequency: number;
    bigWinRange: { min: number; max: number };
    gameDistribution: {
        slots: number;
        crash: number;
        mines: number;
        dice: number;
        plinko: number;
        coinflip: number;
    };
    multiplierPool: number[];
}

interface BotSettingsProps {
    config: BotConfig;
    onConfigChange: (config: BotConfig) => void;
    onSave: () => void;
    onReset: () => void;
}

export default function BotSettings({ config, onConfigChange, onSave, onReset }: BotSettingsProps) {
    const [activeTab, setActiveTab] = useState<"general" | "games" | "behavior">("general");

    const handleInputChange = (path: string, value: number) => {
        const newConfig = { ...config };
        const keys = path.split(".");
        let current: any = newConfig;

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;

        onConfigChange(newConfig);
    };

    const handleGameDistributionChange = (game: string, value: number) => {
        const newDistribution = { ...config.gameDistribution, [game]: value };
        onConfigChange({ ...config, gameDistribution: newDistribution });
    };

    const tabs = [
        { id: "general", label: "General", icon: Settings },
        { id: "games", label: "Game Distribution", icon: Settings },
        { id: "behavior", label: "Behavior", icon: Settings },
    ];

    return (
        <div className="glass rounded-xl border border-soft/10">
            {/* Tab Navigation */}
            <div className="border-b border-soft/10 p-6 pb-0">
                <div className="flex space-x-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id ? "bg-neon-pink/20 text-neon-pink border border-neon-pink/30" : "text-soft hover:text-white hover:bg-background/50"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6">
                {/* General Settings */}
                {activeTab === "general" && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white mb-4">General Configuration</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">User Pool Size</label>
                                <input
                                    type="number"
                                    value={config.userPoolSize}
                                    onChange={(e) => handleInputChange("userPoolSize", parseInt(e.target.value))}
                                    className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                                    min="50"
                                    max="1000"
                                />
                                <p className="text-xs text-soft mt-1">Total fake users in rotation (50-1000)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">Win Rate %</label>
                                <input
                                    type="number"
                                    value={config.winRate}
                                    onChange={(e) => handleInputChange("winRate", parseInt(e.target.value))}
                                    className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                                    min="20"
                                    max="80"
                                />
                                <p className="text-xs text-soft mt-1">Bot win percentage (20-80%)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">Min Bet Size (SOL)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={config.minBetSize}
                                    onChange={(e) => handleInputChange("minBetSize", parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                                    min="0.01"
                                    max="1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">Max Bet Size (SOL)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={config.maxBetSize}
                                    onChange={(e) => handleInputChange("maxBetSize", parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                                    min="0.1"
                                    max="10"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Game Distribution */}
                {activeTab === "games" && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Game Distribution (%)</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(config.gameDistribution).map(([game, percentage]) => (
                                <div key={game}>
                                    <label className="block text-sm font-medium text-soft mb-2 capitalize">{game}</label>
                                    <input
                                        type="number"
                                        value={percentage}
                                        onChange={(e) => handleGameDistributionChange(game, parseInt(e.target.value))}
                                        className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                                        min="0"
                                        max="100"
                                    />
                                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                                        <div className="bg-neon-pink h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-sm text-blue-400">
                                <strong>Total: {Object.values(config.gameDistribution).reduce((a, b) => a + b, 0)}%</strong>
                                {Object.values(config.gameDistribution).reduce((a, b) => a + b, 0) !== 100 && (
                                    <span className="text-yellow-400 ml-2 inline-flex items-center gap-1">
                                        <AlertTriangle className="w-4 h-4" />
                                        Should equal 100%
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                )}

                {/* Behavior Settings */}
                {activeTab === "behavior" && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Bot Behavior</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">Activity Interval Min (seconds)</label>
                                <input
                                    type="number"
                                    value={config.activityInterval.min}
                                    onChange={(e) => handleInputChange("activityInterval.min", parseInt(e.target.value))}
                                    className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                                    min="1"
                                    max="30"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">Activity Interval Max (seconds)</label>
                                <input
                                    type="number"
                                    value={config.activityInterval.max}
                                    onChange={(e) => handleInputChange("activityInterval.max", parseInt(e.target.value))}
                                    className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                                    min="2"
                                    max="60"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">Quiet Mode Chance (%)</label>
                                <input
                                    type="number"
                                    value={config.quietModeChance}
                                    onChange={(e) => handleInputChange("quietModeChance", parseInt(e.target.value))}
                                    className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                                    min="0"
                                    max="50"
                                />
                                <p className="text-xs text-soft mt-1">Chance of no activity to appear natural</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">Big Win Frequency (minutes)</label>
                                <input
                                    type="number"
                                    value={config.bigWinFrequency}
                                    onChange={(e) => handleInputChange("bigWinFrequency", parseInt(e.target.value))}
                                    className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                                    min="5"
                                    max="120"
                                />
                                <p className="text-xs text-soft mt-1">Trigger big win every X minutes</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">Big Win Min Multiplier</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.bigWinRange.min}
                                    onChange={(e) => handleInputChange("bigWinRange.min", parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                                    min="5"
                                    max="50"
                                />
                                <p className="text-xs text-soft mt-1">Minimum multiplier for big wins (5-50x)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-soft mb-2">Big Win Max Multiplier</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.bigWinRange.max}
                                    onChange={(e) => handleInputChange("bigWinRange.max", parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                                    min="10"
                                    max="500"
                                />
                                <p className="text-xs text-soft mt-1">Maximum multiplier for big wins (10-500x)</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-soft mb-2">Multiplier Pool</label>
                            <div className="flex flex-wrap gap-2">
                                {config.multiplierPool.map((multiplier, index) => (
                                    <span key={index} className="px-3 py-1 bg-neon-pink/20 text-neon-pink rounded-full text-sm">
                                        {multiplier}x
                                    </span>
                                ))}
                            </div>
                            <p className="text-xs text-soft mt-2">Available multipliers for wins</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-soft/10">
                    <button onClick={onReset} className="flex items-center space-x-2 px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition-all duration-200">
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset to Defaults</span>
                    </button>

                    <button onClick={onSave} className="flex items-center space-x-2 px-4 py-2 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-lg hover:bg-neon-pink/30 transition-all duration-200">
                        <Save className="w-4 h-4" />
                        <span>Save Configuration</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
