import { NextResponse } from "next/server";

import { countRedirectHit, lookupRedirect } from "@/lib/redirectMap";
import { isBlockedIp } from "@/lib/security/abuse";
import { clientIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * Proxy (formerly middleware). UX only — NOT a security boundary (CVE-2025-29927 lesson).
 * Every admin page, route handler and server action re-checks auth on the server via lib/auth/guard.js.
 *
 * What it does:
 * 1. Strips the internal `x-middleware-subrequest` header from incoming requests.
 * 2. For /admin pages without an access cookie, redirects to /admin/login?next=<path>
 *    (the login page then tries a silent refresh before asking for the password).
 */

const PUBLIC_ADMIN = [
  "/admin/login",
  "/admin/verify",
  "/admin/forgot",
  "/admin/reset",
  "/admin/confirm-email",
];
const ACCESS_COOKIES = ["__Host-gi_at", "gi_at"];

// Paths that must never be served, even by mistake (Phase 24 todo 07): env files, git metadata,
// source maps. Answered with a bare 404 before anything else runs.
const FORBIDDEN_PATH = /(^|\/)\.(env|git)(\/|$|[.\w-]*$)|\.map$/i;

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;
  if (FORBIDDEN_PATH.test(pathname)) return new NextResponse(null, { status: 404 });
  const ip = clientIp(request.headers);

  // Blocked addresses (Settings -> Rate limits and blocked IPs, Phase 22 todo 13): a plain refusal.
  if (await isBlockedIp(ip)) {
    return new NextResponse("Access from your network has been blocked.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  // Global API limit per IP (todo 09), on top of the per-route limits.
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/health")) {
    const limited = await rateLimit("apiIp", ip);
    if (!limited.success) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please wait a moment and try again." },
        { status: 429, headers: { "retry-after": String(limited.retryAfter), "cache-control": "no-store" } },
      );
    }
  }

  // CORS (Phase 20 todo 10): the APIs are same-origin only. A preflight from another origin gets a
  // plain 403 with no Access-Control-* headers, so the browser never sends the real request.
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  }

  // Site-wide redirects (Phase 16 todo 03): public page requests only.
  const isPage =
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    (request.method === "GET" || request.method === "HEAD");
  if (isPage) {
    const hit = await lookupRedirect(pathname);
    if (hit) {
      countRedirectHit(pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname);
      const target = hit.to.startsWith("/") ? new URL(hit.to + search, request.url) : hit.to;
      return NextResponse.redirect(target, hit.status);
    }
  }

  const headers = new Headers(request.headers);
  headers.delete("x-middleware-subrequest");

  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPublic = PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAdminPage && !isPublic) {
    const hasAccess = ACCESS_COOKIES.some((name) => request.cookies.has(name));
    if (!hasAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Admin and API for the checks above; every other page path for redirects. Static files are skipped.
  matcher: [
    "/admin/:path*",
    "/api/:path*",
    "/((?!_next/|favicon|.*\\.[a-zA-Z0-9]{2,5}$).*)",
    // Always checked although they look like files: env files, git metadata, source maps.
    "/((?:.*/)?\\.(?:env|git).*)",
    "/(.*\\.map)",
  ],
};
