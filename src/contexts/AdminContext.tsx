'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type AdminContextShape = {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  adminFetch: <T = any>(path: string, opts?: RequestInit) => Promise<T>;
};

const AdminContext = createContext<AdminContextShape | undefined>(undefined);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('ADMIN_API_KEY');
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = Boolean(token);

  useEffect(() => {
    // Keep localStorage in sync
    try {
      if (typeof window !== 'undefined') {
        if (token) localStorage.setItem('ADMIN_API_KEY', token);
        else localStorage.removeItem('ADMIN_API_KEY');
      }
    } catch {}
  }, [token]);

  async function login(username: string, password: string) {
    setIsLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setIsLoading(false);
        return false;
      }

      const body = await res.json().catch(() => ({}));
      const t = body?.token;
      if (t && typeof t === 'string') {
        setToken(t);
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (e) {
      setIsLoading(false);
      return false;
    }
  }

  function logout() {
    setToken(null);
    try {
      if (typeof window !== 'undefined') localStorage.removeItem('ADMIN_API_KEY');
    } catch {}
    try { router.push('/admin/login'); } catch {}
  }

  async function adminFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const url = path.startsWith('http') ? path : `${base.replace(/\/$/, '')}${path}`;
    const headers = new Headers(opts.headers || {});
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(url, { ...opts, headers });
    const text = await res.text().catch(() => '');
    let body: any = text;
    try { body = text ? JSON.parse(text) : text; } catch {}

    if (!res.ok) {
      const err: any = new Error(`Request failed: ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body as T;
  }

  const value: AdminContextShape = {
    isAuthenticated,
    isLoading,
    token,
    login,
    logout,
    adminFetch,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};
