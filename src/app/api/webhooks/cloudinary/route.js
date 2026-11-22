import "server-only";

import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { optionalEnv } from "@/lib/env";
import { errorResponse, json, route } from "@/lib/http";
import { logger } from "@/lib/logger";
import { clientIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";
import { firstDelivery, rawBody, verifyCloudinary } from "@/lib/security/webhooks";

/**
 * POST /api/webhooks/cloudinary — Cloudinary notifications (Phase 26). When a file is deleted in the
 * Cloudinary console, its media library entry moves to the trash so the site stops pointing at it.
 * Checks: X-Cld-Signature over the raw body + timestamp, 5-minute window, one delivery per signature.
 */
export const POST = route(async (req) => {
  const limited = await rateLimit("webhook", clientIp(req.headers));
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });
  const body = await rawBody(req);
  if (body === null) return errorResponse(413);

  const check = verifyCloudinary(body, req.headers, optionalEnv("CLOUDINARY_API_SECRET"));
  if (!check.ok) {
    logger.warn("webhook.rejected", { provider: "cloudinary", reason: check.reason });
    return errorResponse(401, "Not accepted.");
  }
  if (!(await firstDelivery("cloudinary", check.eventId))) return json({ ok: true, duplicate: true });

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return errorResponse(400);
  }
  if (event?.notification_type === "delete" && Array.isArray(event.resources)) {
    const ids = event.resources
      .map((r) => r?.public_id)
      .filter((id) => typeof id === "string" && /^gi_[a-f0-9]{32}$/.test(id))
      .slice(0, 100);
    if (ids.length) {
      const res = await db.mediaAsset.updateMany({
        where: { publicId: { in: ids }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (res.count) await audit({ action: "media.deleted_in_cloudinary", entity: "MediaAsset", diff: { count: res.count } });
    }
  }
  return json({ ok: true });
});
