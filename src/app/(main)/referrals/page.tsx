"use client";

import { useState, useEffect } from "react";
import { Target, BarChart3, DollarSign, TrendingUp, Settings } from "lucide-react";
import ReferralLink from "@/components/referrals/ReferralLink";
import ReferralStats from "@/components/referrals/ReferralStats";
import CommissionsBreakdown from "@/components/referrals/CommissionsBreakdown";
import BonusTracker from "@/components/referrals/BonusTracker";
import ReferralActivityFeed from "@/components/referrals/ReferralActivityFeed";
import PromoTools from "@/components/referrals/PromoTools";
import { trackReferralClick, bindReferral } from "@/utils/api/referralsApi";

export default function ReferralsPage() {
    const [activeTab, setActiveTab] = useState("overview");
    const [isLoading, setIsLoading] = useState(true);

    // Handle click logging and wallet binding
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("ref");
        if (!code) return;

        // Always log the click
        trackReferralClick(code);

        // Retry up to 10 times until wallet is ready
        let attempts = 0;
        const tryBind = () => {
            const wallet = window.solana?.publicKey?.toBase58();
            if (wallet) {
                console.log("DEBUG: Wallet detected, binding referral");
                bindReferral(code);
            } else if (attempts < 10) {
                attempts++;
                setTimeout(tryBind, 1500);
            } else {
                console.warn("DEBUG: Wallet not found after 10 retries, skipping bind");
            }
        };

        tryBind();
    }, []);

    // Simulate initial loading for skeleton display
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 800); // Short delay to show skeleton loaders

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-background pt-16 p-6">
            <div className="layout-wrapper">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="text-purple-400" size={36} />
                        <h1 className="text-4xl font-bold text-white">Referral Dashboard</h1>
                    </div>
                    <p className="text-soft">Earn commissions by inviting friends to play. The more they wager, the more you earn!</p>
                </div>

                {/* Navigation Tabs */}
                <div className="flex space-x-1 mb-8 glass rounded-lg p-1">
                    {[
                        { id: "overview", label: "Overview", icon: BarChart3 },
                        { id: "commissions", label: "Commissions", icon: DollarSign },
                        { id: "activity", label: "Activity", icon: TrendingUp },
                        { id: "tools", label: "Tools", icon: Settings },
                    ].map((tab) => {
                        const IconComponent = tab.icon;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 rounded-md font-medium transition-all duration-100 flex items-center gap-2 ${activeTab === tab.id ? "bg-purple-600 text-white shadow-lg" : "text-soft hover:text-white hover:bg-background-secondary"}`}>
                                <IconComponent size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                {activeTab === "overview" && (
                    <div className="space-y-8">
                        <ReferralLink />
                        <ReferralStats />
                        <BonusTracker />
                    </div>
                )}

                {activeTab === "commissions" && (
                    <div className="space-y-8">
                        <CommissionsBreakdown />
                    </div>
                )}

                {activeTab === "activity" && (
                    <div className="space-y-8">
                        <ReferralActivityFeed />
                    </div>
                )}

                {activeTab === "tools" && (
                    <div className="space-y-8">
                        <PromoTools />
                    </div>
                )}
            </div>
        </div>
    );
}
