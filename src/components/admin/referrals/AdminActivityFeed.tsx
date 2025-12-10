"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, TrendingUp, Users, DollarSign } from "lucide-react";
import { getRecentAdminActivity, getTopSourcesToday, getActivityStats, type AdminActivityItem, type TopSourceToday, type ActivityStats } from "@/utils/api/adminReferralsApi";
import { StatsGridSkeleton, TableSkeleton } from "../common/SkeletonLoader";

// ===== Helpers =====
function classNames(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

function formatCurrency(amount: number | null | undefined) {
    if (amount == null) return null;
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `$${Number(amount).toFixed(2)}`;
    }
}

function relativeTimeFromISO(iso: string) {
    // returns strings like "2m ago", "3h ago", "yesterday", "2d ago"
    const now = Date.now();
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return iso; // if backend already sends "2 minutes ago", show as-is
    const diff = Math.max(0, now - t);
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day === 1) return "yesterday";
    return `${day}d ago`;
}

function statusColor(status: AdminActivityItem["status"]) {
    switch (status) {
        case "success":
            return "text-green-400";
        case "pending":
            return "text-yellow-400";
        case "failed":
            return "text-red-400";
        default:
            return "text-gray-400";
    }
}

function iconFor(type: AdminActivityItem["type"]) {
    switch (type) {
        case "signup":
            return <Users className="text-blue-400" size={16} />;
        case "deposit":
            return <DollarSign className="text-green-400" size={16} />;
        case "commission":
            return <TrendingUp className="text-neon-pink" size={16} />;
        case "payout":
            return <Activity className="text-yellow-400" size={16} />;
        default:
            return <Activity className="text-gray-400" size={16} />;
    }
}

// ===== Component =====
export default function AdminActivityFeed() {
    const [activities, setActivities] = useState<AdminActivityItem[] | null>(null);
    const [sources, setSources] = useState<TopSourceToday[] | null>(null);
    const [stats, setStats] = useState<ActivityStats | null>(null);

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // Polling interval (ms) for live updates
    const POLL_MS = 10_000;

    // Initial fetch + polling
    useEffect(() => {
        let alive = true;
        let timer: ReturnType<typeof setInterval> | null = null;

        async function loadAll() {
            try {
                setErr(null);
                const [a, s, kpi] = await Promise.all([getRecentAdminActivity(50), getTopSourcesToday(), getActivityStats("today")]);
                if (!alive) return;
                setActivities(a);
                setSources(s);
                setStats(kpi);
            } catch (e: any) {
                if (!alive) return;
                setErr(e?.message || "Failed to load admin activity.");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }

        loadAll();
        timer = setInterval(loadAll, POLL_MS);

        return () => {
            alive = false;
            if (timer) clearInterval(timer);
        };
    }, []);

    const kpi = useMemo(
        () => ({
            signups: stats?.signupsToday ?? 0,
            deposits: stats?.depositsToday ?? 0,
            commissions: stats?.commissionsToday ?? 0,
            activeAffiliates: stats?.activeAffiliates ?? 0,
        }),
        [stats]
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Live Activity Feed</h2>
                <div className="flex items-center gap-2">
                    <div className={classNames("w-2 h-2 rounded-full", loading ? "bg-gray-400" : "bg-green-400", !loading && "animate-pulse")} />
                    <span className="text-sm text-soft">{loading ? "Loading" : "Live"}</span>
                </div>
            </div>

            {/* Error banner */}
            {err && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-red-200">{err}</div>}

            {/* Activity Stats */}
            {loading && !stats ? (
                <StatsGridSkeleton columns={4} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Signups Today */}
                    <div className="glass-card rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Users className="text-blue-400" size={20} />
                            <div>
                                <div className="text-2xl font-bold text-white">{kpi.signups}</div>
                                <div className="text-soft text-sm">Signups Today</div>
                            </div>
                        </div>
                    </div>

                    {/* Deposits Today */}
                    <div className="glass-card rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <DollarSign className="text-green-400" size={20} />
                            <div>
                                <div className="text-2xl font-bold text-white">{formatCurrency(kpi.deposits) || "$0.00"}</div>
                                <div className="text-soft text-sm">Deposits Today</div>
                            </div>
                        </div>
                    </div>

                    {/* Commissions Today */}
                    <div className="glass-card rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="text-neon-pink" size={20} />
                            <div>
                                <div className="text-2xl font-bold text-white">{formatCurrency(kpi.commissions) || "$0.00"}</div>
                                <div className="text-soft text-sm">Commissions Today</div>
                            </div>
                        </div>
                    </div>

                    {/* Active Affiliates */}
                    <div className="glass-card rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Activity className="text-yellow-400" size={20} />
                            <div>
                                <div className="text-2xl font-bold text-white">{kpi.activeAffiliates}</div>
                                <div className="text-soft text-sm">Active Affiliates</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Activity Feed */}
            <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                </div>

                <div className="p-4">
                    {loading && !activities && (
                        <TableSkeleton columns={3} rows={5} />
                    )}

                    {!loading && activities && activities.length === 0 && <div className="text-soft">No recent activity.</div>}

                    {!loading && activities && activities.length > 0 && (
                        <div className="space-y-4">
                            {activities.map((activity) => (
                                <div key={activity.id} className="flex items-center gap-4 p-3 glass-dark rounded-lg">
                                    <div className="flex-shrink-0">{iconFor(activity.type)}</div>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-white font-medium">
                                                    {activity.affiliateId} — {activity.description}
                                                </div>
                                                <div className="text-soft text-sm">{relativeTimeFromISO(activity.timestamp)}</div>
                                            </div>

                                            <div className="text-right">
                                                {activity.amount != null && <div className="text-white font-semibold">{formatCurrency(activity.amount)}</div>}
                                                <div className={classNames("text-xs", statusColor(activity.status))}>{activity.status}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Top Sources Today */}
            <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top Performing Sources Today</h3>

                {loading && !sources && (
                    <TableSkeleton columns={2} rows={4} />
                )}

                {!loading && sources && sources.length === 0 && <div className="text-soft">No source data for today.</div>}

                {!loading && sources && sources.length > 0 && (
                    <div className="space-y-3">
                        {sources.map((s, idx) => (
                            <div key={`${s.source}-${idx}`} className="flex items-center justify-between p-3 glass-dark rounded-lg">
                                <div>
                                    <div className="text-white font-medium">{s.source}</div>
                                    <div className="text-soft text-sm">{s.signups} signups</div>
                                </div>
                                <div className="text-green-400 font-semibold">
                                    {/* Ensure conversion is a % string */}
                                    {typeof s.conversion === "number" ? `${s.conversion.toFixed(1)}%` : s.conversion}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
