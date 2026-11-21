import { cookies } from "next/headers";

import { clearSessionCookies, COOKIE, setSessionCookies } from "@/lib/auth/cookies";
import { notifyRefreshReuse } from "@/lib/auth/notify";
import { RefreshError, rotateSession } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse, json, route } from "@/lib/http";
import { clientIp, hashIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * POST /api/auth/refresh
 * Rotates the refresh token on every call (new access + new refresh cookie).
 * A reused refresh token revokes the whole login family and alerts the account owner.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req.headers);
  const limited = await rateLimit("refreshIp", ip);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });

  const store = await cookies();
  const token = store.get(COOKIE.refresh)?.value;
  if (!token) return clearSessionCookies(errorResponse(401));

  try {
    const { accessToken, refreshToken } = await rotateSession(token, {
      userAgent: req.headers.get("user-agent") ?? "",
      ipHash: hashIp(ip),
    });
    return setSessionCookies(json({ ok: true }), { accessToken, refreshToken });
  } catch (err) {
    if (err instanceof RefreshError) {
      if (err.reason === "reused" && err.userId) await notifyRefreshReuse(err.userId, req.headers);
      return clearSessionCookies(errorResponse(401));
    }
    throw err;
  }
});
