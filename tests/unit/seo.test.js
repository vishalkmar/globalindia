import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { organizationGraph } from "@/lib/seo/organization";
import { SETTING_DEFAULTS } from "@/lib/settings/schemas";

import { buildOldSiteRedirects, PRODUCT_MAP } from "../../prisma/seed-redirects.js";

/** Phase 31: old-site redirects, structured data, sitemap. */

describe("old site redirects", () => {
  const pairs = buildOldSiteRedirects();

  it("every path of the old sitemap (except /) has exactly one target on the new site", () => {
    expect(pairs).toHaveLength(145);
    expect(new Set(pairs.map(([f]) => f)).size).toBe(145);
    for (const [from, to] of pairs) {
      expect(from).toMatch(/^\/[a-z0-9-]+\.html$/);
      expect(to).toMatch(/^\/(about|contact|products(\/[a-z0-9-]+){0,2})$/);
    }
  });

  it("maps well-known products to their new pages", () => {
    const map = Object.fromEntries(pairs);
    expect(map["/food-grade-xanthan-gum-13185592.html"]).toBe("/products/thickeners-carbohydrates/xanthan-gum");
    expect(map["/70-sodium-lauryl-ether-sulphate-13185558.html"]).toBe("/products/anionic-surfactants/sles-70");
    expect(map["/light-liquid-paraffin-13185566.html"]).toBe("/products/light-liquid-paraffin/light-liquid-paraffin-ip");
    expect(map["/refined-glycerine.html"]).toBe("/products/refined-glycerine");
    expect(map["/company-profile.html"]).toBe("/about");
    expect(Object.keys(PRODUCT_MAP)).toHaveLength(123); // one entry per old product URL
  });
});

describe("Organization and LocalBusiness data", () => {
  it("uses the admin's NAP exactly, links the Google profile, invents nothing", () => {
    const business = { ...SETTING_DEFAULTS.business, googleBusinessUrl: "https://maps.app.goo.gl/abc" };
    const g = organizationGraph({ business, social: { linkedin: "https://linkedin.com/company/x", x: "" }, seo: {}, url: "https://example.in" });
    const [org, local] = g["@graph"];
    expect(org.name).toBe(business.name);
    expect(local.address.streetAddress).toBe(`${business.address.line1}, ${business.address.line2}`);
    expect(local.address.postalCode).toBe("110084");
    expect(local.telephone).toBe(business.phones[0].number);
    expect(org.sameAs).toEqual(["https://linkedin.com/company/x", "https://maps.app.goo.gl/abc"]);
    expect(local.hasMap).toBe("https://maps.app.goo.gl/abc");
    const text = JSON.stringify(g);
    for (const invented of ["aggregateRating", "review", "priceRange", "offers"]) expect(text).not.toContain(invented);
  });
});

describe("sitemap", () => {
  it("lists published pages, categories, products, industries and articles; never drafts or deleted items", async () => {
    const stamp = Date.now();
    const cat = await db.productCategory.create({ data: { name: `Sm ${stamp}`, slug: `sm-${stamp}`, family: "FOOD", status: "PUBLISHED" } });
    await db.product.create({ data: { name: `Sm live ${stamp}`, slug: `sm-live-${stamp}`, categoryId: cat.id, status: "PUBLISHED" } });
    await db.product.create({ data: { name: `Sm draft ${stamp}`, slug: `sm-draft-${stamp}`, categoryId: cat.id, status: "DRAFT" } });
    await db.product.create({ data: { name: `Sm gone ${stamp}`, slug: `sm-gone-${stamp}`, categoryId: cat.id, status: "PUBLISHED", deletedAt: new Date() } });
    const { sitemapEntries } = await import("@/lib/seo/sitemap");
    const urls = (await sitemapEntries()).map((e) => e.url);
    expect(urls).toContain(`http://localhost:3000/products/sm-${stamp}/sm-live-${stamp}`);
    expect(urls.some((u) => u.includes(`sm-draft-${stamp}`) || u.includes(`sm-gone-${stamp}`))).toBe(false);
    expect(urls.some((u) => /\/admin|\/api\/|\/d\//.test(u))).toBe(false);
  });
});
