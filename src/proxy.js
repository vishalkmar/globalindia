import { NextResponse } from "next/server";

/**
 * Proxy (formerly middleware). UX only — NOT a security boundary (CVE-2025-29927 lesson).
 * Every admin page, route handler and server action re-checks auth on the server via lib/auth/guard.js.
 *
 * What it does:
 * 1. Strips the internal `x-middleware-subrequest` header from incoming requests.
 * 2. For /admin pages without an access cookie, redirects to /admin/login?next=<path>
 *    (the login page then tries a silent refresh before asking for the password).
 */

const PUBLIC_ADMIN = ["/admin/login", "/admin/verify", "/admin/forgot", "/admin/reset", "/admin/confirm-email"];
const ACCESS_COOKIES = ["__Host-gi_at", "gi_at"];

export function proxy(request) {
  const { pathname, search } = request.nextUrl;

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
  matcher: ["/admin/:path*", "/api/:path*"],
};
