import { beforeAll, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { SECTION_TYPES, SECTIONS } from "@/lib/sections/registry";
import { gallerySchema } from "@/lib/validation/gallery";
import { pageDraftSchema } from "@/lib/validation/pages";

import { COMPANY_PAGES } from "../../prisma/seed-pages.js";
import { makeUser } from "../helpers.js";

/** Phase 11: company page sections, seed copy, the [page] route and the gallery manager API. */

const cookieJar = { access: "" };
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({
    get: (name) => (name.endsWith("gi_at") ? { value: cookieJar.access } : undefined),
  }),
}));

async function as(role) {
  const { user } = await makeUser({ role });
  await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
  cookieJar.access = (await createSession(user)).accessToken;
  return user;
}

const ORIGIN = "http://localhost:3000";
const put = (body) =>
  new Request(`${ORIGIN}/api/admin/gallery`, {
    method: "PUT",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify(body),
  });

let n = 0;
async function asset(user, over = {}) {
  n += 1;
  return db.mediaAsset.create({
    data: {
      publicId: `gi_gal${Date.now()}${n}`,
      url: `/g${n}.jpg`,
      type: "IMAGE",
      format: "jpg",
      bytes: 10,
      width: 800,
      height: 600,
      alt: `Photo ${n}`,
      uploadedById: user.id,
      driver: "local",
      ...over,
    },
  });
}

describe("company section types", () => {
  it("registers the 14 company types next to the 14 home types", () => {
    for (const t of [
      "pageHero",
      "richText",
      "timeline",
      "factsTable",
      "visionMission",
      "valuesList",
      "proprietorMessage",
      "splitFeature",
      "brandList",
      "packaging",
      "iconCards",
      "contactBlock",
      "gallery",
      "openings",
    ]) {
      expect(SECTION_TYPES, t).toContain(t);
    }
    expect(SECTION_TYPES).toHaveLength(29); // + downloads (Phase 15)
  });

  it("rich text is sanitised on save: scripts, handlers and javascript: links are removed", () => {
    const body =
      '<p onclick="x()">Hi <a href="javascript:alert(1)">link</a></p><script>alert(1)</script><img src=x onerror=alert(1)>';
    const parsed = pageDraftSchema.parse({
      title: "About",
      seo: { title: "", description: "", noindex: false },
      sections: [{ type: "richText", isVisible: true, data: { ...SECTIONS.richText.defaults, body } }],
    });
    const out = parsed.sections[0].data.body;
    expect(out).toContain("Hi");
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i);
  });
});

describe("company page seed copy", () => {
  it("every seeded section passes its schema and no copy has placeholder text", () => {
    for (const page of COMPANY_PAGES) {
      for (const s of page.sections) {
        const r = SECTIONS[s.type].schema.safeParse(s.data);
        expect(r.success, `${page.slug}/${s.type}: ${r.error?.issues[0]?.message}`).toBe(true);
      }
      expect(JSON.stringify(page)).not.toMatch(/lorem|ipsum|TODO|\bTBD\b/i);
    }
  });

  it("covers about, why-us, quality and gallery (published) and careers (draft)", () => {
    const bySlug = Object.fromEntries(COMPANY_PAGES.map((p) => [p.slug, p.status]));
    expect(bySlug).toEqual({
      about: "PUBLISHED",
      "why-us": "PUBLISHED",
      quality: "PUBLISHED",
      gallery: "PUBLISHED",
      careers: "DRAFT",
      "chemical-supplier-delhi": "PUBLISHED", // location pages, Phase 31
      "chemical-supplier-delhi-ncr": "PUBLISHED",
    });
  });

  it("brand names come with the supplier disclaimer", () => {
    const brands = COMPANY_PAGES.find((p) => p.slug === "quality").sections.find(
      (s) => s.type === "brandList",
    );
    expect(brands.data.disclaimer).toMatch(/not their manufacturer/);
  });
});

describe("[page] route", () => {
  it("prerenders published pages only, never home or drafts", async () => {
    await db.page.upsert({
      where: { slug: "about" },
      update: { status: "PUBLISHED", deletedAt: null },
      create: { slug: "about", title: "About", status: "PUBLISHED" },
    });
    await db.page.upsert({
      where: { slug: "careers" },
      update: { status: "DRAFT" },
      create: { slug: "careers", title: "Careers", status: "DRAFT" },
    });
    const { publishedPageSlugs, PAGE_SLUG } = await import("@/lib/pages");
    const slugs = await publishedPageSlugs();
    expect(slugs.every((s) => PAGE_SLUG.test(s))).toBe(true);
    expect(PAGE_SLUG.test("../admin")).toBe(false);
    expect(PAGE_SLUG.test("About")).toBe(false);
    expect(slugs).toContain("about");
    expect(slugs).not.toContain("careers");
    expect(slugs).not.toContain("home");
  });
});

