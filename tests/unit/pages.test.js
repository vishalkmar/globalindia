import { beforeAll, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getPreviewPage, getPublishedPage } from "@/lib/pages";
import { HOME_LAYOUT, normaliseSection, parseSection, SECTIONS } from "@/lib/sections/registry";
import { pageDraftSchema } from "@/lib/validation/pages";

import { makeUser } from "../helpers.js";

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
const req = (method, body) =>
  new Request(`${ORIGIN}/api/admin/pages/x`, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: body ? JSON.stringify(body) : undefined,
  });
const draftOf = (sections) => ({
  title: "Home",
  seo: { title: "", description: "", noindex: false },
  sections,
});

describe("section registry", () => {
  it("every section's default copy passes its own schema", () => {
    for (const [type, def] of Object.entries(SECTIONS))
      expect(def.schema.safeParse(def.defaults).success, type).toBe(true);
  });

  it("the home layout uses only registered types and covers the 14 home sections", () => {
    expect(HOME_LAYOUT.every((t) => Object.hasOwn(SECTIONS, t))).toBe(true);
    expect(HOME_LAYOUT).toHaveLength(14);
  });

  it("refuses unsafe links, markup and unknown icons", () => {
    const hero = structuredClone(SECTIONS.hero.defaults);
    hero.primaryCta.href = "javascript:alert(1)";
    expect(parseSection("hero", hero).success).toBe(false);
    const triad = structuredClone(SECTIONS.featureTriad.defaults);
    triad.items[0].title = "<img src=x onerror=alert(1)>";
    expect(parseSection("featureTriad", triad).success).toBe(false);
    triad.items[0].title = "Fine";
    triad.items[0].icon = "skull";
    expect(parseSection("featureTriad", triad).success).toBe(false);
    expect(parseSection("doesNotExist", {}).success).toBe(false);
    expect(parseSection("__proto__", {}).success).toBe(false);
  });

  it("broken stored data falls back to the defaults", () => {
    expect(normaliseSection("faq", { items: "nope" })).toEqual(SECTIONS.faq.defaults);
  });

  it("page drafts: max 30 sections, valid types only, errors point at the field", () => {
    const one = { type: "faq", isVisible: true, data: SECTIONS.faq.defaults };
    expect(pageDraftSchema.safeParse(draftOf(Array.from({ length: 31 }, () => one))).success).toBe(false);
    expect(pageDraftSchema.safeParse(draftOf([{ ...one, type: "script" }])).success).toBe(false);
    const bad = pageDraftSchema.safeParse(
      draftOf([{ ...one, data: { ...SECTIONS.faq.defaults, items: [{ q: "", a: "x" }] } }]),
    );
    expect(bad.success).toBe(false);
    expect(bad.error.issues[0].path.join(".")).toBe("sections.0.data.items.0.q");
  });
});

describe("pages API: draft, preview, publish", () => {
  let page;
  let item, publish, discard;
  beforeAll(async () => {
    item = await import("@/app/api/admin/pages/[id]/route");
    publish = await import("@/app/api/admin/pages/[id]/publish/route");
    discard = await import("@/app/api/admin/pages/[id]/discard/route");
    page = await db.page.create({
      data: {
        slug: `home-test-${Date.now()}`,
        title: "Home",
        status: "PUBLISHED",
        publishedAt: new Date(),
        sections: { create: [{ type: "hero", order: 0, data: SECTIONS.hero.defaults }] },
      },
    });
  });
  const ctx = () => ({ params: Promise.resolve({ id: page.id }) });

  it("saving a draft does not change the live page; preview shows the draft", async () => {
    await as("EDITOR");
    const hero = { ...SECTIONS.hero.defaults, title: "Draft title for testing" };
    const res = await item.PUT(
      req(
        "PUT",
        draftOf([
          { type: "hero", isVisible: true, data: hero },
          { type: "faq", isVisible: true, data: SECTIONS.faq.defaults },
        ]),
      ),
      ctx(),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).page.hasDraft).toBe(true);

    const live = await getPublishedPage(page.slug);
    expect(live.sections).toHaveLength(1);
    expect(live.sections[0].data.title).toBe(SECTIONS.hero.defaults.title);

    const preview = await getPreviewPage(page.slug);
    expect(preview.isDraft).toBe(true);
    expect(preview.sections.map((s) => s.type)).toEqual(["hero", "faq"]);
    expect(preview.sections[0].data.title).toBe("Draft title for testing");
  });

  it("publishing replaces the live sections, stores a revision and clears the draft", async () => {
    await as("EDITOR");
    const res = await publish.POST(req("POST", {}), ctx());
    expect(res.status).toBe(200);
    const live = await getPublishedPage(page.slug);
    expect(live.sections.map((s) => s.type)).toEqual(["hero", "faq"]);
    expect(live.sections[0].data.title).toBe("Draft title for testing");
    const row = await db.page.findUnique({ where: { id: page.id } });
    expect(row.draftData).toBeNull();
    expect(await db.revision.count({ where: { entity: "page", entityId: page.id } })).toBe(1);
    expect((await publish.POST(req("POST", {}), ctx())).status).toBe(400); // nothing left to publish
  });

  it("hidden sections are saved but not rendered", async () => {
    await as("EDITOR");
    await item.PUT(
      req(
        "PUT",
        draftOf([
          { type: "hero", isVisible: false, data: SECTIONS.hero.defaults },
          { type: "faq", isVisible: true, data: SECTIONS.faq.defaults },
        ]),
      ),
      ctx(),
    );
    await publish.POST(req("POST", {}), ctx());
    const live = await getPublishedPage(page.slug);
    expect(live.sections.map((s) => s.type)).toEqual(["faq"]);
    expect(await db.section.count({ where: { pageId: page.id } })).toBe(2);
  });

  it("discard throws away the draft", async () => {
    await as("EDITOR");
    await item.PUT(
      req("PUT", draftOf([{ type: "ctaBand", isVisible: true, data: SECTIONS.ctaBand.defaults }])),
      ctx(),
    );
    const res = await discard.POST(req("POST", {}), ctx());
    expect((await res.json()).page.hasDraft).toBe(false);
  });

  it("refuses images without alt text and invalid section data", async () => {
    const user = await as("EDITOR");
    const asset = await db.mediaAsset.create({
      data: {
        publicId: `gi_${Date.now()}nopealt`,
        url: "/x.png",
        type: "IMAGE",
        format: "png",
        bytes: 10,
        alt: "",
        uploadedById: user.id,
        driver: "local",
      },
    });
    const noAlt = await item.PUT(
      req(
        "PUT",
        draftOf([{ type: "hero", isVisible: true, data: { ...SECTIONS.hero.defaults, imageId: asset.id } }]),
      ),
      ctx(),
    );
    expect(noAlt.status).toBe(400);
    const badLink = await item.PUT(
      req(
        "PUT",
        draftOf([
          {
            type: "ctaBand",
            isVisible: true,
            data: { ...SECTIONS.ctaBand.defaults, cta: { text: "x", href: "javascript:alert(1)" } },
          },
        ]),
      ),
      ctx(),
    );
    expect(badLink.status).toBe(400);
  });
});
