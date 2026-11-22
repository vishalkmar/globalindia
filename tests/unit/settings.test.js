import { beforeAll, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { menuSchemaFor } from "@/lib/settings/menus";
import {
  analyticsSchema,
  businessSchema,
  normaliseSetting,
  safeHref,
  seoSchema,
  SETTING_DEFAULTS,
} from "@/lib/settings/schemas";
import { themeTokensSchema } from "@/lib/settings/theme";
import { themeToCss } from "@/lib/theme/css";
import { THEME_PRESETS } from "@/lib/theme/presets";

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
  new Request(`${ORIGIN}/api/admin/x`, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: body ? JSON.stringify(body) : undefined,
  });
const ctx = (params) => ({ params: Promise.resolve(params) });

describe("settings schemas", () => {
  it("accepts only safe links", () => {
    for (const ok of [
      "/contact#quote",
      "/products?family=food",
      "https://www.indiamart.com/global-india",
      "tel:+918071779152",
      "mailto:sales@globalindia.in",
      "",
    ]) {
      expect(safeHref.safeParse(ok).success, ok).toBe(true);
    }
    for (const bad of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "//evil.example",
      "http://plain-http.example",
      "data:text/html,<script>",
      "/\\evil.example",
      "vbscript:x",
    ]) {
      expect(safeHref.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("validates GSTIN, PIN and phone formats", () => {
    const base = SETTING_DEFAULTS.business;
    expect(businessSchema.safeParse(base).success).toBe(true);
    expect(businessSchema.safeParse({ ...base, gst: "07BMMPA5592C1Z" }).success).toBe(false);
    expect(businessSchema.safeParse({ ...base, address: { ...base.address, pin: "1100" } }).success).toBe(
      false,
    );
    expect(businessSchema.safeParse({ ...base, phones: [{ label: "x", number: "<script>" }] }).success).toBe(
      false,
    );
    expect(businessSchema.safeParse({ ...base, name: "<b>Global</b>" }).success).toBe(false);
    expect(businessSchema.safeParse({ ...base, evil: 1 }).success).toBe(false); // strict
  });

  it("analytics accepts IDs only, never script", () => {
    expect(analyticsSchema.safeParse({ ga4Id: "G-ABC123XYZ", clarityId: "" }).success).toBe(true);
    expect(analyticsSchema.safeParse({ ga4Id: "<script>alert(1)</script>", clarityId: "" }).success).toBe(
      false,
    );
    expect(analyticsSchema.safeParse({ ga4Id: "", clarityId: "abc');alert(1)//" }).success).toBe(false);
  });

  it("title template must keep %s", () => {
    expect(seoSchema.safeParse({ ...SETTING_DEFAULTS.seo, titleTemplate: "Global India" }).success).toBe(
      false,
    );
  });

  it("falls back to defaults when stored data is broken", () => {
    expect(normaliseSetting("topbar", { enabled: "yes please" })).toEqual(SETTING_DEFAULTS.topbar);
    expect(normaliseSetting("topbar", { message: "Open today" }).message).toBe("Open today");
  });

  it("menus: footer menus are one level, header allows sub-links", () => {
    const child = { label: "Child", href: "/c", newTab: false, isVisible: true };
    expect(
      menuSchemaFor("FOOTER_LEGAL").safeParse({
        items: [{ label: "Privacy", href: "/legal/privacy", children: [child] }],
      }).success,
    ).toBe(false);
    expect(
      menuSchemaFor("HEADER").safeParse({ items: [{ label: "About", href: "/about", children: [child] }] })
        .success,
    ).toBe(true);
    expect(
      menuSchemaFor("HEADER").safeParse({ items: [{ label: "X", href: "javascript:alert(1)" }] }).success,
    ).toBe(false);
  });

  it("theme tokens: presets valid, bad values refused", () => {
    for (const p of THEME_PRESETS) expect(themeTokensSchema.safeParse(p.tokens).success, p.name).toBe(true);
    const t = structuredClone(THEME_PRESETS[0].tokens);
    t.colors.light.primary = "red";
    expect(themeTokensSchema.safeParse(t).success).toBe(false);
    const f = structuredClone(THEME_PRESETS[0].tokens);
    f.fonts.display = "comic-sans";
    expect(themeTokensSchema.safeParse(f).success).toBe(false);
  });

  it("scoped CSS for previews and outline buttons", () => {
    const tokens = { ...THEME_PRESETS[1].tokens, buttonStyle: "outline" };
    const css = themeToCss(tokens, ".tp-abc");
    expect(css.startsWith(".tp-abc{")).toBe(true);
    expect(css).toContain('.tp-abc[data-theme="dark"]');
    expect(css).toContain('.tp-abc [data-btn="primary"]');
    expect(themeToCss(tokens, "body{} *")).toMatch(/^:root\{/); // bad scope ignored
  });
});

describe("settings API", () => {
  let route;
  beforeAll(async () => {
    route = await import("@/app/api/admin/settings/[key]/route");
  });

  it("EDITOR can change the header but not business details or analytics", async () => {
    await as("EDITOR");
    const header = { ...SETTING_DEFAULTS.header, ctaText: "Get today's price" };
    expect((await route.PUT(req("PUT", header), ctx({ key: "header" }))).status).toBe(200);
    expect((await route.PUT(req("PUT", SETTING_DEFAULTS.business), ctx({ key: "business" }))).status).toBe(
      403,
    );
    expect(
      (await route.PUT(req("PUT", { ga4Id: "G-ABCDEFG", clarityId: "" }), ctx({ key: "analytics" }))).status,
    ).toBe(403);
    expect((await route.GET(req("GET"), ctx({ key: "business" }))).status).toBe(200); // can read
  });

  it("SUPER_ADMIN saves business details; invalid data and unknown keys are refused", async () => {
    await as("SUPER_ADMIN");
    const value = {
      ...SETTING_DEFAULTS.business,
      emails: [{ label: "Sales", email: "sales@globalindia.in" }],
    };
    const ok = await route.PUT(req("PUT", value), ctx({ key: "business" }));
    expect(ok.status).toBe(200);
    expect((await db.siteSetting.findUnique({ where: { key: "business" } })).value.emails[0].email).toBe(
      "sales@globalindia.in",
    );
    expect(
      await db.revision.findFirst({ where: { entity: "settings", entityId: "business" } }),
    ).not.toBeNull();

    expect((await route.PUT(req("PUT", { ...value, gst: "nope" }), ctx({ key: "business" }))).status).toBe(
      400,
    );
    expect((await route.PUT(req("PUT", value), ctx({ key: "__proto__" }))).status).toBe(404);
    expect((await route.PUT(req("PUT", value), ctx({ key: "constructor" }))).status).toBe(404);
  });

  it("refuses a logo that has no alt text", async () => {
    const user = await as("EDITOR");
    const asset = await db.mediaAsset.create({
      data: {
        publicId: `gi_${"a".repeat(32)}`.slice(0, 35) + Date.now(),
        url: "/x.png",
        type: "IMAGE",
        format: "png",
        bytes: 10,
        alt: "",
        uploadedById: user.id,
        driver: "local",
      },
    });
    const res = await route.PUT(
      req("PUT", { ...SETTING_DEFAULTS.header, logoLightId: asset.id }),
      ctx({ key: "header" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/alt text/);
  });
});

describe("menus API", () => {
  it("saves order and nesting; refuses bad links", async () => {
    await as("EDITOR");
    const route = await import("@/app/api/admin/menus/[location]/route");
    const items = [
      { label: "Products", href: "/products", newTab: false, isVisible: true, children: [] },
      {
        label: "About",
        href: "/about",
        newTab: false,
        isVisible: false,
        children: [{ label: "Gallery", href: "/gallery", newTab: false, isVisible: true }],
      },
    ];
    const res = await route.PUT(req("PUT", { items }), ctx({ location: "HEADER" }));
    expect(res.status).toBe(200);
    const saved = (await res.json()).items;
    expect(saved.map((i) => i.label)).toEqual(["Products", "About"]);
    expect(saved[1]).toMatchObject({ isVisible: false, children: [{ label: "Gallery" }] });

    const bad = await route.PUT(
      req("PUT", {
        items: [{ label: "x", href: "javascript:alert(1)", newTab: false, isVisible: true, children: [] }],
      }),
      ctx({ location: "HEADER" }),
    );
    expect(bad.status).toBe(400);
    expect((await route.GET(req("GET"), ctx({ location: "NOPE" }))).status).toBe(404);
  });
});

describe("themes API", () => {
  let list, item, activate;
  beforeAll(async () => {
    list = await import("@/app/api/admin/themes/route");
    item = await import("@/app/api/admin/themes/[id]/route");
    activate = await import("@/app/api/admin/themes/[id]/activate/route");
    for (const p of THEME_PRESETS) {
      await db.theme.upsert({
        where: { slug: p.slug },
        update: {},
        create: { slug: p.slug, name: p.name, tokens: p.tokens, isPreset: true },
      });
    }
    const active = await db.theme.count({ where: { isActive: true } });
    if (!active) await db.theme.update({ where: { slug: "pine-brass" }, data: { isActive: true } });
  });

  it("EDITOR duplicates and edits a draft theme but cannot touch the live one or activate", async () => {
    await as("EDITOR");
    const live = await db.theme.findFirst({ where: { isActive: true } });
    const created = await list.POST(req("POST", { name: "Monsoon draft", fromId: live.id }));
    expect(created.status).toBe(201);
    const { theme } = await created.json();
    expect(theme.tokens).toEqual(live.tokens);

    const tokens = structuredClone(theme.tokens);
    tokens.colors.light.primary = "#123456";
    expect((await item.PATCH(req("PATCH", { tokens }), ctx({ id: theme.id }))).status).toBe(200);
    expect((await item.PATCH(req("PATCH", { tokens }), ctx({ id: live.id }))).status).toBe(403);
    expect((await activate.POST(req("POST", {}), ctx({ id: theme.id }))).status).toBe(403);
    expect(
      (
        await item.PATCH(
          req("PATCH", { tokens: { ...tokens, colors: { light: { primary: "x" } } } }),
          ctx({ id: theme.id }),
        )
      ).status,
    ).toBe(400);
  });

  it("SUPER_ADMIN activates: exactly one live theme, presets cannot be deleted", async () => {
    await as("SUPER_ADMIN");
    const navy = await db.theme.findUnique({ where: { slug: "navy-copper" } });
    expect((await activate.POST(req("POST", {}), ctx({ id: navy.id }))).status).toBe(200);
    const active = await db.theme.findMany({ where: { isActive: true } });
    expect(active.map((t) => t.slug)).toEqual(["navy-copper"]);
    expect(
      await db.auditLog.findFirst({ where: { action: "theme.activate", entityId: navy.id } }),
    ).not.toBeNull();

    expect((await item.DELETE(req("DELETE"), ctx({ id: navy.id }))).status).toBe(400); // active
    const pine = await db.theme.findUnique({ where: { slug: "pine-brass" } });
    expect((await item.DELETE(req("DELETE"), ctx({ id: pine.id }))).status).toBe(400); // preset

    expect((await activate.POST(req("POST", {}), ctx({ id: pine.id }))).status).toBe(200); // restore default
  });
});
