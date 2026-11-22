import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { putSetting, signInWithOtp } from "./helpers.mjs";

/** Phase 9: public top bar, header, mega menu, search, footer, consent, 404 — in a real browser. */

const db = new PrismaClient();
const stamp = Date.now();

/**
 * Pages linked from the default menus that later phases build. The link check below fails for any
 * internal link that is neither working nor listed here — remove entries as the pages ship.
 */
const PLANNED = {
  "/products": 12,
  "/industries": 15,
  "/insights": 15,
  "/contact": 14,
  "/legal/privacy": 15,
  "/legal/terms": 15,
  "/legal/cookies": 15,
};
const plannedFor = (path) => PLANNED[path] ?? (path.startsWith("/products/") ? 12 : null);

const ownerEmail = `e2e-layout-owner-${stamp}@test.local`;
const ownerPassword = `Layout-Owner-${stamp}`;
test.beforeAll(async () => {
  await db.adminUser.create({
    data: { email: ownerEmail, name: "Layout Owner", role: "SUPER_ADMIN", passwordHash: await hash(ownerPassword, ARGON2_OPTIONS), mfaSetupAt: new Date() },
  });
  const cat = await db.productCategory.create({ data: { slug: `e2e-paraffin-${stamp}`, name: `E2E Paraffin ${stamp}`, family: "PARAFFINS_OILS_GLYCOLS" } });
  await db.product.create({ data: { slug: `e2e-llp-${stamp}`, name: `Light Liquid Paraffin E2E ${stamp}`, casNo: "8012-95-1", categoryId: cat.id, status: "PUBLISHED" } });
});
test.afterAll(async () => {
  await db.product.deleteMany({ where: { slug: `e2e-llp-${stamp}` } });
  await db.productCategory.deleteMany({ where: { slug: `e2e-paraffin-${stamp}` } });
  await db.adminUser.deleteMany({ where: { email: ownerEmail } });
  await db.$disconnect();
});

test("top bar, header and footer show the admin data", async ({ page }) => {
  await page.goto("/");
  const business = (await db.siteSetting.findUnique({ where: { key: "business" } })).value;
  await expect(page.getByTestId("topbar").getByRole("link", { name: business.phones[0].number })).toHaveAttribute("href", /^tel:\+?\d+$/);
  await expect(page.getByTestId("site-footer").getByText(`GSTIN ${business.gst}`)).toBeVisible();
  await expect(page.getByTestId("site-footer").getByText(new RegExp(`© ${new Date().getFullYear()}`))).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
});

test("mega menu and dropdowns work with keyboard and mouse", async ({ page }) => {
  await page.goto("/");
  const products = page.getByRole("button", { name: "Products", exact: true });
  await products.focus();
  await page.keyboard.press("Enter");
  await expect(products).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("mega-menu")).toBeVisible();
  await expect(page.getByTestId("mega-menu").getByRole("link", { name: "Food Ingredients & Additives" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("mega-menu")).toHaveCount(0);
  await expect(products).toBeFocused();

  await page.getByRole("button", { name: "About", exact: true }).hover();
  await expect(page.getByRole("link", { name: "Company profile" })).toBeVisible();
  await page.mouse.move(5, 600);
  await expect(page.getByRole("link", { name: "Company profile" })).toHaveCount(0);
});

test("header sticks and shrinks after 120 px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/this-page-does-not-exist"); // a long page
  const header = page.getByTestId("site-header");
  await expect(header).not.toHaveAttribute("data-scrolled", "true");
  await page.mouse.wheel(0, 600);
  await expect(header).toHaveAttribute("data-scrolled", "true");
  await expect.poll(async () => (await header.boundingBox()).height).toBeLessThanOrEqual(70); // after the 200 ms shrink
  expect(Math.round((await header.boundingBox()).y)).toBe(0);
});

