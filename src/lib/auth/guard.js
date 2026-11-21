import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";

import { COOKIE } from "./cookies";
import { verifyAccessToken } from "./jwt";
import { isSessionActive } from "./session";

/**
 * Server-side authorization (Phase 4 todo 12). Every protected route handler, server action and admin
 * page calls one of these. The proxy (src/proxy.js) only redirects for UX and is never trusted.
 *
 * Checks, in order: JWT signature + alg + iss + aud + exp -> user exists and ACTIVE ->
 * tokenVersion matches (password reset / logout-all / role change kill old tokens) ->
 * session not revoked -> role is high enough.
 */

const RANK = { VIEWER: 1, EDITOR: 2, SUPER_ADMIN: 3 };

export function roleAtLeast(role, minimum) {
  return (RANK[role] ?? 0) >= (RANK[minimum] ?? 99);
}

const SAFE_USER = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  tokenVersion: true,
  mustChangePassword: true,
  totpEnabled: true,
  emailOtpEnabled: true,
  mfaSetupAt: true,
};

/** Resolve the signed-in admin from the access cookie, or null. Never throws. */
export async function getAdmin() {
  const store = await cookies();
  const token = store.get(COOKIE.access)?.value;
  if (!token) return null;
  const claims = await verifyAccessToken(token);
  if (!claims) return null;
  const user = await db.adminUser.findUnique({ where: { id: claims.sub }, select: SAFE_USER });
  if (!user || user.status !== "ACTIVE") return null;
  if (user.tokenVersion !== claims.tv) return null;
  if (!(await isSessionActive(claims.sid))) return null;
  // Role comes from the database, not from the token, so a demotion takes effect immediately.
  return { ...user, sessionId: claims.sid, mfaConfigured: user.totpEnabled || user.emailOtpEnabled };
}

/** Whether the account still has to finish first-login setup (new password + authenticator + recovery codes). */
export function setupPending(user) {
  return user.mustChangePassword || !user.mfaSetupAt;
}

/**
 * For Route Handlers / Server Actions. Throws HttpError(401|403).
 * @param {{ role?: 'VIEWER'|'EDITOR'|'SUPER_ADMIN', allowSetup?: boolean }} [opts]
 */
export async function requireAdmin({ role = "VIEWER", allowSetup = false } = {}) {
  const user = await getAdmin();
  if (!user) throw new HttpError(401, "Please sign in again.");
  if (!allowSetup && setupPending(user)) throw new HttpError(403, "Finish account setup first.", { body: { next: "setup" } });
  if (!roleAtLeast(user.role, role)) throw new HttpError(403, "You do not have permission to do that.");
  return user;
}

/**
 * For admin pages (Server Components). Redirects instead of throwing.
 * @param {{ role?: string, allowSetup?: boolean, next?: string }} [opts]
 */
export async function requireAdminPage({ role = "VIEWER", allowSetup = false, next = "/admin" } = {}) {
  const user = await getAdmin();
  if (!user) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  if (!allowSetup && setupPending(user)) redirect("/admin/setup");
  if (!roleAtLeast(user.role, role)) redirect("/admin/forbidden");
  return user;
}
