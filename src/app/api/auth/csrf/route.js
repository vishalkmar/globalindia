import { json, route } from "@/lib/http";
import { issueToken, PRE_COOKIE,preCookieOptions } from "@/lib/security/csrf";

/**
 * GET /api/auth/csrf — the CSRF token for this browser (Phase 18). Signed in: bound to the session.
 * Not yet signed in: bound to a random httpOnly nonce cookie set here. Never cached.
 */
export const GET = route(async (req) => {
  const { token, newNonce } = await issueToken(req);
  const res = json({ ok: true, token });
  if (newNonce) res.cookies.set(PRE_COOKIE, newNonce, preCookieOptions());
  return res;
});
