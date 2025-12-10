// /app/api/maintenance/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    'http://localhost:4000'; // your Node server base
  const adminKey = process.env.ADMIN_API_KEY || '';

  try {
    const r = await fetch(`${apiBase}/admin/maintenance`, {
      headers: adminKey ? { Authorization: `Bearer ${adminKey}` } : {},
      cache: 'no-store',
    });

    if (!r.ok) {
      // If backend is unreachable or unauthorized, fail closed (not active)
      return NextResponse.json(
        { isEnabled: false },
        { status: 200 }
      );
    }

    const cfg = await r.json();
    // Return only what the frontend needs
    return NextResponse.json(
      {
        isEnabled: !!cfg.isEnabled,
        message: cfg.message ?? "Site is undergoing scheduled maintenance. We'll be back shortly.",
        scheduledStart: cfg.scheduledStart ?? null,
        scheduledEnd: cfg.scheduledEnd ?? null,
        redirectUrl: cfg.redirectUrl || '/maintenance',
        allowAdminAccess: !!cfg.allowAdminAccess,
      },
      { status: 200 }
    );
  } catch (e) {
    // On error, default to not enabled so site isn't locked by accident
    return NextResponse.json(
      { isEnabled: false },
      { status: 200 }
    );
  }
}