describe("gallery schema", () => {
  const id = "cm0000000000000000000abcd";
  it("needs a category, limits captions and refuses the same photo twice", () => {
    expect(gallerySchema.safeParse({ items: [{ mediaId: id, caption: "", category: "  " }] }).success).toBe(
      false,
    );
    expect(
      gallerySchema.safeParse({ items: [{ mediaId: id, caption: "x".repeat(141), category: "Stock" }] })
        .success,
    ).toBe(false);
    const dup = gallerySchema.safeParse({
      items: [
        { mediaId: id, category: "Stock" },
        { mediaId: id, category: "Stock" },
      ],
    });
    expect(dup.success).toBe(false);
    expect(dup.error.issues[0].path).toEqual(["items", 1, "mediaId"]);
    expect(gallerySchema.safeParse({ items: [{ mediaId: "../../etc", category: "Stock" }] }).success).toBe(
      false,
    );
    expect(gallerySchema.safeParse({ items: [{ mediaId: id, category: "Stock", extra: 1 }] }).success).toBe(
      false,
    );
  });

  it("tidies whitespace", () => {
    const r = gallerySchema.parse({
      items: [{ mediaId: id, caption: "  Drums   ready ", category: " Dispatch " }],
    });
    expect(r.items[0]).toEqual({
      mediaId: id,
      caption: "Drums ready",
      category: "Dispatch",
      isVisible: true,
    });
  });
});

describe("gallery API", () => {
  let editor;
  beforeAll(async () => {
    editor = await as("EDITOR");
  });

  it("saves photos in order with captions, categories and visibility; the public list hides hidden ones", async () => {
    const route = await import("@/app/api/admin/gallery/route");
    const [a, b, c] = [await asset(editor), await asset(editor), await asset(editor)];
    const res = await route.PUT(
      put({
        items: [
          { mediaId: b.id, caption: "Drums ready for dispatch", category: "Dispatch", isVisible: true },
          { mediaId: a.id, caption: "Racks", category: "Warehouse", isVisible: true },
          { mediaId: c.id, caption: "Old photo", category: "Warehouse", isVisible: false },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.map((i) => i.mediaId)).toEqual([b.id, a.id, c.id]);
    expect(body.items[0].media.url).toBe(b.url);

    const rows = await db.galleryItem.findMany({
      where: { isVisible: true, media: { deletedAt: null } },
      orderBy: { order: "asc" },
    });
    expect(rows.map((r) => r.mediaId)).toEqual([b.id, a.id]);

    const rev = await db.revision.findFirst({
      where: { entity: "gallery", entityId: "gallery" },
      orderBy: { createdAt: "desc" },
    });
    expect(rev.data.items).toHaveLength(3);
    const log = await db.auditLog.findFirst({ where: { action: "gallery.update" }, orderBy: { at: "desc" } });
    expect(log.actorId).toBe(editor.id);

    const get = await route.GET(new Request(`${ORIGIN}/api/admin/gallery`));
    expect((await get.json()).items).toHaveLength(3);
  });

  it("refuses PDFs, deleted files and images without alt text, naming the row", async () => {
    const route = await import("@/app/api/admin/gallery/route");
    const ok = await asset(editor);
    const pdf = await asset(editor, { type: "PDF", format: "pdf" });
    const gone = await asset(editor, { deletedAt: new Date() });
    const noAlt = await asset(editor, { alt: "" });
    for (const [bad, msg] of [
      [pdf, /Only images/],
      [gone, /deleted/],
      [noAlt, /alt text/],
    ]) {
      const res = await route.PUT(
        put({
          items: [
            { mediaId: ok.id, category: "Stock" },
            { mediaId: bad.id, category: "Stock" },
          ],
        }),
      );
      expect(res.status).toBe(400);
      expect((await res.json()).fields["items.1.mediaId"]).toMatch(msg);
    }
  });

  it("an empty list clears the gallery", async () => {
    const route = await import("@/app/api/admin/gallery/route");
    expect((await route.PUT(put({ items: [] }))).status).toBe(200);
    expect(await db.galleryItem.count()).toBe(0);
  });

  it("a viewer can look but not change", async () => {
    await as("VIEWER");
    const route = await import("@/app/api/admin/gallery/route");
    expect((await route.GET(new Request(`${ORIGIN}/api/admin/gallery`))).status).toBe(200);
    expect((await route.PUT(put({ items: [] }))).status).toBe(403);
  });

  it("refuses cross-site requests", async () => {
    await as("EDITOR");
    const route = await import("@/app/api/admin/gallery/route");
    const res = await route.PUT(
      new Request(`${ORIGIN}/api/admin/gallery`, {
        method: "PUT",
        headers: { "content-type": "application/json", origin: "https://evil.example" },
        body: '{"items":[]}',
      }),
    );
    expect(res.status).toBe(403);
  });
});
