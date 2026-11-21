import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { optionalEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Sliding-window rate limiter.
 * Production: Upstash Redis (shared across serverless instances).
 * Development/tests without Upstash: in-memory fallback (per process).
 * Full limits table is configured in Phase 22; auth routes use it from Phase 4.
 */

export const LIMITS = {
  loginIp: { limit: 10, windowSec: 15 * 60 },
  loginEmail: { limit: 5, windowSec: 15 * 60 },
  refreshIp: { limit: 60, windowSec: 60 },
  otpVerifyUser: { limit: 10, windowSec: 60 * 60 },
  otpResendUser: { limit: 5, windowSec: 60 * 60 },
  resetRequest: { limit: 3, windowSec: 60 * 60 },
  sensitiveUser: { limit: 10, windowSec: 60 * 60 },
  search: { limit: 60, windowSec: 60 }, // per IP
  consent: { limit: 30, windowSec: 60 }, // per IP
  upload: { limit: 60, windowSec: 60 * 60 }, // files per admin per hour (Phase 22 tunes this)
};

/**
 * End-to-end tests sign in many times from one IP. Only outside production, and only when the test
 * runner starts the server with E2E_RELAXED_LIMITS=1, limits are multiplied by 20. Never in production.
 */
function effectiveLimit(name) {
  const cfg = LIMITS[name];
  if (process.env.NODE_ENV !== "production" && process.env.E2E_RELAXED_LIMITS === "1") return { ...cfg, limit: cfg.limit * 20 };
  return cfg;
}

let redis;
const upstashCache = new Map();
function upstash(name, { limit, windowSec }) {
  const url = optionalEnv("UPSTASH_REDIS_REST_URL");
  const token = optionalEnv("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return null;
  redis ??= new Redis({ url, token });
  if (!upstashCache.has(name)) {
    upstashCache.set(
      name,
      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`), prefix: `gi:rl:${name}`, analytics: false }),
    );
  }
  return upstashCache.get(name);
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
  const cfg = effectiveLimit(name);
  const key = `${name}:${identifier}`;
  try {
    const rl = upstash(name, cfg);
    const res = rl ? await rl.limit(identifier) : memoryLimit(key, cfg);
    const retryAfter = Math.max(1, Math.ceil((res.reset - Date.now()) / 1000));
    if (!res.success) logger.warn("ratelimit.hit", { name });
    return { success: res.success, retryAfter };
  } catch (err) {
    // Fail closed for auth-sensitive limits if Redis is down.
    logger.error("ratelimit.error", { name, err });
    return { success: false, retryAfter: 30 };
  }
}

/** Test helper. */
export function __resetMemoryLimits() {
  memory.clear();
}
