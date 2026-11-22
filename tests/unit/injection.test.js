import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { __resetMemoryLimits } from "@/lib/security/rateLimit";

import { makeUser } from "../helpers.js";

/**
 * Phase 17: injection flaws. Classic/blind/time-based SQL payloads, ORM operator and JSON filter
 * injection, LIKE wildcards, sort/filter allow-lists, prototype pollution, header and log injection,
 * path traversal and ReDoS. Every endpoint must answer with a normal status, never 500, and never
 * return more data than the query allows.
 */

const cookieJar = { access: "" };
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({
    get: (name) => (name.endsWith("gi_at") ? { value: cookieJar.access } : undefined),
  }),
}));

const ORIGIN = "http://localhost:3000";
const stamp = Date.now().toString(36);

/** sqlmap-style payloads: classic, boolean-blind, time-based, stacked, comment and encoding tricks. */
export const SQL_PAYLOADS = [
  "' OR '1'='1",
  "' OR 1=1--",
  '" OR ""="',
  '1; DROP TABLE "Product";--',
  "' UNION SELECT NULL,NULL,NULL--",
  "' AND SLEEP(5)--",
  "'; SELECT pg_sleep(5);--",
  "1' AND (SELECT 1 FROM pg_sleep(5))--",
  "%' AND 1=1 AND '%'='",
  "admin'/*",
  "\\'; --",
  "%27%20OR%201%3D1",
  "1 OR 1=1",
  "' OR 'x'::text = 'x",
  "$where: 1==1",
  '{"$gt": ""}',
];

let category;
beforeAll(async () => {
  const { user } = await makeUser({ role: "EDITOR" });
  await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
  cookieJar.access = (await createSession(user)).accessToken;
  category = await db.productCategory.create({
    data: { name: `Inj Cat ${stamp}`, slug: `inj-cat-${stamp}`, family: "FOOD", status: "PUBLISHED" },
  });
  await db.product.create({
    data: { name: `Alpha ${stamp}`, slug: `alpha-${stamp}`, categoryId: category.id, status: "PUBLISHED" },
  });
  await db.product.create({
    data: { name: `Beta ${stamp}`, slug: `beta-${stamp}`, categoryId: category.id, status: "PUBLISHED" },
  });
});
beforeEach(() => __resetMemoryLimits());

describe("SQL payloads against search and list endpoints", () => {
  it("public search: every payload returns a normal answer and no catalogue dump", async () => {
    const route = await import("@/app/api/public/search/route");
    for (const p of SQL_PAYLOADS) {
      const started = Date.now();
      const res = await route.GET(
        new Request(`${ORIGIN}/api/public/search?q=${encodeURIComponent(p)}`, {
          headers: { "x-forwarded-for": "203.0.113.200" },
        }),
      );
      expect(res.status, p).toBe(200);
      const body = await res.json();
      expect(body.products.length, p).toBeLessThanOrEqual(8);
      expect(
        body.products.some((x) => x.name === `Alpha ${stamp}`),
        p,
      ).toBe(false);
      expect(Date.now() - started, `time-based payload ${p}`).toBeLessThan(3000);
    }
  });

  it("admin lists treat LIKE wildcards literally (no match-everything with % or _)", async () => {
    const route = await import("@/app/api/admin/products/route");
    const get = async (q) =>
      (
        await (
          await route.GET(
            new Request(`${ORIGIN}/api/admin/products?q=${encodeURIComponent(q)}&category=${category.id}`),
          )
        ).json()
      ).rows;
    expect(await get("%")).toEqual([]);
    expect(await get("_")).toEqual([]);
    expect(await get("%lpha%")).toEqual([]);
    expect((await get(`Alpha ${stamp}`)).length).toBe(1);
    for (const p of SQL_PAYLOADS) expect(await get(p), p).toEqual([]);
  });

  it("sort and filter keys come from an allow-list; unknown or crafted ones never reach Prisma", async () => {
    const route = await import("@/app/api/admin/products/route");
    const status = async (qs) => (await route.GET(new Request(`${ORIGIN}/api/admin/products?${qs}`))).status;
    expect(await status("sort=passwordHash&dir=asc")).toBe(200); // falls back to the default sort
    expect(await status("sort=category.family&dir=desc")).toBe(200); // not in the list: default again
    expect(await status("dir=asc;DROP")).toBe(200);
    expect(await status("status=PUBLISHED' OR '1'='1")).toBe(400);
    expect(await status("category=1 OR 1=1")).toBe(400);
    expect(await status("featured[not]=x")).toBe(200); // unknown key ignored
    expect(await status(`q=${"a".repeat(5000)}`)).toBe(200); // capped, not an error
  });
});

