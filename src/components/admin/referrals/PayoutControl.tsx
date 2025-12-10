"use client";

import { useState, useEffect } from "react";
import { Check, X, Clock, DollarSign, Settings, Play, AlertTriangle, Plus, Edit3 } from "lucide-react";
import { getPayoutRequests, processPayout, getPayoutSettings, updatePayoutSettings, triggerAutomaticPayouts, createManualPayout, type PayoutRequest, type PayoutSettings } from "@/utils/api/adminReferralsApi";
import PayoutReviewModal from "./PayoutReviewModal";
import PayoutSettingsModal from "./PayoutSettingsModal";
import ManualPayoutModal from "./ManualPayoutModal";
import { StatsGridSkeleton, TableSkeleton } from "../common/SkeletonLoader";

export default function PayoutControl() {
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [settings, setSettings] = useState<PayoutSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showManualPayout, setShowManualPayout] = useState(false);
    const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
    const [processingAuto, setProcessingAuto] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [payoutData, settingsData] = await Promise.all([getPayoutRequests(), getPayoutSettings()]);
                setPayouts(payoutData);
                setSettings(settingsData);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handlePayout = async (payoutId: string, action: "approve" | "reject", network?: string, notes?: string) => {
        try {
            await processPayout(payoutId, action, network as "SOL" | "USDT" | "ETH" | "BTC", notes);
            setPayouts((prev) => prev.map((payout) => (payout.id === payoutId ? { ...payout, status: action === "approve" ? "approved" : "rejected" } : payout)));
            setSelectedPayout(null);
        } catch (error) {
            console.error(`Failed to ${action} payout:`, error);
        }
    };

    const handleAutoPayouts = async () => {
        setProcessingAuto(true);
        try {
            await triggerAutomaticPayouts();
            // Refresh payout data
            const data = await getPayoutRequests();
            setPayouts(data);
        } catch (error) {
            console.error("Failed to trigger automatic payouts:", error);
        } finally {
            setProcessingAuto(false);
        }
    };

    const handleSettingsUpdate = async (newSettings: PayoutSettings) => {
        try {
            await updatePayoutSettings(newSettings);
            setSettings(newSettings);
            setShowSettings(false);
        } catch (error) {
            console.error("Failed to update settings:", error);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending":
                return "text-yellow-400 bg-yellow-400/20";
            case "approved":
                return "text-green-400 bg-green-400/20";
            case "rejected":
                return "text-red-400 bg-red-400/20";
            case "completed":
                return "text-blue-400 bg-blue-400/20";
            case "processing":
                return "text-purple-400 bg-purple-400/20";
            default:
                return "text-gray-400 bg-gray-400/20";
        }
    };

    const getFraudScoreColor = (score: number) => {
        if (score > 0.7) return "text-red-400";
        if (score > 0.3) return "text-yellow-400";
        return "text-green-400";
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Header skeleton */}
                <div className="flex items-center justify-between">
                    <div className="h-7 bg-soft/20 rounded w-48 animate-pulse"></div>
                    <div className="flex items-center gap-4">
                        <div className="h-10 bg-soft/20 rounded w-24 animate-pulse"></div>
                        <div className="h-10 bg-soft/20 rounded w-32 animate-pulse"></div>
                        <div className="h-10 bg-soft/20 rounded w-28 animate-pulse"></div>
                    </div>
                </div>
                {/* Stats skeleton */}
                <StatsGridSkeleton columns={4} />
                {/* Table skeleton */}
                <TableSkeleton columns={6} rows={8} />
            </div>
        );
    }

    const pendingPayouts = payouts.filter((p) => p.status === "pending");
    const suspiciousPayouts = payouts.filter((p) => p.requiresManualReview || p.fraudScore > 0.3);
    const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Payout Control</h2>
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 bg-soft hover:bg-soft/80 text-white rounded-lg transition-colors cursor-pointer">
                        <Settings size={16} />
                        Settings
                    </button>
                    <button onClick={() => setShowManualPayout(true)} className="flex items-center gap-2 px-4 py-2 bg-neon-pink hover:bg-neon-pink/80 text-white rounded-lg transition-colors">
                        <Plus size={16} />
                        Manual Payout
                    </button>
                    <button onClick={handleAutoPayouts} disabled={processingAuto || !settings?.autoPayoutEnabled} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
                        <Play size={16} />
                        {processingAuto ? "Processing..." : "Auto Payouts"}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Clock className="text-yellow-400" size={24} />
                        <span className="text-xs text-light bg-yellow-500/20 px-2 py-1 rounded-full">PENDING</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{pendingPayouts.length}</div>
                    <div className="text-soft text-sm">Pending Requests</div>
                </div>

                <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <DollarSign className="text-neon-pink" size={24} />
                        <span className="text-xs text-light bg-neon-pink/20 px-2 py-1 rounded-full">AMOUNT</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{formatCurrency(totalPendingAmount)}</div>
                    <div className="text-soft text-sm">Total Pending</div>
                </div>

                <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <AlertTriangle className="text-red-400" size={24} />
                        <span className="text-xs text-light bg-red-500/20 px-2 py-1 rounded-full">SUSPICIOUS</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{suspiciousPayouts.length}</div>
                    <div className="text-soft text-sm">Need Review</div>
                </div>

                <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Check className="text-green-400" size={24} />
                        <span className="text-xs text-light bg-green-500/20 px-2 py-1 rounded-full">PROCESSED</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{payouts.filter((p) => p.status === "completed").length}</div>
                    <div className="text-soft text-sm">This Month</div>
                </div>
            </div>

            {/* Payout Requests Table */}
            <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Payout Requests</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr className="text-light font-medium">
                                <th className="text-left p-4 ">Affiliate</th>
                                <th className="text-left p-4 ">Amount</th>
                                <th className="text-left p-4 ">Network</th>
                                <th className="text-left p-4 ">Fraud Score</th>
                                <th className="text-left p-4 ">Status</th>
                                <th className="text-left p-4 ">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payouts.map((payout, index) => (
                                <tr key={payout.id} className={`border-t border-white/5 hover:bg-white/5 transition-colors ${index % 2 === 0 ? "bg-white/2" : ""}`}>
                                    <td className="p-4">
                                        <div>
                                            <div className="text-white font-medium">{payout.affiliateId}</div>
                                            <div className="text-soft text-xs font-mono">
                                                {payout.walletAddress.slice(0, 8)}...{payout.walletAddress.slice(-8)}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-white font-semibold">{formatCurrency(payout.amount)}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">{payout.network}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`font-semibold ${getFraudScoreColor(payout.fraudScore)}`}>{(payout.fraudScore * 100).toFixed(1)}%</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>{payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}</span>
                                    </td>
                                    <td className="p-4">
                                        {payout.status === "pending" && (
                                            <div className="flex items-center gap-2">
                                                {payout.requiresManualReview || payout.fraudScore > 0.3 ? (
                                                    <button onClick={() => setSelectedPayout(payout)} className="p-2 text-yellow-400 hover:bg-yellow-400/20 rounded-lg transition-colors" title="Review Required">
                                                        <Edit3 size={16} />
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => handlePayout(payout.id, "approve")} className="p-2 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors" title="Approve">
                                                            <Check size={16} />
                                                        </button>
                                                        <button onClick={() => handlePayout(payout.id, "reject")} className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors" title="Reject">
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {payout.status !== "pending" && <div className="text-gray-400 text-sm">{payout.processedDate || payout.requestDate}</div>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {payouts.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-soft mb-2">No payout requests</div>
                        <div className="text-soft text-sm">All payouts are up to date</div>
                    </div>
                )}
            </div>

            {/* Payout Review Modal */}
            <PayoutReviewModal isOpen={!!selectedPayout} payout={selectedPayout} onClose={() => setSelectedPayout(null)} onApprove={(network, notes) => handlePayout(selectedPayout!.id, "approve", network, notes)} onReject={(notes) => handlePayout(selectedPayout!.id, "reject", undefined, notes)} />

            {/* Settings Modal */}
            <PayoutSettingsModal isOpen={showSettings} settings={settings} onClose={() => setShowSettings(false)} onSave={handleSettingsUpdate} />

            {/* Manual Payout Modal */}
            <ManualPayoutModal
                isOpen={showManualPayout}
                onClose={() => setShowManualPayout(false)}
                onCreate={async (affiliateId: string, amount: number, network: string, notes?: string) => {
                    await createManualPayout(affiliateId, amount, network as "SOL" | "USDT" | "ETH" | "BTC", notes);
                    setShowManualPayout(false);
                    // Refresh data
                    const data = await getPayoutRequests();
                    setPayouts(data);
                }}
            />
        </div>
    );
}
