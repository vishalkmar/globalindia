import { purgeExpired } from "@/lib/admin/trash";
import { safeEqual } from "@/lib/auth/crypto";
import { optionalEnv } from "@/lib/env";
import { HttpError, json, route } from "@/lib/http";

/**
 * GET /api/cron/purge — daily purge of items deleted more than 30 days ago (Phase 16 todo 07).
 * Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Without a configured secret the route is off.
 */
export const GET = route(async (req) => {
  const secret = optionalEnv("CRON_SECRET");
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || secret.length < 32 || !safeEqual(given, secret)) throw new HttpError(404);
  return json({ ok: true, purged: await purgeExpired() });
});
