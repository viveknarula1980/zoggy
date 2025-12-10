"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import PromoStats, { PromoStatsData } from "@/components/admin/promo/PromoStats";
import PromoFilters, { PromoFilters as FiltersType } from "@/components/admin/promo/PromoFilters";
import PromoTable, { PromoData } from "@/components/admin/promo/PromoTable";
import PromoPagination from "@/components/admin/promo/PromoPagination";
import PromoForm from "@/components/admin/promo/PromoForm";
import PromoDetailsModal from "@/components/admin/promo/PromoDetailsModal";
import { Plus } from "lucide-react";
import { StatsGridSkeleton, FiltersSkeleton, TableSkeleton } from "@/components/admin/common/SkeletonLoader";
import { useAdmin } from "@/contexts/AdminContext";

/**
 * Direct API integration (all requests go to /promo/admin/*)
 * Adjust NEXT_PUBLIC_API_URL in your environment if backend lives on different host.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""; // e.g. "" or "https://api.example.com"
const PREFIX = `${API_BASE}/promo/admin`;

// ------- Helpers -------
function buildHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("adminToken"); // optional admin token
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore localStorage errors
  }
  return headers;
}

async function handleRes(res: Response) {
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    // not JSON
  }
  if (!res.ok) {
    const message = (json && (json.error || json.message)) || res.statusText || "Request failed";
    throw new Error(message);
  }
  return json;
}

// ------- API functions -------
async function listPromos(opts?: {
  page?: number;
  perPage?: number;
  search?: string;
  type?: string;
  status?: string;
  trigger?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.perPage) params.set("perPage", String(opts.perPage));
  if (opts?.search) params.set("search", opts.search);
  if (opts?.type) params.set("type", opts.type);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.trigger) params.set("trigger", opts.trigger);

  const res = await fetch(`${PREFIX}/list?${params.toString()}`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleRes(res);
}

async function getPromo(id: string) {
  const res = await fetch(`${PREFIX}/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleRes(res);
}

async function createPromo(payload: Partial<PromoData>) {
  const res = await fetch(`${PREFIX}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

async function updatePromo(id: string, payload: Partial<PromoData>) {
  const res = await fetch(`${PREFIX}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

async function deletePromo(id: string) {
  const res = await fetch(`${PREFIX}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  return handleRes(res);
}

async function duplicatePromo(id: string) {
  const res = await fetch(`${PREFIX}/${encodeURIComponent(id)}/duplicate`, {
    method: "POST",
    headers: buildHeaders(),
  });
  return handleRes(res);
}

async function togglePromo(id: string) {
  const res = await fetch(`${PREFIX}/${encodeURIComponent(id)}/toggle`, {
    method: "POST",
    headers: buildHeaders(),
  });
  return handleRes(res);
}

async function statsApi() {
  const res = await fetch(`${PREFIX}/stats`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleRes(res);
}

function exportCsvUrl(opts?: { search?: string; type?: string; status?: string; trigger?: string }) {
  const params = new URLSearchParams();
  if (opts?.search) params.set("search", opts.search);
  if (opts?.type) params.set("type", opts.type);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.trigger) params.set("trigger", opts.trigger);
  return `${PREFIX}/export.csv?${params.toString()}`;
}

// ------- Component -------
export default function AdminPromos() {
  const [promos, setPromos] = useState<PromoData[]>([]);
  const [stats, setStats] = useState<PromoStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPromo, setSelectedPromo] = useState<PromoData | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoData | null>(null);

  const [filters, setFilters] = useState<FiltersType>({
    type: "all",
    status: "all",
    trigger: "all",
    search: "",
  });

  const itemsPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fetchingList, setFetchingList] = useState(false);

  // auth
  const { isAuthenticated, isLoading: authLoading } = useAdmin();
  const router = useRouter();

  // Redirect unauthenticated admins to login (after auth check)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      try {
        router.replace("/admin/login");
      } catch {}
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const s = await statsApi();
      setStats(s);
    } catch (err: any) {
      console.error("Failed to fetch stats", err);
      // keep UX non-blocking; show toast/alert as before
      alert("Failed to fetch promo stats: " + (err?.message || err));
    }
  }, []);

  // Fetch paginated list
  const fetchList = useCallback(
    async (page = 1) => {
      setFetchingList(true);
      try {
        const res = await listPromos({
          page,
          perPage: itemsPerPage,
          search: filters.search || undefined,
          type: filters.type !== "all" ? filters.type : undefined,
          status: filters.status !== "all" ? filters.status : undefined,
          trigger: filters.trigger !== "all" ? filters.trigger : undefined,
        });

        setPromos(res.promos || []);
        setCurrentPage(res.meta?.page || page);
        setTotalPages(res.meta?.totalPages || 1);
        setTotalItems(res.meta?.totalItems || (res.promos ? res.promos.length : 0));
      } catch (err: any) {
        console.error("fetchList error", err);
        alert("Failed to fetch promotions: " + (err?.message || err));
      } finally {
        setFetchingList(false);
        setLoading(false);
      }
    },
    [filters.search, filters.type, filters.status, filters.trigger]
  );

  // Initial load — only run after auth confirmed
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    (async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchList(1)]);
      setLoading(false);
    })();
    // fetchStats and fetchList have stable identities via useCallback
  }, [authLoading, isAuthenticated, fetchStats, fetchList]);

  // When filters change -> fetch first page (only when authenticated)
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    setCurrentPage(1);
    fetchList(1);
  }, [filters, authLoading, isAuthenticated, fetchList]);

  // Filter handlers
  const handleFilterChange = (key: keyof FiltersType, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  // Actions
  const handlePromoClick = (promo: PromoData) => {
    setSelectedPromo(promo);
    setShowDetailsModal(true);
  };

  const handleEditPromo = (promo: PromoData) => {
    setEditingPromo(promo);
    setShowForm(true);
    setShowDetailsModal(false);
  };

  const handleToggleStatus = async (promo: PromoData) => {
    try {
      const updated = await togglePromo(promo.id);
      setPromos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      fetchStats();
    } catch (err: any) {
      console.error("toggle error", err);
      alert("Failed to toggle promo status: " + (err?.message || err));
    }
  };

  const handleDeletePromo = async (promo: PromoData) => {
    if (!confirm(`Are you sure you want to delete "${promo.name}"?`)) return;
    try {
      await deletePromo(promo.id);
      fetchList(currentPage);
      fetchStats();
    } catch (err: any) {
      console.error("delete error", err);
      alert("Failed to delete promo: " + (err?.message || err));
    }
  };

  const handleDuplicatePromo = async (promo: PromoData) => {
    try {
      await duplicatePromo(promo.id);
      fetchList(1);
      fetchStats();
      alert("Promo duplicated");
    } catch (err: any) {
      console.error("duplicate error", err);
      alert("Failed to duplicate promo: " + (err?.message || err));
    }
  };

  const handleSavePromo = async (promoData: Partial<PromoData>) => {
    try {
      if (editingPromo) {
        await updatePromo(editingPromo.id, promoData);
        fetchList(currentPage);
        setShowForm(false);
        setEditingPromo(null);
      } else {
        await createPromo(promoData);
        fetchList(1);
        setShowForm(false);
      }
      fetchStats();
    } catch (err: any) {
      console.error("save error", err);
      alert("Failed to save promo: " + (err?.message || err));
    }
  };

  const handleExport = () => {
    const url = exportCsvUrl({
      search: filters.search || undefined,
      type: filters.type !== "all" ? filters.type : undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      trigger: filters.trigger !== "all" ? filters.trigger : undefined,
    });
    window.open(url, "_blank");
  };

  const onPageChange = (page: number) => {
    setCurrentPage(page);
    fetchList(page);
  };

  const currentPromos = promos;

  // While auth is loading, render skeleton to avoid flash
  if (authLoading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader
            title="Promotion Management"
            subtitle="Create and manage promotional campaigns"
            action={
              <button
                onClick={() => {
                  setEditingPromo(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-lg hover:bg-neon-pink/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Promotion
              </button>
            }
          />

          <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <StatsGridSkeleton columns={4} />
            <FiltersSkeleton />
            <TableSkeleton columns={7} rows={10} />
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
          title="Promotion Management"
          subtitle="Create and manage promotional campaigns"
          action={
            <button
              onClick={() => {
                setEditingPromo(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-lg hover:bg-neon-pink/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Promotion
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading && <StatsGridSkeleton columns={4} />}
          {!loading && stats && <PromoStats stats={stats} />}

          {!loading ? (
            <PromoFilters filters={filters} onFilterChange={handleFilterChange} onSearchChange={handleSearchChange} onExport={handleExport} />
          ) : (
            <FiltersSkeleton />
          )}

          {(loading || fetchingList) && <TableSkeleton columns={7} rows={10} />}

          {!loading && !fetchingList && (
            <>
              <PromoTable
                promos={currentPromos}
                onPromoClick={handlePromoClick}
                onEditPromo={handleEditPromo}
                onToggleStatus={handleToggleStatus}
                onDeletePromo={handleDeletePromo}
                onDuplicatePromo={handleDuplicatePromo}
              />

              {totalPages > 1 && (
                <PromoPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={onPageChange} />
              )}
            </>
          )}
        </main>
      </div>

      <PromoForm
        promo={editingPromo}
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingPromo(null);
        }}
        onSave={handleSavePromo}
      />

      {showDetailsModal && selectedPromo && (
        <PromoDetailsModal
          promo={selectedPromo}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPromo(null);
          }}
          onEdit={handleEditPromo}
        />
      )}
    </div>
  );
}
