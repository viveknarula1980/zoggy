// lib/adminApi.ts
export function getAdminToken(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const t = localStorage.getItem('ADMIN_API_KEY');
      if (t && t.length > 0) return t;
    } catch (e) {
      // ignore localStorage failures (private mode etc)
    }
  }
  return null;
}

export async function adminFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL || ''; // e.g.  or https://api.example.com
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const token = getAdminToken();
  const headers = new Headers(opts.headers || {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, { ...opts, headers });
  const text = await res.text().catch(() => '');
  let body: any = text;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // leave body as text
    }
  }

  if (!res.ok) {
    const err: any = new Error(`Request failed: ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body as T;
}
