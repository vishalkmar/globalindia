import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { spamScore } from "@/lib/enquiries/spam";
import { __resetMemoryLimits } from "@/lib/security/rateLimit";
import { contactSchema, enquirySchema, parseBasket, quoteSchema } from "@/lib/validation/enquiry";

import { clearMail, makeUser, sentMail } from "../helpers.js";

/** Phase 14: spam scoring, schemas, public submit, basket, admin inbox and permissions. */

const cookieJar = { access: "", basket: "" };
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({
    get: (name) => (name.endsWith("gi_at") ? { value: cookieJar.access } : undefined),
  }),
}));

const ORIGIN = "http://localhost:3000";
const stamp = Date.now().toString(36);
const tick = () => new Promise((r) => setTimeout(r, 30));
const post = (url, body, headers = {}) =>
  new Request(`${ORIGIN}${url}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      "x-forwarded-for": "203.0.113.9",
      ...headers,
    },
    body: JSON.stringify(body),
  });
const enquiryRoute = () => import("@/app/api/public/enquiry/route");

async function as(role) {
  const { user } = await makeUser({ role });
  await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
  cookieJar.access = (await createSession(user)).accessToken;
  return user;
}

let product;
beforeAll(async () => {
  const cat = await db.productCategory.create({
    data: { name: `Enq Cat ${stamp}`, slug: `enq-cat-${stamp}`, family: "DETERGENT", status: "PUBLISHED" },
  });
  product = await db.product.create({
    data: {
      name: `SLES Enq ${stamp}`,
      slug: `sles-enq-${stamp}`,
      categoryId: cat.id,
      status: "PUBLISHED",
      packSizes: ["220 kg drum"],
    },
  });
  await db.siteSetting.upsert({
    where: { key: "security" },
    update: { value: { defaultAdminEmail: "owner@test.local" } },
    create: { key: "security", value: { defaultAdminEmail: "owner@test.local" } },
  });
});
beforeEach(() => {
  __resetMemoryLimits();
  clearMail();
});

const quote = (over = {}) => ({
  type: "QUOTE",
  items: [{ slug: product.slug, quantity: "500 kg", packSize: "220 kg drum" }],
  name: "Rakesh Gupta",
  company: "Gupta Detergents",
  email: `rakesh-${stamp}@example.in`,
  phone: "98100 12345",
  city: "Panipat",
  message: "Need COA with the quote.",
  website: "",
  startedAt: Date.now() - 60_000,
  turnstileToken: "",
  source: "/products/x",
  ...over,
});

describe("spam score", () => {
  const now = 1_000_000;
  it("a normal enquiry scores low", () => {
    expect(
      spamScore({ email: "a@b.in", message: "Need 500 kg SLES", startedAt: now - 20_000 }, {}, now),
    ).toMatchObject({ isSpam: false, honeypot: false });
  });
  it("honeypot, block lists and links push it over the line; each rule explains itself", () => {
    expect(spamScore({ website: "http://x", startedAt: now - 20_000 }, {}, now)).toMatchObject({
      isSpam: true,
      honeypot: true,
    });
    expect(
      spamScore(
        { email: "x@spam.example", startedAt: now - 20_000 },
        { blockedDomains: ["spam.example"] },
        now,
      ).isSpam,
    ).toBe(true);
    expect(
      spamScore(
        { email: "x@mail.spam.example", startedAt: now - 20_000 },
        { blockedDomains: ["spam.example"] },
        now,
      ).isSpam,
    ).toBe(true);
    expect(
      spamScore(
        { message: "Cheap SEO backlinks for you", startedAt: now - 20_000 },
        { blockedWords: ["backlinks"] },
        now,
      ).isSpam,
    ).toBe(true);
    const links = spamScore(
      { message: "see http://a.io http://b.io http://c.io", startedAt: now - 1000 },
      {},
      now,
    );
    expect(links.isSpam).toBe(true);
    expect(links.reasons.join(" ")).toMatch(/3 links/);
    expect(links.reasons.join(" ")).toMatch(/after opening the form/);
  });
  it("one soft signal alone is not enough (a quick buyer who writes in capitals)", () => {
    expect(
      spamScore(
        { message: "NEED SLES 70 PERCENT 5 DRUMS URGENT PLEASE CALL", startedAt: now - 2000 },
        {},
        now,
      ).isSpam,
    ).toBe(false);
  });
});

describe("enquiry schemas", () => {
  it("quote needs products, delivery city and a phone; rejects markup and bad phones", () => {
    expect(quoteSchema.safeParse(quote()).success).toBe(true);
    expect(quoteSchema.safeParse(quote({ items: [] })).success).toBe(false);
    expect(quoteSchema.safeParse(quote({ phone: "" })).success).toBe(false);
    expect(quoteSchema.safeParse(quote({ phone: "12" })).success).toBe(false);
    expect(quoteSchema.safeParse(quote({ name: "<script>" })).success).toBe(false);
    expect(
      quoteSchema.safeParse(quote({ items: Array.from({ length: 11 }, () => quote().items[0]) })).success,
    ).toBe(false);
    expect(quoteSchema.safeParse({ ...quote(), extra: 1 }).success).toBe(false);
  });
  it("only keeps a same-site source path", () => {
    expect(enquirySchema.parse(quote({ source: "https://evil.example/x" })).source).toBe("");
    expect(enquirySchema.parse(quote({ source: "//evil.example" })).source).toBe("");
    expect(enquirySchema.parse(quote({ source: "/contact" })).source).toBe("/contact");
  });
  it("contact needs a message; unknown types are refused", () => {
    expect(
      contactSchema.safeParse({ ...quote(), type: "CONTACT", items: undefined, message: "" }).success,
    ).toBe(false);
    expect(enquirySchema.safeParse({ ...quote(), type: "ORDER" }).success).toBe(false);
  });
  it("basket cookie keeps valid slugs only, at most 10, no duplicates", () => {
    expect(parseBasket("a.b.a.Bad_Slug.../x")).toEqual(["a", "b"]);
    expect(parseBasket(Array.from({ length: 15 }, (_, i) => `p${i}`).join("."))).toHaveLength(10);
  });
});

describe("public enquiry API", () => {
  it("saves a quote as NEW with a product snapshot, emails the team and the customer", async () => {
    const res = await (await enquiryRoute()).POST(post("/api/public/enquiry", quote()));
    expect(res.status).toBe(201);
    const { reference } = await res.json();
    expect(reference).toMatch(/^GI-[A-Z0-9]{6}$/);
    const e = await db.enquiry.findFirst({
      where: { email: `rakesh-${stamp}@example.in` },
      orderBy: { createdAt: "desc" },
    });
    expect(e).toMatchObject({
      type: "QUOTE",
      status: "NEW",
      city: "Panipat",
      quantity: "500 kg",
      packSize: "220 kg drum",
      source: "/products/x",
    });
    expect(e.productNames).toEqual([`SLES Enq ${stamp}`]);
    expect(e.ipHash).toMatch(/^[a-f0-9]{16,}$/);
    expect(e.ipHash).not.toContain("203.0.113.9");
    await tick();
    const mails = sentMail();
    expect(mails.find((m) => m.tags.includes("enquiry-admin")).to).toBe("owner@test.local");
    expect(mails.find((m) => m.tags.includes("enquiry-ack")).to).toBe(`rakesh-${stamp}@example.in`);
    expect(mails.find((m) => m.tags.includes("enquiry-ack")).text).not.toMatch(/admin/i);
  });

  it("honeypot: answers like a success, stores nothing, sends nothing", async () => {
    const before = await db.enquiry.count();
    const res = await (
      await enquiryRoute()
    ).POST(post("/api/public/enquiry", quote({ website: "http://bot.example" })));
    expect(res.status).toBe(201);
    expect((await res.json()).reference).toBeNull();
    expect(await db.enquiry.count()).toBe(before);
    await tick();
    expect(sentMail()).toHaveLength(0);
  });

  it("spam is kept under SPAM and never emailed", async () => {
    const res = await (
      await enquiryRoute()
    ).POST(
      post(
        "/api/public/enquiry",
        quote({ startedAt: Date.now() - 500, message: "buy http://a.io http://b.io http://c.io" }),
      ),
    );
    expect(res.status).toBe(201);
    const e = await db.enquiry.findFirst({ where: { status: "SPAM" }, orderBy: { createdAt: "desc" } });
    expect(e.spamScore).toBeGreaterThanOrEqual(60);
    await tick();
    expect(sentMail()).toHaveLength(0);
  });

  it("refuses products that are not in the catalogue, cross-site posts and oversized bodies", async () => {
    const res = await (
      await enquiryRoute()
    ).POST(
      post(
        "/api/public/enquiry",
        quote({ items: [{ slug: "not-a-product", quantity: "1 kg", packSize: "" }] }),
      ),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).fields.items).toMatch(/catalogue/);
    expect(
      (
        await (
          await enquiryRoute()
        ).POST(post("/api/public/enquiry", quote(), { origin: "https://evil.example" }))
      ).status,
    ).toBe(403);
    expect(
      (await (await enquiryRoute()).POST(post("/api/public/enquiry", quote({ message: "x".repeat(40_000) }))))
        .status,
    ).toBeGreaterThanOrEqual(400);
  });

  it("rate limits per IP", async () => {
    const route = await enquiryRoute();
    const statuses = [];
    for (let i = 0; i < 8; i++)
      statuses.push(
        (
          await route.POST(
            post("/api/public/enquiry", quote({ email: `ip-${i}-${stamp}@example.in` }), {
              "x-forwarded-for": "198.51.100.77",
            }),
          )
        ).status,
      );
    expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true);
    expect(statuses[5]).toBe(429); // 5 per hour per IP (Phase 22)
    expect(statuses.at(-1)).toBe(429);
  });

  it("rate limits per email address across IPs", async () => {
    const route = await enquiryRoute();
    const statuses = [];
    for (let i = 0; i < 6; i++)
      statuses.push(
        (
          await route.POST(
            post("/api/public/enquiry", quote({ email: `same-${stamp}@example.in` }), {
              "x-forwarded-for": `192.0.2.${i + 10}`,
            }),
          )
        ).status,
      );
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("quote basket API", () => {
  it("adds, ignores duplicates, removes and clears using an httpOnly cookie", async () => {
    const route = await import("@/app/api/public/basket/route");
    const withCookie = (body, cookie) =>
      new Request(`${ORIGIN}/api/public/basket`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGIN, cookie },
        body: JSON.stringify(body),
      });
    let res = await route.POST(withCookie({ action: "add", slug: "sles-70" }, ""));
    expect((await res.json()).items).toEqual(["sles-70"]);
    const set = res.headers.get("set-cookie");
    expect(set).toMatch(/gi_quote=sles-70/);
    expect(set).toMatch(/HttpOnly/i);
    res = await route.POST(withCookie({ action: "add", slug: "sles-70" }, "gi_quote=sles-70"));
    expect((await res.json()).items).toEqual(["sles-70"]);
    res = await route.POST(withCookie({ action: "add", slug: "labsa-96" }, "gi_quote=sles-70"));
    expect((await res.json()).items).toEqual(["sles-70", "labsa-96"]);
    res = await route.POST(withCookie({ action: "remove", slug: "sles-70" }, "gi_quote=sles-70.labsa-96"));
    expect((await res.json()).items).toEqual(["labsa-96"]);
    res = await route.POST(withCookie({ action: "add", slug: "../etc" }, ""));
    expect(res.status).toBe(400);
  });
});

describe("admin inbox", () => {
  let editor;
  let enquiryId;
  beforeAll(async () => {
    editor = await as("EDITOR");
    const e = await db.enquiry.create({
      data: {
        type: "CONTACT",
        name: `Inbox ${stamp}`,
        email: `inbox-${stamp}@example.in`,
        message: "Price of glycerine?",
      },
    });
    enquiryId = e.id;
  });

  it("lists with search and filters; spam hidden unless asked for", async () => {
    await as("EDITOR");
    const route = await import("@/app/api/admin/enquiries/route");
    const get = (qs) => route.GET(new Request(`${ORIGIN}/api/admin/enquiries?${qs}`));
    const found = await (await get(`q=Inbox ${stamp}`)).json();
    expect(found.rows.map((r) => r.id)).toContain(enquiryId);
    expect(found.rows[0].reference).toMatch(/^GI-/);
    const spam = await (await get("status=SPAM")).json();
    expect(spam.rows.every((r) => r.status === "SPAM")).toBe(true);
    const normal = await (await get("")).json();
    expect(normal.rows.some((r) => r.status === "SPAM")).toBe(false);
    expect((await get("status=DELETED")).status).toBe(400);
    expect((await get("from=2026-13-45")).status).toBe(400);
  });

  it("status, assignment and notes build the timeline", async () => {
    editor = await as("EDITOR");
    const item = await import("@/app/api/admin/enquiries/[id]/route");
    const notes = await import("@/app/api/admin/enquiries/[id]/notes/route");
    const ctx = { params: Promise.resolve({ id: enquiryId }) };
    const patch = (body) =>
      new Request(`${ORIGIN}/x`, {
        method: "PATCH",
        headers: { "content-type": "application/json", origin: ORIGIN },
        body: JSON.stringify(body),
      });
    expect((await notes.POST(post("/x", { text: "Called, sending quote." }), ctx)).status).toBe(201);
    expect((await db.enquiry.findUnique({ where: { id: enquiryId } })).status).toBe("IN_PROGRESS");
    expect((await item.PATCH(patch({ status: "QUOTED", assignedToId: editor.id }), ctx)).status).toBe(200);
    expect((await item.PATCH(patch({ assignedToId: "cm0000000000000000000abcd" }), ctx)).status).toBe(400);
    const detail = await (await item.GET(new Request(`${ORIGIN}/x`), ctx)).json();
    expect(detail.enquiry.status).toBe("QUOTED");
    const kinds = detail.timeline.map((t) => t.kind);
    expect(kinds).toContain("note");
    expect(kinds).toContain("change");
    expect(detail.assignees.some((a) => a.id === editor.id)).toBe(true);
  });

  it("CSV export is formula-safe and audited", async () => {
    await as("EDITOR");
    await db.enquiry.create({
      data: { type: "CONTACT", name: "=HYPERLINK(1)", email: `csv-${stamp}@example.in`, message: "@SUM(A1)" },
    });
    const route = await import("@/app/api/admin/enquiries/export/route");
    const res = await route.GET(new Request(`${ORIGIN}/api/admin/enquiries/export?q=csv-${stamp}`));
    const csv = await res.text();
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain("'@SUM(A1)");
    expect(await db.auditLog.count({ where: { action: "enquiry.export" } })).toBeGreaterThan(0);
  });

  it("viewers can read but not change; the bell counts NEW only", async () => {
    await as("VIEWER");
    const item = await import("@/app/api/admin/enquiries/[id]/route");
    const ctx = { params: Promise.resolve({ id: enquiryId }) };
    expect((await item.GET(new Request(`${ORIGIN}/x`), ctx)).status).toBe(200);
    const patch = new Request(`${ORIGIN}/x`, {
      method: "PATCH",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify({ status: "WON" }),
    });
    expect((await item.PATCH(patch, ctx)).status).toBe(403);
    const bell = await import("@/app/api/admin/enquiries/unread/route");
    const data = await (await bell.GET(new Request(`${ORIGIN}/x`))).json();
    expect(data.count).toBe(await db.enquiry.count({ where: { status: "NEW" } }));
  });
});
