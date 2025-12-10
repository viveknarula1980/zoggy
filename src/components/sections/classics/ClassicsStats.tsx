import React from "react";
import { Crown, Zap, TrendingUp, Users } from "lucide-react";

const ClassicsStats = () => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="glass p-4 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2">
                    <Users className="w-5 h-5 text-neon-pink" />
                </div>
                <div className="text-2xl font-bold text-light">12.5K+</div>
                <div className="text-sm text-soft">Active Players</div>
            </div>
            <div className="glass p-4 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="w-5 h-5 text-purple" />
                </div>
                <div className="text-2xl font-bold text-light">98.5%</div>
                <div className="text-sm text-soft">Average RTP</div>
            </div>
            <div className="glass p-4 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2">
                    <Zap className="w-5 h-5 text-neon-pink" />
                </div>
                <div className="text-2xl font-bold text-light">Instant</div>
                <div className="text-sm text-soft">Payouts</div>
            </div>
            <div className="glass p-4 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2">
                    <Crown className="w-5 h-5 text-purple" />
                </div>
                <div className="text-2xl font-bold text-light">24/7</div>
                <div className="text-sm text-soft">Support</div>
            </div>
        </div>
    );
};

export default ClassicsStats;
