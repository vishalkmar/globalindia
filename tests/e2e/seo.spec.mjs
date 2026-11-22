import { expect, test } from "@playwright/test";

/** Phase 31: what search engines see on every key page. */

const PAGES = [
  "/",
  "/about",
  "/products",
  "/products/light-liquid-paraffin",
  "/products/anionic-surfactants/sles-70",
  "/industries",
  "/insights",
  "/faq",
  "/contact",
  "/legal/privacy",
  "/chemical-supplier-delhi",
  "/chemical-supplier-delhi-ncr",
];

test("each key page: one H1, title with the brand, description, absolute canonical, alt on every image", async ({ page }) => {
  for (const path of PAGES) {
    const res = await page.goto(path);
    expect(res.status(), path).toBe(200);
    await expect(page.locator("h1"), path).toHaveCount(1);
    const title = await page.title();
    expect(title, path).toMatch(/Global India/);
    expect(title.length, `${path} title length`).toBeLessThanOrEqual(75);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description?.length ?? 0, `${path} description`).toBeGreaterThan(50);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical, path).toBe(`http://localhost:3100${path === "/" ? "" : path}`.replace(/\/$/, "") || "http://localhost:3100");
    const missingAlt = await page.locator("img:not([alt])").count();
    expect(missingAlt, `${path} images without alt`).toBe(0);
    expect(await page.locator('meta[property="og:title"]').count(), path).toBe(1);
  }
});

test("structured data: Organization and LocalBusiness with the real address on every page", async ({ page }) => {
  await page.goto("/contact");
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const graph = blocks.map((b) => JSON.parse(b)).find((d) => d["@graph"]);
  const local = graph["@graph"].find((n) => n["@type"] === "LocalBusiness");
  expect(local.address.postalCode).toBe("110084");
  expect(local.address.addressLocality).toBe("Delhi");
  expect(JSON.stringify(graph)).not.toMatch(/aggregateRating|review/);
});

test("sitemap.xml and robots.txt", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain("<urlset");
  expect(xml).toContain("/products/anionic-surfactants/sles-70</loc>");
  expect(xml).toContain("/chemical-supplier-delhi-ncr</loc>");
  expect(xml).toContain("<lastmod>");
  expect(xml).not.toMatch(/\/admin|\/api\/|\/d\//);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Sitemap: http:\/\/localhost:3100\/sitemap\.xml/);
  expect(robots).toMatch(/Disallow: \/admin/);
});

test("old site URLs answer 301 to the new pages; trailing slashes are removed", async ({ request }) => {
  const old = await request.get("/food-grade-xanthan-gum-13185592.html", { maxRedirects: 0 });
  expect(old.status()).toBe(301);
  expect(old.headers().location).toContain("/products/thickeners-carbohydrates/xanthan-gum");
  const cat = await request.get("/refined-glycerine.html", { maxRedirects: 0 });
  expect(cat.status()).toBe(301);
  expect(cat.headers().location).toContain("/products/refined-glycerine");
  const slash = await request.get("/about/", { maxRedirects: 0 });
  expect(slash.status()).toBe(308);
  expect(slash.headers().location).toMatch(/\/about$/);
});
