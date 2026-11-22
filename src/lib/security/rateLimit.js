import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { optionalEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

import { abuseSettings } from "./abuse";

/**
 * Sliding-window rate limiter (Phase 22).
 * Production: Upstash Redis (shared across serverless instances).
 * Development/tests without Upstash: in-memory fallback (per process).
 * Cloudflare rate-limit rules sit in front of this as the outer layer (docs/security/22.md).
 *
 * OTP resend (60 s cooldown, 5 per hour) and wrong-code attempts (5 per code) are enforced on the
 * OTP rows themselves in src/lib/auth/otp.js, so they hold even across instances without Redis.
 */

export const LIMITS = {
  loginIp: { limit: 5, windowSec: 15 * 60 },
  loginEmail: { limit: 5, windowSec: 15 * 60 },
  refreshIp: { limit: 60, windowSec: 60 },
  otpVerifyUser: { limit: 10, windowSec: 60 * 60 },
  resetRequest: { limit: 3, windowSec: 60 * 60 }, // per IP and per email
  sensitiveUser: { limit: 10, windowSec: 60 * 60 },
  search: { limit: 60, windowSec: 60, setting: "searchPerMinute" }, // per IP
  consent: { limit: 30, windowSec: 60 }, // per IP
  upload: { limit: 30, windowSec: 60 * 60, setting: "uploadsPerHour" }, // files per admin
  enquiryIp: { limit: 5, windowSec: 60 * 60, setting: "formsPerHour" }, // public forms per IP
  enquiryEmail: { limit: 5, windowSec: 60 * 60 }, // public forms per email address
  newsletterIp: { limit: 5, windowSec: 60 * 60, setting: "formsPerHour" },
  // failOpen: if Redis is down these let traffic through (they are a second layer, and closing them
  // would take the whole API or all sign-in emails down). Every other limit fails closed.
  apiIp: { limit: 300, windowSec: 60, setting: "apiPerMinute", failOpen: true }, // every /api request, per IP (proxy)
  mailRecipient: { limit: 8, windowSec: 60 * 60, failOpen: true }, // emails to one address (email bombing)
  webhook: { limit: 120, windowSec: 60 }, // incoming webhooks per IP (Phase 26)
};

/**
 * End-to-end tests sign in many times from one IP. Only outside production, and only when the test
 * runner starts the server with E2E_RELAXED_LIMITS=1, limits are multiplied by 20. Never in production.
 */
async function effectiveLimit(name) {
  const cfg = { ...LIMITS[name] };
  // Admin-set values (Settings -> Rate limits), already clamped to safe caps by the schema.
  if (cfg.setting) cfg.limit = (await abuseSettings()).value[cfg.setting] ?? cfg.limit;
  if (process.env.NODE_ENV !== "production" && process.env.E2E_RELAXED_LIMITS === "1")
    return { ...cfg, limit: cfg.limit * 20 };
  return cfg;
}

let redis;
const upstashCache = new Map();
function upstash(name, { limit, windowSec }) {
  const url = optionalEnv("UPSTASH_REDIS_REST_URL");
  const token = optionalEnv("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return null;
  redis ??= new Redis({ url, token });
  const id = `${name}:${limit}:${windowSec}`; // a changed limit gets its own limiter
  if (!upstashCache.has(id)) {
    upstashCache.set(
      id,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
        prefix: `gi:rl:${name}`,
        analytics: false,
      }),
    );
  }
  return upstashCache.get(id);
}

const memory = new Map(); // key -> number[] (timestamps)
function memoryLimit(key, { limit, windowSec }) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const hits = (memory.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    memory.set(key, hits);
    return { success: false, remaining: 0, reset: hits[0] + windowMs };
  }
  hits.push(now);
  memory.set(key, hits);
  if (memory.size > 50_000) memory.clear(); // crude bound for long-running dev servers
  return { success: true, remaining: limit - hits.length, reset: now + windowMs };
}

/**
 * @param {keyof typeof LIMITS} name
 * @param {string} identifier ip, email (lowercased) or user id — hashed by the caller when stored
 * @returns {Promise<{ success: boolean, retryAfter: number }>}
 */
export async function rateLimit(name, identifier) {
  const cfg = await effectiveLimit(name);
  const key = `${name}:${cfg.limit}:${identifier}`;
  try {
    const rl = upstash(name, cfg);
    const res = rl ? await rl.limit(identifier) : memoryLimit(key, cfg);
    const retryAfter = Math.max(1, Math.ceil((res.reset - Date.now()) / 1000));
    // No identifier in the log: it can be an IP or an email (todo 17).
    if (!res.success) logger.warn("ratelimit.hit", { name, limit: cfg.limit, windowSec: cfg.windowSec });
    return { success: res.success, retryAfter };
  } catch (err) {
    // Fail closed for auth-sensitive limits if Redis is down.
    logger.error("ratelimit.error", { name, err });
    return { success: Boolean(LIMITS[name].failOpen), retryAfter: 30 };
  }
}

/** Test helper. */
export function __resetMemoryLimits() {
  memory.clear();
}
