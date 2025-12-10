"use client";

import { useState, useEffect } from "react";
import { Trophy, Target, Zap } from "lucide-react";
import { getBonusData, getBonusMilestones, type BonusData, type BonusMilestone } from "@/utils/api/referralsApi";

export default function BonusTracker() {
    const [bonusData, setBonusData] = useState<BonusData | null>(null);
    const [milestones, setMilestones] = useState<BonusMilestone[] | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [data, ms] = await Promise.all([getBonusData(), getBonusMilestones()]);
                setBonusData(data);
                setMilestones(ms);
            } catch (error) {
                console.error("Failed to fetch bonus data:", error);
            }
        })();
    }, []);

    if (!bonusData || !milestones) {
        return (
            <div className="glass-card rounded-2xl p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-soft/20 rounded mb-4"></div>
                    <div className="h-32 bg-soft/20 rounded mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-24 bg-soft/20 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const referrals = bonusData.dailyReferrals;

    // 🔑 Normalize milestones with numeric fields
    const parsedMilestones = milestones.map((m) => ({
        ...m,
        requirementNumber: parseInt(m.requirement.match(/\d+/)?.[0] || "0"),
        rewardNumber: parseInt(m.reward.replace(/\D/g, "")),
    }));

    // Unlocked bonus = sum of rewards where today's referrals >= requirement
    const unlockedBonus = parsedMilestones.filter((m) => referrals >= m.requirementNumber).reduce((sum, m) => sum + m.rewardNumber, 0);

    // Total Bonus Earned = sum of all achieved milestones (regardless of day)
    const totalBonusEarned = parsedMilestones.filter((m) => m.achieved).reduce((sum, m) => sum + m.rewardNumber, 0);

    // Find the next milestone above current referrals
    const nextMilestone = parsedMilestones.find((m) => referrals < m.requirementNumber);

    const referralsNeeded = nextMilestone ? nextMilestone.requirementNumber - referrals : 0;

    // Progress bar relative to next milestone (or last one if maxed)
    const target = nextMilestone ? nextMilestone.requirementNumber : parsedMilestones[parsedMilestones.length - 1].requirementNumber;

    const progress = Math.min(100, (referrals / target) * 100);

    return (
        <div className="glass-card rounded-2xl bg-background p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="text-purple-400" size={28} />
                        <h2 className="text-2xl font-bold text-white">Quick Unlock Bonus Tracker</h2>
                    </div>
                    <p className="text-soft">Refer more players to unlock instant bonuses and rewards</p>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-neon-pink/20 to-purple/20 px-4 py-2 rounded-full">
                    <Zap className="text-yellow-400" size={16} />
                    <span className="text-white font-semibold">{bonusData.streakDays} day streak</span>
                </div>
            </div>

            {/* Progress Section */}
            <div className="glass-dark rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Today's Progress</h3>
                        <p className="text-soft text-sm">You've referred {referrals} players today</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-neon-pink">${unlockedBonus}</div>
                        <div className="text-soft text-sm">Unlocked Bonus</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-soft mb-2">
                        <span>{referrals} referrals</span>
                        <span>{target} target</span>
                    </div>
                    <div className="w-full bg-soft/10 rounded-full h-3 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-neon-pink to-purple transition-all duration-500 ease-out relative" style={{ width: `${progress}%` }}>
                            <div className="absolute inset-0 bg-soft/40 animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* Next Milestone */}
                <div className="flex items-center justify-between p-3 glass rounded-lg">
                    <div className="flex items-center gap-3">
                        <Target className="text-green-400" size={20} />
                        <div>
                            <div className="text-white font-medium">Next Milestone</div>
                            <div className="text-soft text-sm">{nextMilestone ? `${referralsNeeded} more referrals needed` : "All milestones achieved!"}</div>
                        </div>
                    </div>
                    <div className="text-green-400 font-bold">{nextMilestone ? nextMilestone.reward : ""}</div>
                </div>
            </div>

            {/* Bonus Milestones */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {milestones.map((milestone) => (
                    <div key={milestone.id} className={`glass-dark rounded-xl p-4 relative overflow-hidden ${milestone.achieved ? "border border-green-500/30" : ""}`}>
                        {milestone.achieved && (
                            <div className="absolute top-2 right-2">
                                <Trophy className="text-yellow-400" size={16} />
                            </div>
                        )}
                        <div className="text-2xl mb-2">{milestone.icon}</div>
                        <h4 className="text-white font-semibold mb-1">{milestone.title}</h4>
                        <p className="text-soft text-sm mb-2">{milestone.requirement}</p>
                        <div className={`text-lg font-bold ${milestone.achieved ? "text-green-400" : "text-neon-pink"}`}>{milestone.reward}</div>
                        {milestone.achieved && <div className="text-green-400 text-xs mt-1">✓ Achieved</div>}
                    </div>
                ))}
            </div>

            {/* Achievement Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="glass-dark rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white mb-1">${totalBonusEarned}</div>
                    <div className="text-soft text-sm">Total Bonus Earned</div>
                </div>
                <div className="glass-dark rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-neon-pink mb-1">{bonusData.streakDays}</div>
                    <div className="text-soft text-sm">Day Streak</div>
                </div>
            </div>
        </div>
    );
}
