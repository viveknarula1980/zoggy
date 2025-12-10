"use client";

import { useEffect, useState } from "react";
import { Play, Pause, Zap } from "lucide-react";

interface BotControlsProps {
    isRunning: boolean;
    onToggleSimulation: () => void;
    onForceBigWin: () => void;
    onResetStats: () => void;
}

export default function BotControls({ isRunning, onToggleSimulation, onForceBigWin, onResetStats }: BotControlsProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [cooldownMs, setCooldownMs] = useState(0);

    // 🔁 Poll backend for Big Win status every second
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_HTTP || ""}/admin/bot/bigwin/status`, { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                const now = Date.now();
                const remaining =
                    typeof data.remainingMs === "number"
                        ? data.remainingMs
                        : typeof data.deadline === "number"
                        ? Math.max(0, data.deadline - now)
                        : 0;
                setCooldownMs(remaining);
            } catch {}
        };
        fetchStatus();
        const id = setInterval(fetchStatus, 1000);
        return () => clearInterval(id);
    }, []);

    const handleToggle = async () => {
        setIsProcessing(true);
        await onToggleSimulation();
        setTimeout(() => setIsProcessing(false), 1000);
    };

    const handleForceBigWin = async () => {
        setIsProcessing(true);
        await onForceBigWin();
        // After trigger, refresh the timer immediately
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_HTTP || ""}/admin/bot/bigwin/status`);
            if (res.ok) {
                const data = await res.json();
                const now = Date.now();
                const remaining =
                    typeof data.remainingMs === "number"
                        ? data.remainingMs
                        : typeof data.deadline === "number"
                        ? Math.max(0, data.deadline - now)
                        : 0;
                setCooldownMs(remaining);
            }
        } catch {}
        setTimeout(() => setIsProcessing(false), 2000);
    };

    // 🕒 Format countdown mm:ss or hh:mm:ss
    const formatTime = (ms: number) => {
        if (ms <= 0) return "00:00";
        const total = Math.floor(ms / 1000);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        const pad = (n: number) => String(n).padStart(2, "0");
        return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    };

    const bigWinDisabled = cooldownMs > 0 || !isRunning || isProcessing;

    return (
        <div className="glass rounded-xl p-6 border border-soft/10 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Controls</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Main Toggle */}
                <button
                    onClick={handleToggle}
                    disabled={isProcessing}
                    className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-xl font-sm transition-all duration-300 ${
                        isRunning
                            ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                            : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                    } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    <span>{isRunning ? "Pause Bots" : "Start Bots"}</span>
                </button>

                {/* Force Big Win */}
                <button
                    onClick={handleForceBigWin}
                    disabled={bigWinDisabled}
                    className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-xl font-sm transition-all duration-300 ${
                        bigWinDisabled
                            ? "bg-gray-500/20 text-gray-500 border border-gray-500/30 cursor-not-allowed"
                            : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 hover:scale-[1.02]"
                    } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    <Zap className="w-5 h-5" />
                    <span>
                        {cooldownMs > 0
                            ? `Cooldown ${formatTime(cooldownMs)}`
                            : "Force Big Win"}
                    </span>
                </button>

                {/* Status Indicator */}
                <div className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border border-soft/10">
                    <div className={`w-3 h-3 rounded-full ${isRunning ? "bg-green-400 animate-pulse" : "bg-gray-500"}`}></div>
                    <span className="text-sm font-medium text-soft">{isRunning ? "Active" : "Inactive"}</span>
                </div>
            </div>

            {/* Processing Indicator */}
            {isProcessing && (
                <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-blue-400">Processing command...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
