import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import { ipInRanges } from "./ipMatch";

/**
 * Incoming webhooks (Phase 26). Every check runs on the RAW body before it is parsed:
 * signature or secret (constant-time), event age (5 minutes), and each event id is processed once.
 */

export const WEBHOOK_MAX_AGE_SECONDS = 5 * 60;
export const WEBHOOK_MAX_BYTES = 64 * 1024;

// Brevo sends webhooks from these ranges (help.brevo.com, "Brevo IP ranges"). Override with
// BREVO_WEBHOOK_IPS (comma-separated) if Brevo publishes new ones.
export const BREVO_DEFAULT_RANGES = ["1.179.112.0/20", "172.246.240.0/20"];

function equal(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

const fresh = (seconds, now) => Number.isFinite(seconds) && Math.abs(now / 1000 - seconds) <= WEBHOOK_MAX_AGE_SECONDS;

/**
 * Cloudinary: X-Cld-Signature = hex(SHA-1 or SHA-256 of rawBody + X-Cld-Timestamp + API secret),
 * depending on the account's signature setting; both are accepted.
 * @returns {{ ok: true, eventId: string } | { ok: false, reason: string }}
 */
export function verifyCloudinary(rawBody, headers, apiSecret, now = Date.now()) {
  if (!apiSecret) return { ok: false, reason: "not_configured" };
  const ts = headers.get("x-cld-timestamp") ?? "";
  const sig = (headers.get("x-cld-signature") ?? "").toLowerCase();
  if (!/^\d{9,11}$/.test(ts) || !/^[a-f0-9]{40,64}$/.test(sig)) return { ok: false, reason: "missing" };
  if (!fresh(Number(ts), now)) return { ok: false, reason: "stale" };
  const payload = rawBody + ts + apiSecret;
  const ok =
    equal(sig, createHash("sha1").update(payload).digest("hex")) ||
    equal(sig, createHash("sha256").update(payload).digest("hex"));
  return ok ? { ok: true, eventId: sig } : { ok: false, reason: "signature" };
}

/**
 * Brevo: "Authorization: Bearer <BREVO_WEBHOOK_SECRET>" (set in the Brevo webhook settings), sender IP
 * in Brevo's ranges, and ts_event no older than 5 minutes.
 * @returns {{ ok: true, eventId: string, event: object } | { ok: false, reason: string }}
 */
export function verifyBrevo(rawBody, headers, { secret, ip, ranges = BREVO_DEFAULT_RANGES, checkIp = true }, now = Date.now()) {
  if (!secret) return { ok: false, reason: "not_configured" };
  const given = (headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!equal(given, secret)) return { ok: false, reason: "secret" };
  if (checkIp && !ipInRanges(ip, ranges)) return { ok: false, reason: "ip" };
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: "body" };
  }
  if (!event || typeof event !== "object" || Array.isArray(event)) return { ok: false, reason: "body" };
  if (!fresh(Number(event.ts_event ?? event.ts), now)) return { ok: false, reason: "stale" };
  const eventId = createHash("sha256")
    .update(`${event.event}|${event["message-id"] ?? event.id ?? ""}|${event.ts_event ?? event.ts}|${event.email ?? ""}`)
    .digest("hex");
  return { ok: true, eventId, event };
}

/** Read the raw body with a size cap (the signature covers these exact bytes). */
export async function rawBody(req) {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > WEBHOOK_MAX_BYTES) return null;
  const text = await req.text();
  return Buffer.byteLength(text) > WEBHOOK_MAX_BYTES ? null : text;
}

/** Idempotency: true the first time an event id is seen, false for a repeat. */
export async function firstDelivery(provider, eventId) {
  try {
    await db.webhookEvent.create({ data: { provider, eventId: eventId.slice(0, 128) } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
    throw err;
  }
}
