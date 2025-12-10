"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Calendar, TrendingUp } from "lucide-react";
import { getReferralActivity, type ReferralActivity } from "@/utils/api/referralsApi";

const LAMPORTS_PER_SOL = 1e9;

// Get live SOL→USD price (fallback to 200 if request fails)
async function fetchSolUsd(): Promise<number> {
  let fallback = 200;
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { cache: "no-store" }
    );
    if (!r.ok) return fallback;
    const j = await r.json();
    const p = Number(j?.solana?.usd);
    return Number.isFinite(p) && p > 0 ? p : fallback;
  } catch {
    return fallback;
  }
}

// Safely coerce any value to bigint lamports
function toLamportsBigInt(v: unknown): bigint {
  if (v == null) return 0n;
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(Math.round(v));
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? BigInt(Math.round(n)) : 0n;
  }
  return 0n;
}

export default function ReferralActivityFeed() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activities, setActivities] = useState<ReferralActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // 1) Fetch data and live SOL price in parallel
        const [data, solUsd] = await Promise.all([getReferralActivity(), fetchSolUsd()]);

        // 2) Convert ONLY wagering to USD (assuming backend may return lamports)
        const normalized: ReferralActivity[] = (Array.isArray(data) ? data : []).map((row: any) => {
          // Prefer explicit lamports fields if present
          const explicitLamports =
            row.amountWageredLamports ??
            row.wagLamports ??
            row.wag ??
            row.amountLamportsWagered ??
            null;

          let convertedWagerUsd: number | null = null;

          if (explicitLamports != null) {
            const lam = toLamportsBigInt(explicitLamports);
            convertedWagerUsd = (Number(lam) / LAMPORTS_PER_SOL) * solUsd;
          } else if (row.amountWageredIsLamports === true) {
            const lam = toLamportsBigInt(row.amountWagered);
            convertedWagerUsd = (Number(lam) / LAMPORTS_PER_SOL) * solUsd;
          } else {
            // Heuristic: if amountWagered looks like lamports (very large int), convert; else keep as-is
            const awNum = Number(row.amountWagered);
            if (Number.isFinite(awNum) && awNum > 10_000_000 /* ~0.01 SOL in lamports */) {
              convertedWagerUsd = (awNum / LAMPORTS_PER_SOL) * solUsd;
            }
          }

          // Only change amountWagered; keep everything else the same
          return {
            ...row,
            amountWagered:
              convertedWagerUsd != null && Number.isFinite(convertedWagerUsd)
                ? Number(convertedWagerUsd.toFixed(2))
                : row.amountWagered ?? 0,
          } as ReferralActivity;
        });

        setActivities(normalized);
      } catch (error) {
        console.error("Failed to fetch referral activities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = activity.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || activity.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded mb-4"></div>
          <div className="h-96 bg-gray-700 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-400 bg-green-400/20";
      case "inactive":
        return "text-gray-400 bg-gray-400/20";
      case "pending":
        return "text-yellow-400 bg-yellow-400/20";
      default:
        return "text-gray-400 bg-gray-400/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-green-400" size={28} />
          <h2 className="text-2xl font-bold text-white">Referral Activity Feed</h2>
        </div>
        <div className="text-sm text-soft">
          {filteredActivities.length} of {activities.length} referrals
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-soft" size={16} />
          <input
            type="text"
            placeholder="Search by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-glass-dark border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-neon-pink/50 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-light" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-white/10 rounded-lg px-3 py-3 text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Activity Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-4 text-white font-medium">User</th>
                <th className="text-left p-4 text-white font-medium">First Deposit</th>
                <th className="text-left p-4 text-white font-medium">Amount Wagered</th>
                <th className="text-left p-4 text-white font-medium">Commission</th>
                <th className="text-left p-4 text-white font-medium">Status</th>
                <th className="text-left p-4 text-white font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((activity, index) => (
                <tr
                  key={activity.id}
                  className={`border-t border-white/5 hover:bg-white/5 transition-colors ${
                    index % 2 === 0 ? "bg-white/2" : ""
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-neon-pink to-purple rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {activity.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-light font-medium">{activity.username}</div>
                        <div className="text-soft text-xs">{activity.totalDeposits} deposits</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="light" />
                      <span className="text-light">
                        {activity.firstDeposit ? formatDate(activity.firstDeposit) : "No deposit yet"}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-light font-semibold">{formatCurrency(activity.amountWagered)}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-neon-pink font-semibold">{formatCurrency(activity.commissionEarned)}</div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}
                    >
                      {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-light text-sm">
                      {activity.lastActivity ? formatDate(activity.lastActivity) : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredActivities.length === 0 && (
          <div className="text-center py-12">
            <div className="text-light mb-2">No referrals found</div>
            <div className="text-light text-sm">Try adjusting your search or filters</div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {activities.filter((a) => a.status === "active").length}
            </div>
            <div className="text-soft text-sm">Active Players</div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-neon-pink mb-1">
              {formatCurrency(activities.reduce((sum, a) => sum + a.commissionEarned, 0))}
            </div>
            <div className="text-soft text-sm">Total Earned</div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {formatCurrency(activities.reduce((sum, a) => sum + a.amountWagered, 0))}
            </div>
            <div className="text-soft text-sm">Total Wagered</div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {(
                activities.reduce((sum, a) => sum + a.amountWagered, 0) / (activities.length || 1)
              ).toFixed(0)}
            </div>
            <div className="text-soft text-sm">Avg per Player</div>
          </div>
        </div>
      </div>
    </div>
  );
}