describe("operator, JSON and prototype pollution injection", () => {
  const post = (url, raw) =>
    new Request(`${ORIGIN}${url}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: raw,
    });

  it("objects where strings are expected are refused (no Prisma operator injection)", async () => {
    const route = await import("@/app/api/admin/products/route");
    for (const slug of [{ not: "" }, { contains: "" }, { in: ["a"] }, ["a"], null]) {
      const res = await route.POST(
        post("/api/admin/products", JSON.stringify({ name: "X", slug, categoryId: category.id })),
      );
      expect(res.status, JSON.stringify(slug)).toBe(400);
    }
    const login = await import("@/app/api/auth/login/route");
    const res = await login.POST(
      post("/api/auth/login", JSON.stringify({ email: { not: "" }, password: { gt: "" } })),
    );
    expect(res.status).toBe(400);
  });

  it("__proto__ / constructor / prototype keys are rejected before parsing continues", async () => {
    const route = await import("@/app/api/admin/products/route");
    for (const raw of [
      '{"__proto__":{"isAdmin":true},"name":"x"}',
      '{"constructor":{"prototype":{"x":1}}}',
      '{"a":{"prototype":1}}',
    ]) {
      expect((await route.POST(post("/api/admin/products", raw))).status, raw).toBe(400);
    }
    expect({}.isAdmin).toBeUndefined();
  });

  it("oversized bodies are refused", async () => {
    const route = await import("@/app/api/admin/products/route");
    const res = await route.POST(
      post("/api/admin/products", JSON.stringify({ name: "x".repeat(400 * 1024) })),
    );
    expect([400, 413]).toContain(res.status);
  });
});

describe("header, log and path injection", () => {
  it("email subject and names lose CR/LF (no header injection)", async () => {
    const { sendEmail } = await import("@/lib/brevo");
    globalThis.__giSentMail = [];
    await sendEmail({
      to: "a@example.com\r\nBcc: evil@example.com",
      subject: "Hi\r\nBcc: evil@example.com",
      html: "<p>x</p>",
      text: "x",
    });
    const m = globalThis.__giSentMail.at(-1);
    expect(m.subject).not.toMatch(/[\r\n]/);
    expect(m.to).not.toMatch(/[\r\n]/);
  });

  it("log lines cannot be forged with newlines; secrets are redacted", async () => {
    const { redact } = await import("@/lib/logger");
    expect(redact({ msg: 'ok\n{"level":"error","event":"fake"}' }).msg).not.toMatch(/\n/);
    expect(redact({ password: "x", nested: { refreshToken: "y" } })).toEqual({
      password: "[redacted]",
      nested: { refreshToken: "[redacted]" },
    });
  });

  it("media file names cannot climb out of the storage folder", async () => {
    const route = await import("@/app/api/dev-media/[file]/route");
    for (const file of [
      "../.env",
      "..%2F..%2F.env",
      "gi_abc.jpg",
      "gi_" + "a".repeat(32) + ".svg",
      "gi_" + "a".repeat(32) + ".jpg/../../x",
    ]) {
      const res = await route.GET(new Request(`${ORIGIN}/x`), { params: Promise.resolve({ file }) });
      expect(res.status, file).toBe(404);
    }
  });
});

describe("ReDoS", () => {
  it("validation regexes stay fast on adversarial input", async () => {
    const { productSchema, slugSchema, isValidCas } = await import("@/lib/validation/catalogue");
    const { enquirySchema } = await import("@/lib/validation/enquiry");
    const { redirectSchema } = await import("@/lib/validation/redirects");
    const { spamScore } = await import("@/lib/enquiries/spam");
    const evil = [
      "a-".repeat(5000) + "!",
      "1".repeat(20000) + "-",
      `${"-".repeat(10000)}x`,
      `${"a".repeat(50000)}@`,
      `http://${"a.".repeat(10000)}`,
    ];
    const started = Date.now();
    for (const s of evil) {
      slugSchema.safeParse(s);
      isValidCas(s);
      productSchema.safeParse({ name: s, slug: s, categoryId: s, casNo: s });
      enquirySchema.safeParse({ type: "CONTACT", name: s, email: s, phone: s, message: s });
      redirectSchema.safeParse({ fromPath: `/${s}`, toPath: s });
      spamScore({ message: s, name: s, email: s, startedAt: 1 }, { blockedWords: ["zzz"] }, 10_000);
    }
    expect(Date.now() - started).toBeLessThan(1500);
  });
});
