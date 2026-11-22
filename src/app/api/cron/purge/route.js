import "server-only";

import { purgeExpired } from "@/lib/admin/trash";
import { safeEqual } from "@/lib/auth/crypto";
import { optionalEnv } from "@/lib/env";
import { HttpError, json, route } from "@/lib/http";
import { purgeOldRecords } from "@/lib/retention";

/**
 * GET /api/cron/purge — daily purge of items deleted more than 30 days ago (Phase 16 todo 07) and of
 * old security records (Phase 24 todo 16, src/lib/retention.js).
 * Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Without a configured secret the route is off.
 */
export const GET = route(async (req) => {
  const secret = optionalEnv("CRON_SECRET");
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || secret.length < 32 || !safeEqual(given, secret)) throw new HttpError(404);
  return json({ ok: true, purged: await purgeExpired(), retention: await purgeOldRecords() });
});
