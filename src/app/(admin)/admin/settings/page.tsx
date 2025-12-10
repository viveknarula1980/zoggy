// app/admin/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import ProfileSettings from "@/components/admin/settings/ProfileSettings";
import PasswordSettings from "@/components/admin/settings/PasswordSettings";
import MaintenanceSettings from "@/components/admin/settings/MaintenanceSettings";
import { User, Lock, AlertTriangle } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { StatsGridSkeleton, LoadingState } from "@/components/admin/common/SkeletonLoader";

type SettingsTab = "profile" | "password" | "maintenance";

const tabs = [
  { id: "profile" as SettingsTab, name: "Profile", icon: User },
  { id: "password" as SettingsTab, name: "Password", icon: Lock },
  { id: "maintenance" as SettingsTab, name: "Maintenance", icon: AlertTriangle },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // auth
  const { isAuthenticated, isLoading: authLoading } = useAdmin();
  const router = useRouter();

  // redirect if unauthenticated after auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      try {
        router.replace("/admin/login");
      } catch {}
    }
  }, [authLoading, isAuthenticated, router]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings />;
      case "password":
        return <PasswordSettings />;
      case "maintenance":
        return <MaintenanceSettings />;
      default:
        return <ProfileSettings />;
    }
  };

  // While auth is being checked, render skeleton (no UI change)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-white flex">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader title="Settings" />
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <StatsGridSkeleton columns={3} />
              <div className="glass-card p-6 mt-6">
                <LoadingState message="Checking authentication..." description="Please wait" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated (authLoading finished), redirect has happened
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background text-white flex">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <AdminHeader title="Settings" />

        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Tab Navigation */}
            <div className="glass-card p-1 mb-6">
              <div className="flex space-x-1">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                        isActive
                          ? "bg-neon-pink/20 text-neon-pink border border-neon-pink/30"
                          : "text-light hover:bg-background/50 hover:text-white"
                      }`}
                    >
                      <Icon size={18} />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">{renderTabContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
