import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { __resetMemoryLimits } from "@/lib/security/rateLimit";
import { redirectSchema } from "@/lib/validation/redirects";

import { clearMail, makeUser, sentMail } from "../helpers.js";

/** Phase 16: redirects, admin search, trash, cache purge, health, email preview, upload types, charts. */

const cookieJar = { access: "" };
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({
    get: (name) => (name.endsWith("gi_at") ? { value: cookieJar.access } : undefined),
  }),
}));

const ORIGIN = "http://localhost:3000";
const stamp = Date.now().toString(36);
const req = (method, body, url = `${ORIGIN}/x`) =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function as(role) {
  const { user } = await makeUser({ role });
  await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
  cookieJar.access = (await createSession(user)).accessToken;
  return user;
}
beforeEach(() => __resetMemoryLimits());

describe("redirect rules", () => {
  it("only paths on this site; never home, /admin, /api or itself; https targets allowed", () => {
    const ok = (r) => redirectSchema.safeParse({ statusCode: 301, ...r }).success;
    expect(ok({ fromPath: "/old", toPath: "/new" })).toBe(true);
    expect(ok({ fromPath: "/old/", toPath: "https://example.com/x" })).toBe(true);
    expect(redirectSchema.parse({ fromPath: "/old/", toPath: "/new/" })).toMatchObject({
      fromPath: "/old",
      toPath: "/new",
    });
    for (const fromPath of ["/", "/admin", "/admin/users", "/api/x", "//evil.com", "https://x.com", "/a?b=1"])
      expect(ok({ fromPath, toPath: "/new" }), fromPath).toBe(false);
    expect(ok({ fromPath: "/old", toPath: "javascript:alert(1)" })).toBe(false);
    expect(ok({ fromPath: "/old", toPath: "http://insecure.example" })).toBe(false);
    expect(ok({ fromPath: "/same", toPath: "/same" })).toBe(false);
    expect(ok({ fromPath: "/old", toPath: "/new", statusCode: 307 })).toBe(false);
  });

  it("API refuses duplicates, loops and chains; the proxy map sees changes at once", async () => {
    await as("EDITOR");
    const list = await import("@/app/api/admin/redirects/route");
    const { lookupRedirect } = await import("@/lib/redirectMap");
    const a = `/r-${stamp}-a`;
    const b = `/r-${stamp}-b`;
    expect((await list.POST(req("POST", { fromPath: a, toPath: "/about", statusCode: 302 }))).status).toBe(
      201,
    );
    expect(await lookupRedirect(a)).toEqual({ to: "/about", status: 302 });
    expect(await lookupRedirect(`${a}/`)).toEqual({ to: "/about", status: 302 });
    expect((await list.POST(req("POST", { fromPath: a, toPath: "/why-us" }))).status).toBe(400);
    const chain = await list.POST(req("POST", { fromPath: b, toPath: a }));
    expect(chain.status).toBe(400);
    expect((await chain.json()).fields.toPath).toMatch(/already redirects/);
    await as("VIEWER");
    expect((await list.POST(req("POST", { fromPath: b, toPath: "/about" }))).status).toBe(403);
  });
});

describe("admin search", () => {
  it("finds products by CAS and hides groups the role cannot read", async () => {
    const cat = await db.productCategory.create({
      data: { name: `S Cat ${stamp}`, slug: `s-cat-${stamp}`, family: "FOOD" },
    });
    await db.product.create({
      data: {
        name: `Searchable ${stamp}`,
        slug: `searchable-${stamp}`,
        categoryId: cat.id,
        casNo: "77-92-9",
      },
    });
    const route = await import("@/app/api/admin/search/route");
    const run = async (q) =>
      (
        await (
          await route.GET(req("GET", undefined, `${ORIGIN}/api/admin/search?q=${encodeURIComponent(q)}`))
        ).json()
      ).groups;

    await as("EDITOR");
    const groups = await run(`Searchable ${stamp}`);
    expect(groups.find((g) => g.group === "Products").items[0].href).toMatch(/^\/admin\/products\/c/);
    expect((await run("77-92-9")).some((g) => g.group === "Products")).toBe(true);
    expect(await run("x")).toEqual([]);

    const me = await as("EDITOR");
    expect((await run(me.email)).some((g) => g.group === "Users")).toBe(false);
    await as("SUPER_ADMIN");
    expect((await run(me.email)).some((g) => g.group === "Users")).toBe(true);
  });
});

