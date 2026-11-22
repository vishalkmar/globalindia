import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { __resetMemoryLimits } from "@/lib/security/rateLimit";

import { makeUser } from "../helpers.js";

/**
 * Phase 19 todo 18: fuzzing. Seeded random payloads (so a failure can be replayed) are sent to public
 * and admin write endpoints. Whatever arrives, the answer must be a clean 4xx — never a 500, never a
 * stack trace, never "ok" for garbage.
 */

const cookieJar = { access: "" };
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({ get: (name) => (name.endsWith("gi_at") ? { value: cookieJar.access } : undefined) }),
}));

const ORIGIN = "http://localhost:3000";
const ROUNDS = 40;

/** Mulberry32: small deterministic PRNG. */
function prng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NASTY = ["", " ", "\u0000", "‮", String.fromCodePoint(0x1f600).repeat(50), "<script>alert(1)</script>", "' OR 1=1--", "../../etc/passwd", "%00", "${7*7}", "{{7*7}}", "\r\nX-Injected: 1", "a".repeat(5000), "NaN", "-0", "1e309", "true", "null", "__proto__", "javascript:alert(1)", "http://169.254.169.254/latest/meta-data/"];

function value(rand, depth = 0) {
  const r = rand();
  if (depth > 3 || r < 0.35) return NASTY[Math.floor(rand() * NASTY.length)];
  if (r < 0.45) return Math.floor(rand() * 2 ** 53) * (rand() < 0.5 ? -1 : 1);
  if (r < 0.5) return rand() < 0.5;
  if (r < 0.55) return null;
  if (r < 0.75) return Array.from({ length: Math.floor(rand() * 5) }, () => value(rand, depth + 1));
  const obj = {};
  const keys = ["name", "email", "slug", "type", "items", "status", "title", "body", "id", "mediaId", "fromPath", "toPath", "csv", "__proto__", "constructor", "x"];
  for (let i = 0; i < 1 + Math.floor(rand() * 5); i++) obj[keys[Math.floor(rand() * keys.length)]] = value(rand, depth + 1);
  return obj;
}

const TARGETS = [
  ["@/app/api/public/enquiry/route", "POST"],
  ["@/app/api/public/newsletter/route", "POST"],
  ["@/app/api/public/basket/route", "POST"],
  ["@/app/api/auth/login/route", "POST"],
  ["@/app/api/admin/products/route", "POST"],
  ["@/app/api/admin/categories/route", "POST"],
  ["@/app/api/admin/redirects/route", "POST"],
  ["@/app/api/admin/gallery/route", "PUT"],
  ["@/app/api/admin/faqs/route", "PUT"],
  ["@/app/api/admin/posts/route", "POST"],
  ["@/app/api/admin/products/import/route", "POST"],
];

beforeAll(async () => {
  const { user } = await makeUser({ role: "SUPER_ADMIN" });
  await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
  cookieJar.access = (await createSession(user)).accessToken;
});
beforeEach(() => __resetMemoryLimits());

describe("fuzzing write endpoints", () => {
  for (const [mod, method] of TARGETS) {
    it(`${method} ${mod.replace("@/app", "").replace("/route", "")} never fails with 500`, async () => {
      const handler = (await import(mod))[method];
      const rand = prng(mod.length * 7919);
      const statuses = new Set();
      for (let i = 0; i < ROUNDS; i++) {
        const payload = value(rand);
        const raw = rand() < 0.1 ? `${JSON.stringify(payload)}}` : JSON.stringify(payload); // sometimes broken JSON
        const res = await handler(
          new Request(`${ORIGIN}/x`, { method, headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": `198.51.100.${i % 250}` }, body: raw }),
          { params: Promise.resolve({}) },
        );
        statuses.add(res.status);
        expect(res.status, `round ${i}: ${raw.slice(0, 200)}`).not.toBe(500);
        const text = await res.text();
        expect(text, `round ${i}`).not.toMatch(/at \w+ \(|node_modules|Prisma|stack/i);
      }
      // garbage is never accepted as a success, except endpoints that answer "ok" to anything on purpose
      if (!mod.includes("newsletter") && !mod.includes("basket")) expect([...statuses].every((s) => s >= 400), [...statuses].join(",")).toBe(true);
    });
  }
});
