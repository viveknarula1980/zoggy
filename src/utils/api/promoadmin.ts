// src/services/promoApi.ts
// Thin API client for promo admin endpoints.
// Adjust API_BASE if your backend is mounted under a different prefix.

export type PromoData = {
  id: string;
  name: string;
  code?: string;
  type?: string;
  status?: string;
  trigger?: string;
  rewardType?: string;
  rewardValue?: number | null;
  rewardUnit?: string;
  maxReward?: number | null;
  minDeposit?: number | null;
  wagering?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  usageCount?: number;
  usageLimit?: number | null;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PromoStatsData = {
  totalPromos: number;
  activePromos: number;
  totalRedeemed: number;
  totalValue: number;
  weeklyRedemptions: number;
  conversionRate: number;
};

const API_BASE = 
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "";
const PREFIX = `${API_BASE}/promo/admin`;

// helper to include auth token if present
function buildHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Example: use admin token stored in localStorage (optional)
  const token = (typeof window !== "undefined" && localStorage.getItem("adminToken")) || "";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleRes(res: Response) {
  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) throw json || { message: res.statusText || "Request failed" };
    return json;
  } catch (err) {
    // If not JSON
    if (!res.ok) throw { message: res.statusText || "Request failed", raw: text };
    return text;
  }
}

export async function listPromos(opts?: {
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

export async function getPromo(id: string) {
  const res = await fetch(`${PREFIX}/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleRes(res);
}

export async function createPromo(payload: Partial<PromoData>) {
  const res = await fetch(`${PREFIX}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

export async function updatePromo(id: string, payload: Partial<PromoData>) {
  const res = await fetch(`${PREFIX}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

export async function deletePromo(id: string) {
  const res = await fetch(`${PREFIX}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  return handleRes(res);
}

export async function duplicatePromo(id: string) {
  const res = await fetch(`${PREFIX}/${encodeURIComponent(id)}/duplicate`, {
    method: "POST",
    headers: buildHeaders(),
  });
  return handleRes(res);
}

export async function togglePromo(id: string) {
  const res = await fetch(`${PREFIX}/${encodeURIComponent(id)}/toggle`, {
    method: "POST",
    headers: buildHeaders(),
  });
  return handleRes(res);
}

export async function stats() {
  const res = await fetch(`${PREFIX}/stats`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleRes(res) as Promise<PromoStatsData>;
}

// For CSV export, open URL directly or download programmatically.
// This returns the raw fetch Response for the frontend to handle.
export function exportCsvUrl(opts?: { search?: string; type?: string; status?: string; trigger?: string }) {
  const params = new URLSearchParams();
  if (opts?.search) params.set("search", opts.search);
  if (opts?.type) params.set("type", opts.type);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.trigger) params.set("trigger", opts.trigger);
  return `${PREFIX}/export.csv?${params.toString()}`;
}
