"use client";
import React, { useState, useEffect } from "react";

interface StatItemProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}

const StatItem = ({ icon, label, value, color }: StatItemProps) => {
    const [count, setCount] = useState(0);
    const targetValue = parseInt(value.replace(/,/g, ""));

    useEffect(() => {
        const duration = 2000; // ms
        const frameDuration = 1000 / 60; // 60fps
        const totalFrames = Math.round(duration / frameDuration);
        const increment = targetValue / totalFrames;

        let currentFrame = 0;

        const counter = setInterval(() => {
            currentFrame++;
            const progress = Math.min(currentFrame / totalFrames, 1);
            setCount(Math.floor(progress * targetValue));

            if (currentFrame === totalFrames) {
                clearInterval(counter);
            }
        }, frameDuration);

        return () => clearInterval(counter);
    }, [targetValue]);

    return (
        <div className="flex flex-col items-center p-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${color}`}>{icon}</div>
            <div className="text-2xl font-bold text-white mb-1">{count.toLocaleString()}+</div>
            <div className="text-soft text-sm">{label}</div>
        </div>
    );
};

const GameStats = () => {
    return (
        <div className="bg-[#2a2844] rounded-xl p-6 mt-10">
            <h3 className="text-white text-center text-xl font-semibold mb-8">Flipverse Gaming Stats</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatItem
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                        </svg>
                    }
                    label="Active Players"
                    value="250,000"
                    color="bg-purple-500/20 text-purple-400"
                />

                <StatItem
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    label="Hours Played"
                    value="1,500,000"
                    color="bg-blue-500/20 text-blue-400"
                />

                <StatItem
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    label="Games Played"
                    value="5,000,000"
                    color="bg-green-500/20 text-green-400"
                />

                <StatItem
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    label="Rewards Earned"
                    value="750,000"
                    color="bg-yellow-500/20 text-yellow-400"
                />
            </div>
        </div>
    );
};

export default GameStats;
