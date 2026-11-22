import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { readingMinutes, withHeadingIds } from "@/lib/content/toc";
import { db } from "@/lib/db";
import { pagePublicPath } from "@/lib/pagePath";
import { SECTIONS } from "@/lib/sections/registry";
import { __resetMemoryLimits } from "@/lib/security/rateLimit";
import { clientLogoListSchema, faqListSchema, industrySchema, postSchema } from "@/lib/validation/content";

import { INDUSTRIES } from "../../prisma/seed-industries.js";
import { FAQS, LEGAL_PAGES } from "../../prisma/seed-legal.js";
import { POSTS } from "../../prisma/seed-posts.js";
import { clearMail, makeUser, sentMail } from "../helpers.js";

/** Phase 15: industries, insights, FAQ, legal pages, testimonials, client logos, newsletter. */

const cookieJar = { access: "" };
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({
    get: (name) => (name.endsWith("gi_at") ? { value: cookieJar.access } : undefined),
  }),
}));

const ORIGIN = "http://localhost:3000";
const stamp = Date.now().toString(36);
const tick = () => new Promise((r) => setTimeout(r, 30));
const req = (method, body) =>
  new Request(`${ORIGIN}/x`, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = (id) => ({ params: Promise.resolve({ id }) });

async function as(role) {
  const { user } = await makeUser({ role });
  await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
  cookieJar.access = (await createSession(user)).accessToken;
  return user;
}

describe("table of contents", () => {
  it("adds unique ids to h2/h3 and lists them", () => {
    const { html, toc } = withHeadingIds(
      "<h2>Grades &amp; uses</h2><p>x</p><h3>IP</h3><h2>Grades &amp; uses</h2>",
    );
    expect(toc).toEqual([
      { id: "s-grades-uses", text: "Grades & uses", level: 2 },
      { id: "s-ip", text: "IP", level: 3 },
      { id: "s-grades-uses-2", text: "Grades & uses", level: 2 },
    ]);
    expect(html).toContain('<h2 id="s-grades-uses">');
    expect(html).toContain('<h2 id="s-grades-uses-2">');
  });
  it("reading time is at least a minute", () => {
    expect(readingMinutes("<p>short</p>")).toBe(1);
    expect(readingMinutes(`<p>${"word ".repeat(1000)}</p>`)).toBe(5);
  });
});

describe("seed content", () => {
  it("legal pages and downloads use valid sections; every legal page says when it was updated", () => {
    for (const page of LEGAL_PAGES) {
      for (const s of page.sections)
        expect(SECTIONS[s.type].schema.safeParse(s.data).success, `${page.slug}/${s.type}`).toBe(true);
      if (page.slug.startsWith("legal-")) expect(page.sections[0].data.eyebrow).toMatch(/^Last updated /);
    }
    expect(LEGAL_PAGES.map((p) => p.slug).sort()).toEqual([
      "downloads",
      "legal-cookies",
      "legal-disclaimer",
      "legal-privacy",
      "legal-shipping",
      "legal-terms",
    ]);
  });
  it("industries, posts and FAQs pass the admin schemas; no placeholder text", () => {
    for (const i of INDUSTRIES) {
      expect(
        industrySchema.safeParse({
          name: i.name,
          slug: i.slug,
          icon: i.icon,
          summary: i.summary,
          content: { intro: i.intro, needs: i.needs },
          faqs: i.faqs,
        }).success,
        i.slug,
      ).toBe(true);
    }
    for (const p of POSTS) {
      const { daysAgo: _d, ...rest } = p;
      expect(postSchema.safeParse({ ...rest, status: "PUBLISHED" }).success, p.slug).toBe(true);
    }
    expect(
      faqListSchema.safeParse({
        items: FAQS.map(([topic, question, answer]) => ({ topic, question, answer })),
      }).success,
    ).toBe(true);
    const all = JSON.stringify([INDUSTRIES, POSTS, FAQS, LEGAL_PAGES]);
    expect(all).not.toMatch(/lorem|ipsum|TODO|\bTBD\b/i);
    expect(INDUSTRIES.map((i) => i.slug)).toEqual([
      "food-beverage",
      "cosmetics-personal-care",
      "pharmaceuticals",
      "detergents-home-care",
      "soap-making",
      "textile-industrial",
      "automotive-care",
      "laboratories",
    ]);
  });
});

describe("schemas", () => {
  it("industry icons come from the allow-list; post schedule needs Published; logo links must be https", () => {
    expect(industrySchema.safeParse({ name: "X", slug: "x-ind", icon: "skull", summary: "s" }).success).toBe(
      false,
    );
    const post = {
      title: "T",
      slug: "t-post",
      excerpt: "e",
      body: `<p>${"word ".repeat(20)}</p>`,
      category: "Quality",
    };
    expect(postSchema.safeParse({ ...post, publishAt: "2030-01-01T10:00:00.000Z" }).success).toBe(false);
    expect(
      postSchema.safeParse({ ...post, status: "PUBLISHED", publishAt: "2030-01-01T10:00:00.000Z" }).success,
    ).toBe(true);
    expect(postSchema.safeParse({ ...post, body: "<p>too short</p>" }).success).toBe(false);
    const logo = { name: "Acme", mediaId: "cm0000000000000000000abcd" };
    expect(clientLogoListSchema.safeParse({ items: [{ ...logo, url: "javascript:alert(1)" }] }).success).toBe(
      false,
    );
    expect(
      clientLogoListSchema.safeParse({ items: [{ ...logo, url: "https://acme.example" }] }).success,
    ).toBe(true);
  });
  it("legal pages live under /legal and never at /<slug>", async () => {
    const { isNestedPageSlug } = await import("@/lib/pages");
    expect(pagePublicPath("legal-privacy")).toBe("/legal/privacy");
    expect(pagePublicPath("home")).toBe("/");
    expect(pagePublicPath("about")).toBe("/about");
    expect(isNestedPageSlug("legal-terms")).toBe(true);
    expect(isNestedPageSlug("about")).toBe(false);
  });
});

describe("FAQ, testimonials and client logos", () => {
  let editor;
  beforeAll(async () => {
    editor = await as("EDITOR");
  });

  it("FAQ list is replaced in order", async () => {
    await as("EDITOR");
    const route = await import("@/app/api/admin/faqs/route");
    const items = [
      { topic: "Delivery", question: "Second?", answer: "B", isVisible: true },
      { topic: "Ordering", question: "First?", answer: "A", isVisible: false },
    ];
    const res = await route.PUT(req("PUT", { items }));
    expect(res.status).toBe(200);
    const rows = await db.faq.findMany({ orderBy: { order: "asc" } });
    expect(rows.map((r) => [r.question, r.isVisible])).toEqual([
      ["Second?", true],
      ["First?", false],
    ]);
    const { getFaqs } = await import("@/lib/content/data");
    expect((await getFaqs()).map((f) => f.question)).toEqual(["Second?"]);
  });

  it("logos must be images with alt text; testimonials need a name and quote", async () => {
    await as("EDITOR");
    const logos = await import("@/app/api/admin/client-logos/route");
    const pdf = await db.mediaAsset.create({
      data: {
        publicId: `gi_l${stamp}`,
        url: "/l.pdf",
        type: "PDF",
        format: "pdf",
        bytes: 1,
        alt: "",
        uploadedById: editor.id,
        driver: "local",
      },
    });
    const bad = await logos.PUT(
      req("PUT", { items: [{ name: "Acme", mediaId: pdf.id, url: "", isVisible: true }] }),
    );
    expect(bad.status).toBe(400);
    expect((await bad.json()).fields["items.0.mediaId"]).toMatch(/image/);
    const img = await db.mediaAsset.create({
      data: {
        publicId: `gi_l${stamp}b`,
        url: "/l.png",
        type: "IMAGE",
        format: "png",
        bytes: 1,
        alt: "Acme logo",
        uploadedById: editor.id,
        driver: "local",
      },
    });
    expect(
      (
        await logos.PUT(
          req("PUT", {
            items: [{ name: "Acme", mediaId: img.id, url: "https://acme.example", isVisible: true }],
          }),
        )
      ).status,
    ).toBe(200);

    const testimonials = await import("@/app/api/admin/testimonials/route");
    expect((await testimonials.PUT(req("PUT", { items: [{ quote: "", name: "X" }] }))).status).toBe(400);
  });

  it("viewers can read the lists but not change them", async () => {
    await as("VIEWER");
    const route = await import("@/app/api/admin/faqs/route");
    expect((await route.GET(req("GET"))).status).toBe(200);
    expect((await route.PUT(req("PUT", { items: [] }))).status).toBe(403);
  });
});

describe("industries admin", () => {
  it("creates with linked products, renames with a redirect, and links show on both sides", async () => {
    await as("EDITOR");
    const cat = await db.productCategory.create({
      data: { name: `Ind Cat ${stamp}`, slug: `ind-cat-${stamp}`, family: "FOOD", status: "PUBLISHED" },
    });
    const p = await db.product.create({
      data: {
        name: `Ind Product ${stamp}`,
        slug: `ind-product-${stamp}`,
        categoryId: cat.id,
        status: "PUBLISHED",
      },
    });
    const list = await import("@/app/api/admin/industries/route");
    const item = await import("@/app/api/admin/industries/[id]/route");
    const body = industrySchema.parse({
      name: `Bakeries ${stamp}`,
      slug: `bakeries-${stamp}`,
      icon: "utensils",
      summary: "Leavening and acids.",
      productIds: [p.id],
      status: "PUBLISHED",
    });
    const res = await list.POST(req("POST", body));
    expect(res.status).toBe(201);
    const { id } = await res.json();

    const { getIndustriesForProduct, getIndustryPage } = await import("@/lib/content/data");
    expect((await getIndustriesForProduct(p.id)).map((i) => i.slug)).toContain(`bakeries-${stamp}`);
    expect((await getIndustryPage(`bakeries-${stamp}`)).products.map((x) => x.id)).toEqual([p.id]);

    expect((await item.PUT(req("PUT", { ...body, slug: `bakeries-moved-${stamp}` }), ctx(id))).status).toBe(
      200,
    );
    expect(
      (await db.redirect.findUnique({ where: { fromPath: `/industries/bakeries-${stamp}` } })).toPath,
    ).toBe(`/industries/bakeries-moved-${stamp}`);

    const ghost = await item.PUT(
      req("PUT", { ...body, slug: `bakeries-moved-${stamp}`, productIds: ["cm0000000000000000000abcd"] }),
      ctx(id),
    );
    expect(ghost.status).toBe(400);
  });
});

describe("insights admin", () => {
  it("publishes now, schedules for later (hidden until then) and sanitises the body", async () => {
    await as("EDITOR");
    const list = await import("@/app/api/admin/posts/route");
    const item = await import("@/app/api/admin/posts/[id]/route");
    const body = `<h2>Section</h2><p>${"word ".repeat(30)}</p><script>alert(1)</script><p onclick="x()">ok</p>`;
    const base = {
      title: `Post ${stamp}`,
      slug: `post-${stamp}`,
      excerpt: "Summary",
      body,
      category: "Quality",
    };

    const draft = await list.POST(req("POST", { ...base }));
    expect(draft.status).toBe(201);
    const { id } = await draft.json();
    const saved = await db.post.findUnique({ where: { id } });
    expect(saved.body).not.toMatch(/script|onclick/);
    expect(saved.publishedAt).toBeNull();

    const later = new Date(Date.now() + 3 * 86_400_000).toISOString();
    expect(
      (await item.PUT(req("PUT", { ...base, status: "PUBLISHED", publishAt: later }), ctx(id))).status,
    ).toBe(200);
    const { getPosts, getPost } = await import("@/lib/content/data");
    expect((await getPosts()).some((p) => p.id === id)).toBe(false);
    expect(await getPost(`post-${stamp}`)).toBeNull();
    const shape = await (await item.GET(req("GET"), ctx(id))).json();
    expect(shape.post.publishAt).toBe(later);
    expect(shape.live).toBe(false);

    expect(
      (await item.PUT(req("PUT", { ...base, status: "PUBLISHED", publishAt: "" }), ctx(id))).status,
    ).toBe(200);
    expect((await getPosts()).some((p) => p.id === id)).toBe(true);
    expect((await getPost(`post-${stamp}`)).title).toBe(`Post ${stamp}`);
  });

  it("a viewer cannot write articles", async () => {
    await as("VIEWER");
    const list = await import("@/app/api/admin/posts/route");
    expect((await list.POST(req("POST", { title: "x" }))).status).toBe(403);
  });
});

describe("newsletter", () => {
  beforeEach(() => {
    __resetMemoryLimits();
    clearMail();
  });
  const signup = (email) =>
    import("@/app/api/public/newsletter/route").then((m) =>
      m.POST(
        new Request(`${ORIGIN}/api/public/newsletter`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": "203.0.113.50" },
          body: JSON.stringify({ email, startedAt: Date.now() - 10_000 }),
        }),
      ),
    );
  const confirm = (token) =>
    import("@/app/api/public/newsletter/confirm/route").then((m) =>
      m.POST(
        new Request(`${ORIGIN}/api/public/newsletter/confirm`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: ORIGIN },
          body: JSON.stringify({ token }),
        }),
      ),
    );
  const openLink = (token) =>
    import("@/app/api/public/newsletter/confirm/route").then((m) =>
      m.GET(new Request(`${ORIGIN}/api/public/newsletter/confirm?token=${encodeURIComponent(token)}`)),
    );

  it("double opt-in: pending until the link is opened; the link works once", async () => {
    const email = `news-${stamp}@example.in`;
    const res = await signup(email);
    expect(res.status).toBe(200);
    expect((await db.newsletterSubscriber.findUnique({ where: { email } })).status).toBe("PENDING");
    await tick();
    const mail = sentMail().find((m) => m.tags.includes("newsletter-confirm"));
    const token = mail.text.match(/\/newsletter\/confirm#t=([A-Za-z0-9_-]+)/)[1];
    // Opening an old-style link (or a mail scanner opening it) changes nothing.
    const opened = await openLink(token);
    expect(opened.headers.get("location")).toBe(`${ORIGIN}/newsletter/confirm#t=${token}`);
    expect((await db.newsletterSubscriber.findUnique({ where: { email } })).status).toBe("PENDING");
    const first = await confirm(token);
    expect(await first.json()).toEqual({ ok: true, status: "ok" });
    expect((await db.newsletterSubscriber.findUnique({ where: { email } })).status).toBe("CONFIRMED");
    const again = await confirm(token);
    expect(await again.json()).toEqual({ ok: true, status: "invalid" });
  });

  it("answers the same for an address that is already subscribed and sends nothing", async () => {
    const email = `news-${stamp}@example.in`;
    const res = await signup(email);
    expect(await res.json()).toEqual({
      ok: true,
      message: "Check your inbox and click the link to confirm.",
    });
    await tick();
    expect(sentMail()).toHaveLength(0);
  });

  it("expired links do not confirm", async () => {
    const email = `expired-${stamp}@example.in`;
    await signup(email);
    await tick();
    const token = sentMail()[0].text.match(/\/newsletter\/confirm#t=([A-Za-z0-9_-]+)/)[1];
    await db.newsletterSubscriber.update({
      where: { email },
      data: { tokenExpiresAt: new Date(Date.now() - 1000) },
    });
    expect(await (await confirm(token)).json()).toEqual({ ok: true, status: "invalid" });
    expect((await confirm("short")).status).toBe(400);
    expect((await openLink("short")).headers.get("location")).toMatch(/status=invalid/);
  });
});
