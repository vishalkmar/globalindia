import "server-only";

import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isProduction, optionalEnv } from "@/lib/env";
import { errorResponse, json, route } from "@/lib/http";
import { logger } from "@/lib/logger";
import { clientIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";
import { BREVO_DEFAULT_RANGES, firstDelivery, rawBody, verifyBrevo } from "@/lib/security/webhooks";

/**
 * POST /api/webhooks/brevo — Brevo marketing events (Phase 26). An unsubscribe, hard bounce or spam
 * complaint stops newsletter mail to that address. Checks: bearer secret, Brevo IP ranges, event age,
 * one delivery per event. Anything that fails gets the same 401 with no detail.
 */
const STOP_EVENTS = new Set(["unsubscribed", "hard_bounce", "spam", "blocked", "invalid_email"]);

export const POST = route(async (req) => {
  const ip = clientIp(req.headers);
  const limited = await rateLimit("webhook", ip);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });
  const body = await rawBody(req);
  if (body === null) return errorResponse(413);

  const ranges = (optionalEnv("BREVO_WEBHOOK_IPS") ?? "").split(",").map((r) => r.trim()).filter(Boolean);
  const check = verifyBrevo(body, req.headers, {
    secret: optionalEnv("BREVO_WEBHOOK_SECRET"),
    ip,
    ranges: ranges.length ? ranges : BREVO_DEFAULT_RANGES,
    checkIp: isProduction,
  });
  if (!check.ok) {
    logger.warn("webhook.rejected", { provider: "brevo", reason: check.reason });
    return errorResponse(401, "Not accepted.");
  }
  if (!(await firstDelivery("brevo", check.eventId))) return json({ ok: true, duplicate: true });

  const { event: type, email } = check.event;
  if (STOP_EVENTS.has(type) && typeof email === "string") {
    const res = await db.newsletterSubscriber.updateMany({
      where: { email: email.trim().toLowerCase(), status: { not: "UNSUBSCRIBED" } },
      data: { status: "UNSUBSCRIBED", confirmTokenHash: null, tokenExpiresAt: null },
    });
    if (res.count) await audit({ action: "newsletter.stopped_by_provider", entity: "NewsletterSubscriber", diff: { event: type } });
  }
  return json({ ok: true });
});