test("search finds products by name and CAS, opens with Ctrl+K", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" }); // shortcuts work once the page is interactive
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search products" });
  await expect(dialog).toBeVisible({ timeout: 45_000 }); // first open downloads the lazy search chunk (dev compiles it on demand)
  await dialog.getByRole("combobox").fill(`${stamp}`);
  await expect(dialog.getByRole("option", { name: new RegExp(`Light Liquid Paraffin E2E ${stamp}`) })).toBeVisible();
  await dialog.getByRole("combobox").fill("zzzz-no-such-chemical");
  await expect(dialog.getByText(/Nothing found for/)).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Ask for/ })).toHaveAttribute("href", /\/contact\?product=/);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("skip link moves focus to the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});

test("unknown pages return 404 with search and product families", async ({ page }) => {
  const res = await page.goto("/no-such-page-here");
  expect(res.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page is not here." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Popular product families" })).toBeVisible();
  await page.getByRole("button", { name: /Search products, CAS number/ }).click();
  await expect(page.getByRole("dialog", { name: "Search products" })).toBeVisible({ timeout: 45_000 });
});

test("mobile: drawer with accordion and floating call button", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await expect(page.getByTestId("floating-contact").getByRole("link", { name: /^Call/ })).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Menu" });
  await drawer.getByRole("button", { name: "About", exact: true }).click();
  await expect(drawer.getByRole("link", { name: "Company profile" })).toBeVisible();
  await drawer.getByRole("button", { name: "Products", exact: true }).click();
  await expect(drawer.getByRole("link", { name: "Paraffins, Oils & Glycols" })).toBeVisible();
  await ctx.close();
});

test("cookie banner: necessary only by default, analytics only after consent", async ({ browser }) => {
  // Turn analytics on through the admin API, exactly like the owner would (expires the cache).
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await signInWithOtp(admin, ownerEmail, ownerPassword);
  const original = (await (await admin.request.get("/api/admin/settings/analytics")).json()).value;
  await putSetting(admin, "analytics", { ga4Id: "G-E2ETEST01", clarityId: "" });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const gtagRequests = [];
  await page.route("https://www.googletagmanager.com/**", (r) => {
    gtagRequests.push(r.request().url());
    return r.fulfill({ status: 204, body: "" });
  });
  await page.goto("/");
  const banner = page.getByTestId("cookie-consent");
  await expect(banner).toBeVisible();
  expect(gtagRequests).toHaveLength(0);

  await banner.getByRole("button", { name: "Necessary only" }).click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(page.getByTestId("cookie-consent")).toHaveCount(0);
  expect(gtagRequests).toHaveLength(0);
  expect((await ctx.cookies()).find((c) => c.name.endsWith("gi_consent"))?.value).toBe("v1.denied");

  await page.getByRole("button", { name: "Cookie settings" }).click();
  await page.getByTestId("cookie-consent").getByRole("button", { name: "Allow analytics" }).click();
  await expect.poll(() => gtagRequests.length).toBeGreaterThan(0);
  expect(gtagRequests[0]).toContain("id=G-E2ETEST01");
  await ctx.close();

  await putSetting(admin, "analytics", original);
  await adminCtx.close();
});

test("every header, mega menu and footer link works or is scheduled for a later phase", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.$$eval('header a[href], footer a[href], [data-testid="topbar"] a[href]', (as) => as.map((a) => a.getAttribute("href")));
  await page.getByRole("button", { name: "Products", exact: true }).click();
  hrefs.push(...(await page.$$eval('[data-testid="mega-menu"] a[href]', (as) => as.map((a) => a.getAttribute("href")))));
  const internal = [...new Set(hrefs.filter((h) => h.startsWith("/")).map((h) => h.split(/[?#]/)[0]))];
  const broken = [];
  const scheduled = [];
  for (const path of internal) {
    const res = await request.get(path);
    if (res.ok()) continue;
    const phase = plannedFor(path);
    if (res.status() === 404 && phase) scheduled.push(`${path} (phase ${phase})`);
    else broken.push(`${path} -> ${res.status()}`);
  }
  console.log(`Links waiting for later phases: ${scheduled.join(", ") || "none"}`);
  expect(broken).toEqual([]);
});
