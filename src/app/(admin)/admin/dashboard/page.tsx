// AdminDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Users, GamepadIcon, Wallet, Settings, UserCheck, LineChart, ArrowUpRight, DollarSign } from "lucide-react";
import { StatsGridSkeleton, LoadingState } from "@/components/admin/common/SkeletonLoader";
import { useAdmin } from "@/contexts/AdminContext";

type AdminStatsResponse = {
  stats: {
    totalUsers: number;
    totalVolume: string | number; // lamports
    totalRevenue: string | number; // lamports
    todayRevenue: string | number; // lamports
  };
  recentActivity: { user: string; action: string; amount: string; time: string }[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [activeGames, setActiveGames] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // auth
  const { isAuthenticated, isLoading: authLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    // If auth check is done and user is not authenticated, redirect to login.
    if (!authLoading && !isAuthenticated) {
      try {
        // router.replace keeps history clean for pasted URLs
        router.replace('/admin/login');
      } catch {}
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    // Only fetch admin data if authenticated. If auth is still loading, wait.
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    async function fetchAll() {
      try {
        const base =
          process.env.NEXT_PUBLIC_BACKEND_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          "";
        const baseUrl = base.replace(/\/$/, "");
        // Use proxy for games in browser, direct URL on server
        const gamesUrl = typeof window !== "undefined"
          ? "/api/admin/games"
          : `${baseUrl}/admin/games`;
        const [statsRes, gamesRes] = await Promise.all([
          fetch(`${baseUrl}/admin/stats`, { cache: "no-store" }),
          fetch(gamesUrl, { cache: "no-store" }),
        ]);

        if (statsRes.ok) {
          const data: AdminStatsResponse = await statsRes.json();
          setStats(data);
        }

        if (gamesRes.ok) {
          const games = await gamesRes.json();
          const active = (games || []).filter((g: any) => g.enabled && g.running).length;
          setActiveGames(active);
        }
      } catch (err) {
        console.error("Failed to fetch admin data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [authLoading, isAuthenticated]);

  // While auth is being checked, show a lightweight skeleton/loading to avoid flash.
  if (authLoading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader title="Dashboard" subtitle="Overview of your gaming platform" />
          <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <StatsGridSkeleton columns={4} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="glass rounded-xl p-6 border border-soft/10">
                <LoadingState message="Checking authentication..." description="Please wait" />
              </div>
              <div className="glass rounded-xl p-6 border border-soft/10">
                <LoadingState message="Preparing dashboard..." description="Please wait" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // If not authenticated (and authLoading is false) we've already redirected; return null to avoid UI flash.
  if (!isAuthenticated) return null;

  // Convert lamports to USD safely (assuming 1 SOL = $100 for conversion)
  const tvUsd: number = stats ? (Number(stats.stats.totalVolume || 0) / 1e9) * 100 : 0;
  const todayRevUsd: number = stats ? (Number(stats.stats.todayRevenue || 0) / 1e9) * 100 : 0;

  const statsCards = stats
    ? [
        {
          title: "Total Users",
          value: stats.stats.totalUsers,
          change: "+0%",
          changeType: "positive" as const,
          icon: <Users className="w-8 h-8 text-soft" />,
        },
        {
          title: "Active Games",
          value: activeGames,
          change: "+0%",
          changeType: "positive" as const,
          icon: <GamepadIcon className="w-8 h-8 text-soft" />,
        },
        {
          title: "Total Volume",
          value: `$${tvUsd.toFixed(2)}`,
          change: "+0%",
          changeType: "positive" as const,
          icon: <Wallet className="w-8 h-8 text-soft" />,
        },
        {
          title: "Daily Revenue",
          value: `$${todayRevUsd.toFixed(2)}`,
          change: "+0%",
          changeType: todayRevUsd >= 0 ? "positive" as const : "negative" as const,
          icon: <Wallet className="w-8 h-8 text-soft" />,
        },
      ]
    : [];

  const recentActivity = stats?.recentActivity || [];

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader title="Dashboard" subtitle="Overview of your gaming platform" />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">

          {loading ? (
            <StatsGridSkeleton columns={4} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statsCards.map((stat, index) => (
                <div key={index} className="glass rounded-xl p-6 border border-soft/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-soft text-sm font-medium">{stat.title}</p>
                      <p className="text-2xl font-bold text-light mt-2">{stat.value}</p>
                      <p
                        className={`text-sm mt-2 ${
                          stat.changeType === "positive" ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {stat.change} from last month
                      </p>
                    </div>
                    <div className="text-3xl">{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6 border border-soft/10">
              <h3 className="text-lg font-semibold text-light mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {loading ? (
                  <LoadingState message="Loading activity..." description="Fetching recent user activity" />
                ) : recentActivity.length === 0 ? (
                  <p className="text-soft">No recent activity</p>
                ) : (
                  recentActivity.map((activity, index) => {
                    const formattedAmount = parseFloat(activity.amount)
                      .toFixed(4)
                      .replace(/\.?0+$/, "");
                    const shortUser =
                      activity.user.length > 10
                        ? `${activity.user.slice(0, 6)}…${activity.user.slice(-4)}`
                        : activity.user;

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b border-border/20 last:border-b-0"
                      >
                        <div>
                          <p className="text-light font-medium">{shortUser}</p>
                          <p className="text-soft text-sm">{activity.action}</p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-medium ${
                              parseFloat(activity.amount) >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {parseFloat(activity.amount) >= 0
                              ? `+${formattedAmount}`
                              : formattedAmount}{" "}
                            USD
                          </p>
                          <p className="text-soft text-sm">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="glass rounded-xl p-6 border border-soft/10">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/admin/games" className="w-full bg-neon-pink/20 hover:bg-neon-pink/30 text-neon-pink rounded-xl py-3 px-4 border border-neon-pink/30 hover:border-neon-pink/50 flex items-center gap-3 transition-colors">
                  <GamepadIcon className="w-5 h-5" /> Manage Games
                </Link>
                <Link href="/admin/users" className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl py-3 px-4 border border-blue-500/30 hover:border-blue-500/50 flex items-center gap-3 transition-colors">
                  <Users className="w-5 h-5" /> View Users
                </Link>
                <Link href="/admin/transactions" className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl py-3 px-4 border border-green-500/30 hover:border-green-500/50 flex items-center gap-3 transition-colors">
                  <DollarSign className="w-5 h-5" /> View Transactions
                </Link>
                <Link href="/admin/withdraw" className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl py-3 px-4 border border-purple-500/30 hover:border-purple-500/50 flex items-center gap-3 transition-colors">
                  <ArrowUpRight className="w-5 h-5" /> Platform Withdraw
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