describe("trash", () => {
  it("restores a deleted product as a draft with its old slug; purges after 30 days", async () => {
    const editor = await as("EDITOR");
    const cat = await db.productCategory.create({
      data: { name: `T Cat ${stamp}`, slug: `t-cat-${stamp}`, family: "FOOD", status: "PUBLISHED" },
    });
    const p = await db.product.create({
      data: { name: `Trash ${stamp}`, slug: `trash-${stamp}`, categoryId: cat.id, status: "PUBLISHED" },
    });
    const { deleteProduct, loadProduct } = await import("@/lib/admin/products");
    await deleteProduct({ user: editor, product: await loadProduct(p.id) });

    const route = await import("@/app/api/admin/trash/route");
    const items = (await (await route.GET(req("GET"))).json()).items;
    expect(items.some((i) => i.type === "product" && i.id === p.id)).toBe(true);

    const res = await route.POST(req("POST", { type: "product", id: p.id }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ slug: `trash-${stamp}` });
    expect(await db.product.findUnique({ where: { id: p.id } })).toMatchObject({
      deletedAt: null,
      status: "DRAFT",
      slug: `trash-${stamp}`,
    });

    // a product whose category is in the trash cannot come back first
    await db.product.update({ where: { id: p.id }, data: { deletedAt: new Date() } });
    await db.productCategory.update({ where: { id: cat.id }, data: { deletedAt: new Date() } });
    const blocked = await route.POST(req("POST", { type: "product", id: p.id }));
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).error).toMatch(/Restore its category/);

    // only a super admin deletes for good
    expect((await route.DELETE(req("DELETE", { type: "product", id: p.id }))).status).toBe(403);

    // purge: older than 30 days goes, products before their category
    const old = new Date(Date.now() - 31 * 86_400_000);
    await db.product.update({ where: { id: p.id }, data: { deletedAt: old } });
    await db.productCategory.update({ where: { id: cat.id }, data: { deletedAt: old } });
    const { purgeExpired } = await import("@/lib/admin/trash");
    const result = await purgeExpired();
    expect(result.product).toBeGreaterThanOrEqual(1);
    expect(await db.product.findUnique({ where: { id: p.id } })).toBeNull();
    expect(await db.productCategory.findUnique({ where: { id: cat.id } })).toBeNull();
  });

  it("viewers are refused before the body is read", async () => {
    await as("VIEWER");
    const route = await import("@/app/api/admin/trash/route");
    expect((await route.POST(req("POST", { nonsense: true }))).status).toBe(403);
  });

  it("the cron route is off without a secret and refuses a wrong one", async () => {
    const route = await import("@/app/api/cron/purge/route");
    expect((await route.GET(new Request(`${ORIGIN}/api/cron/purge`))).status).toBe(404);
    vi.stubEnv("CRON_SECRET", "s".repeat(40));
    expect(
      (
        await route.GET(
          new Request(`${ORIGIN}/api/cron/purge`, { headers: { authorization: "Bearer wrong" } }),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await route.GET(
          new Request(`${ORIGIN}/api/cron/purge`, { headers: { authorization: `Bearer ${"s".repeat(40)}` } }),
        )
      ).status,
    ).toBe(200);
    vi.unstubAllEnvs();
  });
});

describe("cache purge, health, emails", () => {
  it("cache purge is super admin only", async () => {
    const route = await import("@/app/api/admin/cache/route");
    await as("EDITOR");
    expect((await route.POST(req("POST"))).status).toBe(403);
    await as("SUPER_ADMIN");
    const res = await route.POST(req("POST"));
    expect(res.status).toBe(200);
    expect((await res.json()).tags).toBeGreaterThan(10);
  });

  it("health says only whether the database answers", async () => {
    const route = await import("@/app/api/health/route");
    const res = await route.GET(new Request(`${ORIGIN}/api/health`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, database: "up" });
  });

  it("email previews render every template; a test goes only to the signed-in admin", async () => {
    clearMail();
    const user = await as("SUPER_ADMIN");
    const route = await import("@/app/api/admin/emails/route");
    const { EMAIL_KEYS } = await import("@/lib/email/samples");
    for (const key of EMAIL_KEYS) {
      const data = await (
        await route.GET(req("GET", undefined, `${ORIGIN}/api/admin/emails?template=${key}`))
      ).json();
      expect(data.subject, key).toBeTruthy();
      expect(data.html, key).toMatch(/^<!doctype html>/);
    }
    expect((await route.POST(req("POST", { template: "enquiry-ack" }))).status).toBe(200);
    expect(sentMail().at(-1)).toMatchObject({ to: user.email });
    expect(sentMail().at(-1).subject).toMatch(/^\[Test\]/);
    expect((await route.POST(req("POST", { template: "../etc/passwd" }))).status).toBe(400);
  });
});

describe("upload types and dashboard numbers", () => {
  it("switched-off formats are refused even with a valid file", async () => {
    const { validateBuffer } = await import("@/lib/media/service");
    const png = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001",
      "hex",
    );
    const limits = { imageBytes: 5e6, pdfBytes: 1e7, imageFormats: ["jpg", "webp"], allowPdf: false };
    expect(() => validateBuffer(png, "image", limits)).toThrow(/PNG images are switched off/);
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
    expect(() => validateBuffer(pdf, "pdf", limits)).toThrow(/PDF uploads are switched off/);
  });

  it("weeks start on Monday in India time; spam is not counted", async () => {
    const { enquiryStats, istWeekStart } = await import("@/lib/admin/dashboard");
    // Sunday 23:00 IST is still the week that began on the Monday before
    expect(istWeekStart(new Date("2026-11-22T17:30:00Z")).toISOString()).toBe("2026-11-15T18:30:00.000Z");
    // Monday 00:30 IST starts a new week
    expect(istWeekStart(new Date("2026-11-22T19:00:00Z")).toISOString()).toBe("2026-11-22T18:30:00.000Z");
    const now = new Date();
    const before = await enquiryStats(now);
    await db.enquiry.create({
      data: { type: "QUOTE", name: "W", email: "w@example.in", productNames: [`Chart Product ${stamp}`] },
    });
    await db.enquiry.create({
      data: {
        type: "QUOTE",
        name: "S",
        email: "s@example.in",
        status: "SPAM",
        productNames: [`Chart Product ${stamp}`],
      },
    });
    const after = await enquiryStats(now);
    expect(after.perWeek).toHaveLength(12);
    expect(after.perWeek.at(-1).value).toBe(before.perWeek.at(-1).value + 1);
    expect(after.top.find((t) => t.label === `Chart Product ${stamp}`)?.value).toBe(1);
  });
});
