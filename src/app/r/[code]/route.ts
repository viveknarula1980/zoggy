// src/app/r/[code]/route.ts
import { NextResponse } from "next/server";

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, "");
}

// Use a fully untyped handler so Next.js can't reject the signature.
export async function GET(...args: any[]) {
  const _req = args[0] as Request;
  const ctx = args[1] as any;

  const code: string = ctx?.params?.code || "";

  const apiBase = stripTrailingSlash(
    (process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_API_URL ||
      "") as string
  );
  const siteBase = stripTrailingSlash(
    (process.env.NEXT_PUBLIC_SITE_URL || "https://zoggy.io") as string
  );

  if (!apiBase || !code) {
    return NextResponse.redirect(siteBase || "/", { status: 302 });
  }

  // Call backend /r/:code (tracking happens here, but user never sees api host)
  const res = await fetch(`${apiBase}/r/${encodeURIComponent(code)}`, {
    redirect: "manual",
  });

  // Destination from backend
  let dest = res.headers.get("location") || siteBase;

  // Never show API host; rewrite to site domain if needed
  try {
    const d = new URL(dest, siteBase);
    const apiHost = new URL(apiBase).host;
    const siteHost = new URL(siteBase).host;
    if (d.host === apiHost) d.host = siteHost;
    // Optional: strip ?ref= entirely
    // d.searchParams.delete("ref");
    dest = d.toString();
  } catch {
    dest = siteBase;
  }

  const response = NextResponse.redirect(dest, {
    status: res.status === 301 ? 301 : 302,
  });

  // Forward Set-Cookie(s) if any
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", setCookie);

  return response;
}
