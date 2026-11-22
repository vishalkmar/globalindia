import { db } from "@/lib/db";
import { errorResponse, json, route } from "@/lib/http";
import { clientIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * GET /api/health — uptime check (Phase 16 todo 12). Says only whether the site and its database
 * answer: no versions, hostnames, error messages or secrets. 503 when the database is down.
 */
export const GET = route(async (req) => {
  const limited = await rateLimit("search", clientIp(req.headers));
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });
  let database = "up";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    database = "down";
  }
  return json({ ok: database === "up", database }, { status: database === "up" ? 200 : 503 });
});
