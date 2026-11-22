import "server-only";

import { COOKIE, PRE_CSRF_COOKIE } from "@/lib/auth/cookies";
import { hmac, randomToken, safeEqual } from "@/lib/auth/crypto";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { authEnv, isProduction, isTest } from "@/lib/env";
import { cookieValue, HttpError } from "@/lib/http";

/**
 * CSRF tokens for the admin and auth APIs (Phase 18 todos 03, 08, 11). Synchronizer-token pattern,
 * because scripts never read cookies here (Phase 9 rule):
 * - signed in: token = HMAC(session id). A new sign-in has a new session id, so the token rotates.
 * - before sign-in (login, OTP, reset): token = HMAC(random nonce kept in an httpOnly, SameSite=Strict
 *   cookie). The cookie is removed when the session starts (login CSRF cannot reuse it).
 * The browser gets its token from GET /api/auth/csrf and sends it as X-CSRF-Token on every
 * POST/PUT/PATCH/DELETE. This sits on top of SameSite=Strict cookies and the Origin check.
 */

export const CSRF_HEADER = "x-csrf-token";
export const PRE_COOKIE = PRE_CSRF_COOKIE;
const PRE_TTL = 2 * 60 * 60;
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// Refresh only rotates the caller's own cookies (nothing to forge); csrf hands out the token.
const EXEMPT = new Set(["/api/auth/refresh", "/api/auth/csrf"]);

const sign = (binding) => hmac(`csrf:${binding}`, authEnv.otpPepper);

export const preCookieOptions = (maxAge = PRE_TTL) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  path: "/",
  maxAge,
  priority: "high",
});

async function sessionId(req) {
  const access = cookieValue(req, COOKIE.access);
  const claims = access ? await verifyAccessToken(access) : null;
  return claims?.sid ?? null;
}

/** Token for this request's session (or pre-session nonce). Returns { token, newNonce? }. */
export async function issueToken(req) {
  const sid = await sessionId(req);
  if (sid) return { token: sign(`sid:${sid}`) };
  let nonce = cookieValue(req, PRE_COOKIE);
  let newNonce = null;
  if (!nonce || !/^[A-Za-z0-9_-]{40,}$/.test(nonce)) {
    nonce = randomToken();
    newNonce = nonce;
  }
  return { token: sign(`pre:${nonce}`), newNonce };
}

/** Does this request need a CSRF token? */
export function needsCsrf(req) {
  if (!UNSAFE.has(req.method)) return false;
  const { pathname } = new URL(req.url);
  if (EXEMPT.has(pathname)) return false;
  return pathname.startsWith("/api/admin/") || pathname.startsWith("/api/auth/");
}

/** Throws 403 (code "csrf") unless the header carries a token for this session or pre-session nonce. */
export async function verifyCsrf(req) {
  if (isTest && globalThis.__giSkipCsrf) return; // unit tests call handlers directly; csrf.test.js turns this off
  const given = req.headers.get(CSRF_HEADER) ?? "";
  if (given.length < 32 || given.length > 128) throw csrfError();
  const sid = await sessionId(req);
  if (sid && safeEqual(given, sign(`sid:${sid}`))) return;
  const nonce = cookieValue(req, PRE_COOKIE);
  if (nonce && safeEqual(given, sign(`pre:${nonce}`))) return;
  throw csrfError();
}

const csrfError = () =>
  new HttpError(403, "Your session form expired. Please try again.", { body: { code: "csrf" } });
