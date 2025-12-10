import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/:path*'],
};

type MaintCfg = {
  isEnabled: boolean;
  message?: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  redirectUrl?: string;
  allowAdminAccess?: boolean;
};

function isAssetPath(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/uploads')
  );
}

function withinWindow(cfg: MaintCfg) {
  const now = Date.now();
  const startOk = cfg.scheduledStart ? Date.parse(cfg.scheduledStart) <= now : true;
  const endOk = cfg.scheduledEnd ? now <= Date.parse(cfg.scheduledEnd) : true;
  return startOk && endOk;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/maintenance')) return NextResponse.next();
  if (isAssetPath(pathname)) return NextResponse.next();
  if (pathname.startsWith('/api/health') || pathname.startsWith('/api/maintenance')) {
    return NextResponse.next();
  }

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''; // ✅ FULL PATH FIXED

  const adminKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY || '';

  let cfg: MaintCfg | null = null;

  try {
    const res = await fetch(`${apiBase}/admin/maintenance`, {
      headers: adminKey ? { Authorization: `Bearer ${adminKey}` } : {},
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const raw = await res.json();
      cfg = {
        isEnabled: !!raw.isEnabled,
        message: raw.message ?? 'Site is undergoing scheduled maintenance. We\'ll be back shortly.',
        scheduledStart: raw.scheduledStart ?? null,
        scheduledEnd: raw.scheduledEnd ?? null,
        redirectUrl: raw.redirectUrl || '/maintenance',
        allowAdminAccess: !!raw.allowAdminAccess,
      };
    }
  } catch (e) {
    console.warn("Maintenance fetch failed:", e);
    cfg = null;
  }

  if (!cfg || !cfg.isEnabled || !withinWindow(cfg)) return NextResponse.next();
  if (cfg.allowAdminAccess && pathname.startsWith('/admin')) return NextResponse.next();

  const redirectUrl = new URL(cfg.redirectUrl || '/maintenance', req.url);
  return NextResponse.redirect(redirectUrl);
}
