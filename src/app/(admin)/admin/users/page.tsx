"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import UserStats from "@/components/admin/UserStats";
import UserFilters from "@/components/admin/UserFilters";
import UserTable from "@/components/admin/UserTable";
import UserPagination from "@/components/admin/UserPagination";
import { User, UserStats as UserStatsType, UsersApiService } from "@/utils/api/usersApi";
import { AdminPageSkeleton } from "@/components/admin/common/SkeletonLoader";
import { useAdmin } from "@/contexts/AdminContext";

export default function AdminUsers() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAdmin();

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const itemsPerPage = 10;

  // Load data only after auth is confirmed
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      try {
        router.replace("/admin/login");
      } catch {}
      return;
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, statsData] = await Promise.all([UsersApiService.fetchUsers(), UsersApiService.fetchUserStats()]);
      setUsers(usersData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.walletAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleUserClick = (user: User) => {
    router.push(`/admin/users/${user.id}`);
  };

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Wallet Address,PDA Balance,Status,Win Rate,Total Wins,Total Losses,Total Bets,Favorite Game,Last Active\n" +
      filteredUsers
        .map((user) => `${user.walletAddress},$${user.pdaBalance.toFixed(2)},${user.status.toUpperCase()},${user.winRate.toFixed(1)}%,${user.totalWins},${user.totalLosses},${user.totalBets.toLocaleString()},${user.favoriteGame || 'N/A'},${new Date(user.lastActive).toLocaleDateString()}`)
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "users_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // While auth or initial load is happening, show skeleton (no UI flash)
  if (authLoading || loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader title="Users" subtitle="Manage platform users" />
          <AdminPageSkeleton
            title="Users"
            subtitle="Manage platform users"
            showStats={true}
            showFilters={true}
            statsColumns={4}
            tableColumns={8}
            tableRows={10}
          />
        </div>
      </div>
    );
  }

  // If not authenticated (authLoading finished) we've already redirected; avoid UI flash.
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader title="Users" subtitle="Manage platform users" />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <UserStats stats={stats} />

          <UserFilters onSearchChange={setSearchTerm} onStatusFilter={setStatusFilter} onExport={handleExport} />

          <UserTable users={currentUsers} onUserClick={handleUserClick} />

          <UserPagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredUsers.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
        </main>
      </div>
    </div>
  );
}
