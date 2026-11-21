import { COOKIE, setMfaPendingCookie } from "@/lib/auth/cookies";
import { hmac } from "@/lib/auth/crypto";
import { availableMethods, checkPassword, GENERIC_LOGIN_ERROR } from "@/lib/auth/login";
import { signMfaTicket } from "@/lib/auth/mfaPending";
import { authEnv } from "@/lib/env";
import { assertSameOrigin, errorResponse, json, readJson, route } from "@/lib/http";
import { clientIp, hashIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";
import { loginSchema } from "@/lib/validation/auth";

/**
 * POST /api/auth/login  { email, password }
 * Step 1 of 2. On success: sets a 5-minute httpOnly MFA ticket cookie and returns which second
 * factors are available. No session is created until the second factor is verified.
 * Responses never reveal whether the email exists.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req.headers);
  const ipHash = hashIp(ip);

  const byIp = await rateLimit("loginIp", ip);
  if (!byIp.success) return errorResponse(429, undefined, { retryAfter: byIp.retryAfter });

  const { email, password } = await readJson(req, loginSchema);

  const byEmail = await rateLimit("loginEmail", hmac(email, authEnv.ipHashSalt));
  if (!byEmail.success) return errorResponse(429, undefined, { retryAfter: byEmail.retryAfter });

  const result = await checkPassword(email, password, { ipHash });
  if (!result.ok) return errorResponse(401, GENERIC_LOGIN_ERROR);

  const ticket = await signMfaTicket({ userId: result.user.id, tv: result.user.tokenVersion });
  const methods = await availableMethods(result.user);
  const res = json({ ok: true, next: "mfa", methods });
  setMfaPendingCookie(res, ticket);
  // Any old access cookie from a previous user on this browser is dropped.
  res.cookies.set(COOKIE.access, "", { path: "/", maxAge: 0 });
  return res;
});
