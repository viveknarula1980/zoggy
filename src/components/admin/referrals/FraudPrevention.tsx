"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Shield, Eye, Ban, Globe, RotateCcw, Search, HelpCircle } from "lucide-react";
import { getFraudAlerts, type FraudAlert } from "@/utils/api/adminReferralsApi";
import { StatsGridSkeleton, TableSkeleton } from "../common/SkeletonLoader";

export default function FraudPrevention() {
    const [alerts, setAlerts] = useState<FraudAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const data = await getFraudAlerts();
                setAlerts(data);
            } catch (error) {
                console.error("Failed to fetch fraud alerts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAlerts();
    }, []);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "high":
                return "text-red-400 bg-red-400/20";
            case "medium":
                return "text-yellow-400 bg-yellow-400/20";
            case "low":
                return "text-green-400 bg-green-400/20";
            default:
                return "text-gray-400 bg-gray-400/20";
        }
    };

    const getTypeIcon = (type: string) => {
        const iconProps = { className: "w-4 h-4" };
        switch (type) {
            case "multiple_ips":
                return <Globe {...iconProps} />;
            case "self_referral":
                return <RotateCcw {...iconProps} />;
            case "no_wagering":
                return <AlertTriangle {...iconProps} />;
            case "suspicious_pattern":
                return <Search {...iconProps} />;
            default:
                return <HelpCircle {...iconProps} />;
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <StatsGridSkeleton columns={4} />
                <TableSkeleton columns={4} rows={6} />
                <div className="grid md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="glass rounded-xl p-4 animate-pulse">
                            <div className="space-y-3">
                                <div className="h-5 bg-soft/20 rounded w-3/4"></div>
                                <div className="h-4 bg-soft/20 rounded w-full"></div>
                                <div className="h-3 bg-soft/20 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const activeAlerts = alerts.filter((alert) => !alert.resolved);
    const resolvedAlerts = alerts.filter((alert) => alert.resolved);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Fraud Prevention</h2>
                <div className="text-sm text-soft">{activeAlerts.length} active alerts</div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <AlertTriangle className="text-red-400" size={24} />
                        <span className="text-xs text-soft bg-red-500/20 px-2 py-1 rounded-full">HIGH</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{alerts.filter((a) => a.severity === "high" && !a.resolved).length}</div>
                    <div className="text-soft text-sm">High Risk Alerts</div>
                </div>

                <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Shield className="text-yellow-400" size={24} />
                        <span className="text-xs text-soft bg-yellow-500/20 px-2 py-1 rounded-full">MEDIUM</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{alerts.filter((a) => a.severity === "medium" && !a.resolved).length}</div>
                    <div className="text-soft text-sm">Medium Risk Alerts</div>
                </div>

                <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Eye className="text-blue-400" size={24} />
                        <span className="text-xs text-soft bg-blue-500/20 px-2 py-1 rounded-full">MONITORING</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{alerts.filter((a) => a.type === "suspicious_pattern").length}</div>
                    <div className="text-soft text-sm">Under Review</div>
                </div>

                <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Ban className="text-green-400" size={24} />
                        <span className="text-xs text-soft bg-green-500/20 px-2 py-1 rounded-full">RESOLVED</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{resolvedAlerts.length}</div>
                    <div className="text-soft text-sm">Resolved This Month</div>
                </div>
            </div>

            {/* Active Alerts */}
            <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Active Fraud Alerts</h3>
                </div>
                <div className="p-4 space-y-4">
                    {activeAlerts.map((alert) => (
                        <div key={alert.id} className="glass-dark rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">{getTypeIcon(alert.type)}</div>
                                    <div>
                                        <div className="text-white font-medium">Affiliate {alert.affiliateId}</div>
                                        <div className="text-soft text-sm">{alert.date}</div>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>{alert.severity.toUpperCase()}</span>
                            </div>
                            <p className="text-soft text-sm mb-3">{alert.description}</p>
                            <div className="flex items-center gap-2">
                                <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">Mark Resolved</button>
                                <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">Take Action</button>
                                <button className="px-3 py-1.5 glass hover:bg-white/10 text-white text-sm rounded-lg transition-colors">View Details</button>
                            </div>
                        </div>
                    ))}

                    {activeAlerts.length === 0 && (
                        <div className="text-center py-8">
                            <Shield className="mx-auto text-green-400 mb-4" size={48} />
                            <div className="text-white font-medium mb-2">All Clear!</div>
                            <div className="text-soft text-sm">No active fraud alerts at this time</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Fraud Detection Rules */}
            <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Detection Rules</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    {[
                        {
                            title: "Multiple IP Detection",
                            description: "Flags when multiple referrals come from the same IP address",
                            enabled: true,
                            threshold: "3+ referrals",
                        },
                        {
                            title: "Self-Referral Detection",
                            description: "Identifies potential self-referrals using wallet analysis",
                            enabled: true,
                            threshold: "Pattern match",
                        },
                        {
                            title: "No Wagering Alert",
                            description: "Alerts when referrals deposit but don't wager within 24h",
                            enabled: true,
                            threshold: "24 hours",
                        },
                        {
                            title: "Suspicious Patterns",
                            description: "ML-based detection of unusual referral patterns",
                            enabled: false,
                            threshold: "AI threshold",
                        },
                    ].map((rule, index) => (
                        <div key={index} className="glass-dark rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-white font-medium">{rule.title}</h4>
                                <div className={`w-3 h-3 rounded-full ${rule.enabled ? "bg-green-400" : "bg-gray-400"}`}></div>
                            </div>
                            <p className="text-soft text-sm mb-3">{rule.description}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-soft">Threshold: {rule.threshold}</span>
                                <button className="text-xs text-neon-pink hover:text-neon-pink/80 transition-colors">Configure</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
