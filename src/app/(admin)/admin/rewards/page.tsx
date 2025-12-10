"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import RewardStats from "@/components/admin/rewards/RewardStats";
import RewardTable from "@/components/admin/rewards/RewardTable";
import RangeTable from "@/components/admin/rewards/RangeTable";
import RewardForm from "@/components/admin/rewards/RewardForm";
import { RewardsApiService, Range, Level, RewardTier } from "@/utils/api/rewardsApi";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { StatsGridSkeleton } from "@/components/admin/common/SkeletonLoader";
import { useAdmin } from "@/contexts/AdminContext";
import { Trophy } from "lucide-react";

type FormType = "range" | "level";

// Extended row type for RewardTable
type RewardRow = RewardTier & { rewardText?: string };

/** Safely parse "$25", "$20000x1", "-", etc. */
function parseWageringAmount(input: string | null | undefined): number {
  const s = (input ?? "").toString().trim();
  if (!s || s === "-") return 0;
  const matches = s.match(/[\d.,]+/g);
  if (!matches || matches.length === 0) return 0;
  const last = matches[matches.length - 1];
  const n = parseFloat(last.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Parse reward string into numeric USD amount (for stats). */
function parseRewardAmount(input: string | null | undefined): number {
  const s = (input ?? "").toString().trim();
  if (!s || s === "-") return 0;

  // Prefer "= $X" at the end (e.g., "10 FS x $0.25 = $2.50")
  const eq = s.match(/=\s*\$?\s*([\d.,]+)/);
  if (eq?.[1]) {
    const n = parseFloat(eq[1].replace(/,/g, ""));
    if (Number.isFinite(n)) return n;
  }

  // Try simple leading number ("15 USDT", "$25", etc.)
  const simple = parseFloat(s.replace(/^\s*\$/, ""));
  if (Number.isFinite(simple)) return simple;

  // Fallback: first numeric token
  const t = s.match(/[\d.]+/);
  const n = t ? parseFloat(t[0]) : 0;
  return Number.isFinite(n) ? n : 0;
}

export default function AdminRewardsPage() {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<FormType>("level");
  const [editingRange, setEditingRange] = useState<Range | null>(null);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);

  const [ranges, setRanges] = useState<Range[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // auth
  const { isAuthenticated, isLoading: authLoading } = useAdmin();
  const router = useRouter();

  // Redirect to login if unauthenticated after auth check completes
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      try {
        router.replace("/admin/login");
      } catch {}
    }
  }, [authLoading, isAuthenticated, router]);

  // Keep levels sorted by level_number (fallback to id)
  const orderedLevels = useMemo(() => {
    return [...levels].sort((a, b) => {
      const la = (a as any).level_number ?? a.id;
      const lb = (b as any).level_number ?? b.id;
      return la - lb;
    });
  }, [levels]);

  // Convert API levels to rows for table/stats
  const convertLevelsToRewardTiers = (levelsIn: Level[], rangesIn: Range[]): RewardRow[] => {
    return levelsIn.map((level) => {
      return {
        id: level.id.toString(),
        name: level.title,
        icon: "trophy",
        requirement: parseWageringAmount(level.wagering),
        rewardAmount: parseRewardAmount(level.reward),
        rewardText: level.reward ?? "-", // shown in table
        color: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
        isActive: !!level.isActive,
        createdAt: level.created_at || new Date().toISOString(),
        updatedAt: level.updated_at || new Date().toISOString(),
        totalClaimed: Number((level as any).totalClaimed ?? (level as any).total_claimed ?? 0),
        totalUsers: Number((level as any).totalUsers ?? (level as any).total_users ?? 0),
      };
    });
  };

  // Load ranges + levels (only after auth confirmed)
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rangesData, levelsData] = await Promise.all([
        RewardsApiService.fetchRanges(),
        RewardsApiService.fetchLevels(),
      ]);
      setRanges(rangesData);
      setLevels(levelsData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD handlers ---
  const handleCreateRange = async (data: Omit<Range, "id" | "createdAt" | "updatedAt">) => {
    await RewardsApiService.createRange(data);
    await loadData();
    setShowForm(false);
  };

  const handleUpdateRange = async (data: Omit<Range, "id" | "createdAt" | "updatedAt">) => {
    if (!editingRange) return;
    await RewardsApiService.updateRange(editingRange.id, data);
    await loadData();
    setEditingRange(null);
    setShowForm(false);
  };

  const handleDeleteRange = async (id: number) => {
    await RewardsApiService.deleteRange(id);
    await loadData();
  };

  const handleCreateLevel = async (
    data: Omit<Level, "id" | "createdAt" | "updatedAt" | "range" | "totalClaimed" | "totalUsers">
  ) => {
    await RewardsApiService.createLevel(data);
    await loadData();
    setShowForm(false);
  };

  const handleUpdateLevel = async (
    data: Omit<Level, "id" | "createdAt" | "updatedAt" | "range" | "totalClaimed" | "totalUsers">
  ) => {
    if (!editingLevel) return;
    await RewardsApiService.updateLevel(editingLevel.id, data);
    await loadData();
    setEditingLevel(null);
    setShowForm(false);
  };

  const handleDeleteLevel = async (id: number) => {
    await RewardsApiService.deleteLevel(id);
    await loadData();
  };

  // --- Form editing ---
  const handleEditRange = (range: Range) => {
    setFormType("range");
    setEditingRange(range);
    setShowForm(true);
  };

  const handleEditLevel = (level: Level) => {
    setFormType("level");
    setEditingLevel(level);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRange(null);
    setEditingLevel(null);
  };

  const handleSubmit = (data: any) => {
    if (formType === "range") {
      editingRange ? handleUpdateRange(data) : handleCreateRange(data);
    } else {
      editingLevel ? handleUpdateLevel(data) : handleCreateLevel(data);
    }
  };

  // --- Filtering + Pagination ---
  const allRewardTiers = useMemo(
    () => convertLevelsToRewardTiers(orderedLevels, ranges),
    [orderedLevels, ranges]
  );

  const filteredTiers = useMemo(() => {
    return allRewardTiers.filter((reward) => {
      const matchesSearch =
        reward.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reward.id.includes(searchTerm);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && reward.isActive) ||
        (statusFilter === "inactive" && !reward.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [allRewardTiers, searchTerm, statusFilter]);

  const pagedTiers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTiers.slice(start, start + itemsPerPage);
  }, [filteredTiers, currentPage]);

  const totalPages = Math.ceil(filteredTiers.length / itemsPerPage) || 1;

  // While auth is loading, render skeleton to avoid flash (no UI changes)
  if (authLoading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader
            title="Rewards Management"
            subtitle="Configure ranges and levels for the rewards system"
          />

          <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <StatsGridSkeleton columns={4} />
          </main>
        </div>
      </div>
    );
  }

  // If not authenticated (authLoading false) we've already redirected; avoid UI flash.
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          title="Rewards Management"
          subtitle="Configure ranges and levels for the rewards system"
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Stats */}
          <RewardStats rewards={allRewardTiers} />

          {/* Ranges Table */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-light">Ranges</h2>
              <button
                onClick={() => {
                  setFormType("range");
                  setShowForm(true);
                }}
                className="bg-neon-pink/20 text-neon-pink border border-neon-pink/30 
                           hover:bg-neon-pink/40 hover:border-neon-pink/50 
                           px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                + Add Range
              </button>
            </div>
            <RangeTable
              ranges={ranges}
              onEdit={handleEditRange}
              onDelete={handleDeleteRange}
              onToggleStatus={(id) => {
                const range = ranges.find((r) => r.id === id);
                if (range) {
                  // preserve existing shape for update handler
                  handleUpdateRange({ ...range, isActive: !range.isActive } as any);
                }
              }}
              currentPage={1}
              totalPages={1}
              onPageChange={() => {}}
            />
          </div>

          {/* Levels Table */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-light">Levels</h2>
              <button
                onClick={() => {
                  setFormType("level");
                  setShowForm(true);
                }}
                className="bg-neon-pink/20 text-neon-pink border border-neon-pink/30 
                           hover:bg-neon-pink/40 hover:border-neon-pink/50 
                           px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                + Add Level
              </button>
            </div>
            <RewardTable
              rewards={pagedTiers}
              onEdit={(reward) => {
                const level = levels.find((l) => l.id.toString() === reward.id);
                if (level) handleEditLevel(level);
              }}
              onDelete={(id) => handleDeleteLevel(parseInt(id))}
              onToggleStatus={(id) => {
                const level = levels.find((l) => l.id.toString() === id);
                if (level) {
                  // preserve existing shape for update handler
                  handleUpdateLevel({ ...level, isActive: !level.isActive } as any);
                }
              }}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Form Modal */}
          <RewardForm
            isOpen={showForm}
            formType={formType}
            range={editingRange}
            level={editingLevel}
            ranges={ranges}
            onSubmit={handleSubmit}
            onClose={handleCloseForm}
          />
        </main>
      </div>
    </div>
  );
}
