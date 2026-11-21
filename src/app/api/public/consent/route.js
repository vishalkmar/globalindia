import { z } from "zod";

import { CONSENT_COOKIE, CONSENT_MAX_AGE } from "@/lib/consent";
import { assertSameOrigin, errorResponse, json, readJson, route } from "@/lib/http";
import { clientIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * POST /api/public/consent { analytics: boolean } — stores the cookie choice for 180 days.
 * Same-origin only; the cookie holds just "granted" or "denied".
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const limited = await rateLimit("consent", clientIp(req.headers));
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });
  const { analytics } = await readJson(req, z.strictObject({ analytics: z.boolean() }));
  const res = json({ ok: true });
  res.cookies.set(CONSENT_COOKIE, analytics ? "v1.granted" : "v1.denied", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CONSENT_MAX_AGE,
  });
  return res;
});
