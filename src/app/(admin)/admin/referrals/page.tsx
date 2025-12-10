"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AffiliateList from "@/components/admin/referrals/AffiliateList";
import AdminMetrics from "@/components/admin/referrals/AdminMetrics";
import PayoutControl from "@/components/admin/referrals/PayoutControl";
import FraudPrevention from "@/components/admin/referrals/FraudPrevention";
import CommissionConfig from "@/components/admin/referrals/CommissionConfig";
import AdminActivityFeed from "@/components/admin/referrals/AdminActivityFeed";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { BarChart3, Users, DollarSign, Shield, Settings, Activity } from "lucide-react";
import { StatsGridSkeleton, LoadingState } from "@/components/admin/common/SkeletonLoader";
import { useAdmin } from "@/contexts/AdminContext";

export default function AdminReferralsPage() {
    const [activeTab, setActiveTab] = useState("overview");

    // auth
    const { isAuthenticated, isLoading: authLoading } = useAdmin();
    const router = useRouter();

    // Redirect unauthenticated admins to login after auth check completes
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            try {
                router.replace("/admin/login");
            } catch {}
        }
    }, [authLoading, isAuthenticated, router]);

    // While auth is being checked, render skeleton to avoid flash (no UI changes to actual page)
    if (authLoading) {
        return (
            <div className="flex h-screen">
                <AdminSidebar />

                <div className="flex-1 flex flex-col overflow-hidden">
                    <AdminHeader title="Referral Management" subtitle="Manage affiliates, payouts, and commission rules" />

                    <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <StatsGridSkeleton columns={3} />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                            <div className="glass rounded-xl p-6 border border-soft/10">
                                <LoadingState message="Checking authentication..." description="Please wait" />
                            </div>
                            <div className="glass rounded-xl p-6 border border-soft/10">
                                <LoadingState message="Preparing referral tools..." description="Please wait" />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // If not authenticated (authLoading is false) we've already redirected; return null to avoid UI flash.
    if (!isAuthenticated) return null;

    return (
        <div className="flex h-screen">
            <AdminSidebar />
            
            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminHeader title="Referral Management" subtitle="Manage affiliates, payouts, and commission rules" />
                
                <main className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {/* Navigation Tabs */}
                <div className="flex space-x-1 mb-8">
                    {[
                        { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
                        { id: "affiliates", label: "Affiliates", icon: <Users className="w-4 h-4" /> },
                        { id: "payouts", label: "Payouts", icon: <DollarSign className="w-4 h-4" /> },
                        { id: "fraud", label: "Fraud Prevention", icon: <Shield className="w-4 h-4" /> },
                        { id: "config", label: "Configuration", icon: <Settings className="w-4 h-4" /> },
                        { id: "activity", label: "Activity", icon: <Activity className="w-4 h-4" /> },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                activeTab === tab.id
                                    ? "bg-neon-pink/20 text-neon-pink border border-neon-pink/30"
                                    : "text-gray-400 hover:text-white hover:bg-background/50"
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
                {/* Tab Content */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        <AdminMetrics />
                    </div>
                )}
                {activeTab === "affiliates" && (
                    <div className="space-y-6">
                        <AffiliateList />
                    </div>
                )}
                {activeTab === "payouts" && (
                    <div className="space-y-6">
                        <PayoutControl />
                    </div>
                )}
                {activeTab === "fraud" && (
                    <div className="space-y-6">
                        <FraudPrevention />
                    </div>
                )}
                {activeTab === "config" && (
                    <div className="space-y-6">
                        <CommissionConfig />
                    </div>
                )}
                {activeTab === "activity" && (
                    <div className="space-y-6">
                        <AdminActivityFeed />
                    </div>
                )}
                </main>
            </div>
        </div>
    );
}
