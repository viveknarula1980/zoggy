"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import ChestStats, { ChestStatsData } from "@/components/admin/chest/ChestStats";
import ChestFilters, { ChestFilters as FiltersType } from "@/components/admin/chest/ChestFilters";
import ChestTable, { ChestData } from "@/components/admin/chest/ChestTable";
import ChestPagination from "@/components/admin/chest/ChestPagination";
import ChestDetailsPopup from "@/components/admin/chest/ChestDetailsPopup";

// ✅ API fetchers + mock fallbacks
import {
  fetchChests,
  fetchChestStats,
  chestMockChests,
  chestMockStats,
} from "@/utils/api/adminchestapi";
import { StatsGridSkeleton, FiltersSkeleton, TableSkeleton } from "@/components/admin/common/SkeletonLoader";

import { useAdmin } from "@/contexts/AdminContext";

export default function AdminChests() {
  const [chests, setChests] = useState<ChestData[]>(chestMockChests);
  const [filteredChests, setFilteredChests] = useState<ChestData[]>(chestMockChests);
  const [stats, setStats] = useState<ChestStatsData | null>(chestMockStats);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedChest, setSelectedChest] = useState<ChestData | null>(null);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);

  // Filters
  const [filters, setFilters] = useState<FiltersType>({
    type: "all",
    status: "all",
    search: "",
  });

  const itemsPerPage = 10;

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

  // 🔄 Fetch data on mount — only when authenticated
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [rows, statz] = await Promise.all([
          fetchChests(200, { signal: ac.signal, fallbackToMock: true }),
          fetchChestStats({ signal: ac.signal, fallbackToMock: true }),
        ]);
        setChests(rows);
        setStats(statz);
      } catch (err: any) {
        console.error("AdminChests load error:", err);
        setErrorMsg(err?.message || "Failed to load chest data.");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [authLoading, isAuthenticated]);

  // If auth is loading, show skeleton to avoid flash
  if (authLoading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader
            title="Chest Management"
            subtitle="Monitor and manage platform chest rewards"
          />

          <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="space-y-6">
              <StatsGridSkeleton columns={4} />
              <FiltersSkeleton />
              <TableSkeleton columns={7} rows={10} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // If not authenticated (authLoading is false) we've already redirected; return null to avoid UI flash.
  if (!isAuthenticated) return null;

  // 🔍 Filtering logic
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chests, filters]);

  const applyFilters = () => {
    let filtered = [...chests];

    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.walletAddress.toLowerCase().includes(q) ||
          c.chestType.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (filters.type !== "all") {
      filtered = filtered.filter((c) => c.chestType === filters.type);
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    setFilteredChests(filtered);
    setCurrentPage(1); // reset pagination
  };

  const handleFilterChange = (key: keyof FiltersType, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleChestClick = (chest: ChestData) => {
    setSelectedChest(chest);
    setShowDetailsPopup(true);
  };

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "User,Chest Type,Status,Reward,Claimed/Expires\n" +
      filteredChests
        .map(
          (c) =>
            `${c.walletAddress || "N/A"},${c.chestType.charAt(0).toUpperCase() + c.chestType.slice(1)},${c.status.charAt(0).toUpperCase() + c.status.slice(1)},${c.rewardValue} ${c.rewardType},${c.status === "claimed" && c.claimedAt ? "Claimed " + new Date(c.claimedAt).toLocaleDateString() : "Expires " + new Date(c.expiresAt).toLocaleDateString()}`
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "chests_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 📄 Pagination
  const totalPages = Math.ceil(filteredChests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentChests = useMemo(
    () => filteredChests.slice(startIndex, endIndex),
    [filteredChests, startIndex, endIndex]
  );

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          title="Chest Management"
          subtitle="Monitor and manage platform chest rewards"
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Stats */}
          <ChestStats stats={stats} />

          {/* Filters */}
          <ChestFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onSearchChange={handleSearchChange}
            onExport={handleExport}
          />

          {/* Loading */}
          {loading && (
            <div className="space-y-6">
              <StatsGridSkeleton columns={4} />
              <FiltersSkeleton />
              <TableSkeleton columns={7} rows={10} />
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="text-red-400 text-center py-4">{errorMsg}</div>
          )}

          {/* Table + Pagination */}
          {!loading && (
            <>
              <ChestTable chests={currentChests} onChestClick={handleChestClick} />
              {totalPages > 1 && (
                <ChestPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredChests.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Popup */}
      {showDetailsPopup && selectedChest && (
        <ChestDetailsPopup
          chest={selectedChest}
          onClose={() => {
            setShowDetailsPopup(false);
            setSelectedChest(null);
          }}
        />
      )}
    </div>
  );
}
