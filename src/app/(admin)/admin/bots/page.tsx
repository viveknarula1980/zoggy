"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import BotStats from "@/components/admin/bot/BotStats";
import BotControls from "@/components/admin/bot/BotControls";
import BotSettings from "@/components/admin/bot/BotSettings";
import BotActivityFeed from "@/components/admin/bot/BotActivityFeed";
import { BarChart3, Settings, Activity } from "lucide-react";

import {
  BotStatsData,
  BotConfig,
  BotActivity,
  defaultConfig,
  // removed mock imports
  fetchBotConfig,
  fetchBotStats,
  updateBotConfig,
  setBotEnabled,
  subscribeBotActivities,
  hydrateRecentFromServer,
  getRecentActivities,
  forceBigWin,
} from "@/utils/api/adminbot";

import { useAdmin } from "@/contexts/AdminContext";
import {
  StatsGridSkeleton,
  LoadingState,
} from "@/components/admin/common/SkeletonLoader";

export default function AdminBots() {
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "activity">(
    "overview"
  );
  const [isRunning, setIsRunning] = useState(false);

  // start with empty live stats; winRate from defaultConfig until server responds
  const [stats, setStats] = useState<BotStatsData>({
    activeUsers: 0,
    totalBets: 0,
    dailyVolume: 0,
    winRate: defaultConfig.winRate,
  });

  const [config, setConfig] = useState<BotConfig>(defaultConfig);
  const [activities, setActivities] = useState<BotActivity[]>([]);
  const [loading, setLoading] = useState(false);

  // auth
  const { isAuthenticated, isLoading: authLoading } = useAdmin();
  const router = useRouter();

  // Auth guard: redirect to login if unauthenticated after auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      try {
        router.replace("/admin/login");
      } catch {}
    }
  }, [authLoading, isAuthenticated, router]);

  // Hydrate from backend + subscribe (only when authenticated)
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    let mounted = true;

    (async () => {
      try {
        const { enabled, config } = await fetchBotConfig();
        if (mounted) {
          setIsRunning(enabled);
          setConfig(config);
        }
      } catch (e) {
        console.warn("fetchBotConfig failed:", e);
      }

      try {
        const s = await fetchBotStats();
        if (mounted) setStats(s);
      } catch (e) {
        console.warn("fetchBotStats failed:", e);
      }

      // Hydrate recent activity from server buffer (newest-first returned)
      try {
        const initial = await hydrateRecentFromServer(120);
        if (mounted) setActivities(initial.slice(0, 120));
      } catch (e) {
        console.warn("hydrateRecentFromServer failed, falling back:", e);
        if (mounted) setActivities(getRecentActivities(120));
      }
    })();

    // Subscribe to live events
    const unsub = subscribeBotActivities((a) => {
      setActivities((prev) => [a, ...prev].slice(0, 120));
    });

    // Poll stats periodically
    const poll = setInterval(async () => {
      try {
        const s = await fetchBotStats();
        setStats(s);
      } catch {}
    }, 15000);

    return () => {
      mounted = false;
      try {
        unsub();
      } catch {}
      clearInterval(poll);
    };
  }, [authLoading, isAuthenticated]);

  const handleToggleSimulation = async () => {
    const next = !isRunning;
    try {
      await setBotEnabled(next);
      setIsRunning(next);
    } catch (e) {
      console.error("setBotEnabled failed:", e);
    }
    console.log(
      isRunning ? "Stopping bot simulation..." : "Starting bot simulation..."
    );
  };

  // Real Force Big Win trigger
const handleForceBigWin = async () => {
  try {
    await forceBigWin();                // ✅ uses HTTP_URL (port 4000)
    console.log("Big Win triggered!");
  } catch (err) {
    console.error("Force Big Win failed:", err);
    alert("Failed to trigger Big Win — check backend logs.");
  }
};



  const handleResetStats = () => {
    setStats({
      activeUsers: 0,
      totalBets: 0,
      dailyVolume: 0,
      winRate: config.winRate,
    });
    setActivities([]);
  };

  const handleConfigChange = (newConfig: BotConfig) => {
    setConfig(newConfig);
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const { enabled, config: applied } = await updateBotConfig(config);
      setIsRunning(enabled);
      setConfig(applied);
    } catch (e) {
      console.error("updateBotConfig failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfig = () => {
    setConfig(defaultConfig);
  };

  const handleExportActivity = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "User,Game,Action,Bet Amount,Result,Multiplier,Time\n" +
      activities
        .map(
          (activity) =>
            `${activity.username},${activity.game.charAt(0).toUpperCase() + activity.game.slice(1)},${activity.action.toUpperCase()},${activity.amount.toFixed(3)} SOL,${activity.result > 0 ? '+' : ''}${activity.result.toFixed(3)} SOL,${
              activity.multiplier ? activity.multiplier + 'x' : '-'
            },${activity.timestamp}`
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bot_activity_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    {
      id: "overview",
      label: "Overview & Controls",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: "settings",
      label: "Bot Configuration",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: "activity",
      label: "Activity Feed",
      icon: <Activity className="w-4 h-4" />,
    },
  ];

  // While auth is loading, render skeleton to avoid flash
  if (authLoading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader
            title="Bot Management"
            subtitle="Control automated user simulation"
          />
          <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <StatsGridSkeleton columns={3} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="glass rounded-xl p-6 border border-soft/10">
                <LoadingState
                  message="Checking authentication..."
                  description="Please wait"
                />
              </div>
              <div className="glass rounded-xl p-6 border border-soft/10">
                <LoadingState
                  message="Preparing bot controls..."
                  description="Please wait"
                />
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
        <AdminHeader
          title="Bot Management"
          subtitle="Control automated user simulation"
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === (tab.id as any)
                    ? "bg-neon-pink/20 text-neon-pink border border-neon-pink/30"
                    : "text-soft hover:text-white hover:bg-background/50"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <BotStats stats={stats} />
              <BotControls
                isRunning={isRunning}
                onToggleSimulation={handleToggleSimulation}
                onForceBigWin={handleForceBigWin}
                onResetStats={handleResetStats}
              />
            </div>
          )}

          {activeTab === "settings" && (
            <BotSettings
              config={config}
              onConfigChange={handleConfigChange}
              onSave={handleSaveConfig}
              onReset={handleResetConfig}
              // keep props exactly as your component expects
            />
          )}

          {activeTab === "activity" && (
            <BotActivityFeed
              activities={activities}
              onExport={handleExportActivity}
            />
          )}
        </main>
      </div>
    </div>
  );
}
