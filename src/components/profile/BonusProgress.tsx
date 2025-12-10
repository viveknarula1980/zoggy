"use client";

import { Gift, TrendingUp, Clock, Target } from "lucide-react";
import { MOCK_BONUS, type BonusData } from "@/utils/api/profileapi";

export default function BonusProgress() {
  const currentBonus: BonusData = MOCK_BONUS;

  const progressPercentage = (currentBonus.wageredAmount / currentBonus.requiredWager) * 100;
  const remainingWager = currentBonus.requiredWager - currentBonus.wageredAmount;
  const timeRemaining = Math.ceil(
    (currentBonus.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="glass-card p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-light">Bonus Progress</h2>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-pink/20 to-purple-500/20 border-2 border-neon-pink/30 flex items-center justify-center">
            <Gift className="w-6 h-6 text-neon-pink" />
          </div>
          {currentBonus.isActive && (
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold border border-green-500/30">
              Active
            </span>
          )}
        </div>
      </div>

      {currentBonus.isActive ? (
        <div className="space-y-6">
          {/* Bonus Info */}
          <div className="glass-dark p-4 rounded-xl">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-light font-bold text-lg">{currentBonus.type}</p>
                <p className="text-neon-pink font-semibold">${currentBonus.amount.toFixed(2)} bonus</p>
              </div>
              <div className="text-right">
                <p className="text-light/60 text-sm">{timeRemaining} days left</p>
                <p className="text-light text-lg font-bold">{progressPercentage.toFixed(0)}%</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="w-full bg-soft/20 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-neon-pink to-purple-500 h-4 rounded-full transition-all duration-500 relative"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between text-sm text-light/70">
              <span>${currentBonus.wageredAmount.toFixed(2)} wagered</span>
              <span>${remainingWager.toFixed(2)} remaining</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-dark p-3 rounded-xl text-center">
              <Target className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-light/60 text-xs mb-1">Target</p>
              <p className="text-light text-sm font-bold">${currentBonus.requiredWager.toFixed(0)}</p>
            </div>
            <div className="glass-dark p-3 rounded-xl text-center">
              <TrendingUp className="w-4 h-4 text-neon-pink mx-auto mb-1" />
              <p className="text-light/60 text-xs mb-1">Multiplier</p>
              <p className="text-light text-sm font-bold">
                {(currentBonus.requiredWager / currentBonus.amount).toFixed(0)}x
              </p>
            </div>
            <div className="glass-dark p-3 rounded-xl text-center">
              <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
              <p className="text-light/60 text-xs mb-1">Max Bet</p>
              <p className="text-light text-sm font-bold">$5.00</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-10 h-10 text-light/30" />
          </div>
          <h3 className="text-xl font-bold text-light/60 mb-2">No Active Bonus</h3>
          <p className="text-light/40">Check back later for new offers!</p>
        </div>
      )}
    </div>
  );
}
