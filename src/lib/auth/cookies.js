import "server-only";

import { ACCESS_TOKEN_TTL_SECONDS } from "./jwt";

/**
 * Auth cookie names and options (Phase 4 todo 07, Security.md §4).
 * - All cookies: HttpOnly, SameSite=Strict, Secure in production.
 * - Access cookie uses the __Host- prefix (Secure, Path=/, no Domain) in production.
 * - Refresh cookie is scoped to Path=/api/auth so it is only ever sent to the auth endpoints,
 *   which rules out __Host- (needs Path=/) — it uses __Secure- instead.
 * - Tokens are never readable by JavaScript and never stored in localStorage/sessionStorage.
 */

const secure = process.env.NODE_ENV === "production";

export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const MFA_PENDING_TTL_SECONDS = 5 * 60;

/** Pre-sign-in CSRF nonce cookie (see lib/security/csrf.js). */
export const PRE_CSRF_COOKIE = process.env.NODE_ENV === "production" ? "__Host-gi_pre" : "gi_pre";

export const COOKIE = {
  access: secure ? "__Host-gi_at" : "gi_at",
  refresh: secure ? "__Secure-gi_rt" : "gi_rt",
  mfaPending: secure ? "__Host-gi_mfa" : "gi_mfa",
};

const REFRESH_PATH = "/api/auth";

function base(maxAge, path = "/") {
  return { httpOnly: true, secure, sameSite: "strict", path, maxAge, priority: "high" };
}

/** @param {import('next/server').NextResponse} res */
export function setSessionCookies(res, { accessToken, refreshToken }) {
  res.cookies.set(COOKIE.access, accessToken, base(ACCESS_TOKEN_TTL_SECONDS));
  res.cookies.set(COOKIE.refresh, refreshToken, base(REFRESH_TOKEN_TTL_SECONDS, REFRESH_PATH));
  res.cookies.set(COOKIE.mfaPending, "", base(0));
  // The pre-sign-in CSRF nonce ends with the session start: tokens rotate on login (Phase 18 todo 11).
  res.cookies.set(PRE_CSRF_COOKIE, "", { ...base(0), sameSite: "strict" });
  return res;
}

export function clearSessionCookies(res) {
  res.cookies.set(COOKIE.access, "", base(0));
  res.cookies.set(COOKIE.refresh, "", base(0, REFRESH_PATH));
  res.cookies.set(COOKIE.mfaPending, "", base(0));
  return res;
}

export function setMfaPendingCookie(res, ticket) {
  res.cookies.set(COOKIE.mfaPending, ticket, base(MFA_PENDING_TTL_SECONDS));
  return res;
}

export function clearMfaPendingCookie(res) {
  res.cookies.set(COOKIE.mfaPending, "", base(0));
  return res;
}
