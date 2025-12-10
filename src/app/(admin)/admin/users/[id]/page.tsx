"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import UserDetailInfo from "@/components/admin/UserDetailInfo";
import UserActivityList from "@/components/admin/UserActivityList";
import { User, UserActivity, UsersApiService } from "@/utils/api/usersApi";
import { StatsGridSkeleton, LoadingState } from "@/components/admin/common/SkeletonLoader";
import { useAdmin } from "@/contexts/AdminContext";
import { Clock, X, ArrowLeft } from "lucide-react";

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = (params?.id as string) || "";

  const { isAuthenticated, isLoading: authLoading } = useAdmin();

  const [user, setUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Redirect to login if unauthenticated after auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      try {
        router.replace("/admin/login");
      } catch {}
    }
  }, [authLoading, isAuthenticated, router]);

  // Load user data only when auth is confirmed
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    if (!userId) {
      router.replace("/admin/users");
      return;
    }

    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [usersData, activitiesData] = await Promise.all([
        UsersApiService.fetchUsers(),
        UsersApiService.fetchUserActivities(userId),
      ]);

      const foundUser = usersData.find((u) => String(u.id) === String(userId));
      if (!foundUser) {
        router.replace("/admin/users");
        return;
      }

      setUser(foundUser);
      setActivities(activitiesData || []);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: "active" | "disabled" | "banned") => {
    if (!user) return;

    try {
      setUpdating(true);
      await UsersApiService.updateUserStatus(userId, newStatus);
      setUser({ ...user, status: newStatus });

      // Simple success feedback (replace with toast if desired)
      alert(`User status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Failed to update user status");
    } finally {
      setUpdating(false);
    }
  };

  const handleBackToUsers = () => {
    router.push("/admin/users");
  };

  // While auth is being checked, render skeleton to avoid flash (no UI changes)
  if (authLoading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader title="User Details" subtitle="Loading user information..." />
          <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <StatsGridSkeleton columns={3} />
            <div className="glass rounded-xl p-6 mt-6 border border-soft/10">
              <LoadingState message="Checking authentication..." description="Please wait" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // If not authenticated (authLoading finished) we've already redirected; avoid UI flash.
  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader title="User Details" subtitle="Loading user information..." />
          <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="glass rounded-xl p-12 border border-soft/10 text-center">
              <div className="mb-4">
                <Clock className="w-12 h-12 text-neon-pink mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Loading user details...</h3>
              <p className="text-soft">Please wait while we fetch user information</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader title="User Not Found" subtitle="The requested user could not be found" />
          <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="glass rounded-xl p-12 border border-soft/10 text-center">
              <div className="mb-4">
                <X className="w-16 h-16 text-red-400 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">User not found</h3>
              <p className="text-soft mb-6">The user you're looking for doesn't exist or has been removed.</p>
              <button onClick={handleBackToUsers} className="px-6 py-3 bg-neon-pink hover:bg-neon-pink/80 text-white rounded-lg transition-colors">
                Back to Users
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader title={`User: ${user.username}`} subtitle="Manage user account and view activity" />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Back Button */}
          <button onClick={handleBackToUsers} className="mb-6 px-4 py-2 rounded-lg text-white hover:bg-card/30 transition-colors flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </button>

          <div className="space-y-6">
            {/* User Details - Full width */}
            <UserDetailInfo user={user} onStatusUpdate={handleStatusUpdate} updating={updating} />

            {/* User Activities - Table at bottom */}
            <UserActivityList activities={activities} />
          </div>
        </main>
      </div>
    </div>
  );
}
