import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { codeFrom, waitForMail } from "./helpers.mjs";

/** Phase 10: home page sections, and editing them through draft -> preview -> publish. */

const db = new PrismaClient();
const stamp = Date.now();
const email = `e2e-home-${stamp}@test.local`;
const PASSWORD = `Home-Test-${stamp}`;
const SHOTS = process.env.SHOT_DIR;

test.beforeAll(async () => {
  await db.adminUser.create({ data: { email, name: "Home Editor", role: "EDITOR", passwordHash: await hash(PASSWORD, ARGON2_OPTIONS), mfaSetupAt: new Date() } });
});
test.afterAll(async () => {
  await db.adminUser.deleteMany({ where: { email } });
  await db.$disconnect();
});

async function signIn(page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  const since = Date.now() - 1000;
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/admin\/verify/);
  await page.getByLabel("6-digit code").fill(codeFrom(await waitForMail({ to: email, tag: "otp-login", since })));
  await page.waitForURL((u) => u.pathname === "/admin");
}

test("visitor sees every home section with real copy and structured data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Raw materials for food, cosmetics and cleaning products");
  await expect(page.getByTestId("trust-facts")).toContainText("Supplying since");
  for (const h of ["Six families of raw materials, one order desk.", "Who buys from us.", "Four things we hold to on every order.", "How an order works.", "Asked before almost every first order."]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /Food Ingredients & Additives/ }).first()).toHaveAttribute("href", "/products?family=food");
  await expect(page.getByText(`${new Date().getFullYear() - 2002}`, { exact: true }).first()).toBeVisible(); // years in the trade, computed
  const faq = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)).find((j) => j["@type"] === "FAQPage"));
  expect(faq.mainEntity).toHaveLength(6);
  expect(await page.locator("h1").count()).toBe(1);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-final-1280.png`, fullPage: true });
});

test("no horizontal scroll at 360, 768, 1280 and 1536 px", async ({ page }) => {
  for (const width of [360, 768, 1280, 1536]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw, `width ${width}`).toBeLessThanOrEqual(width);
  }
});

test("no layout shift while the home page loads", async ({ page }) => {
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.02);
});

test("editor: draft is private, preview shows it, publish makes it live", async ({ page, browser }) => {
  await signIn(page);
  const home = await db.page.findUnique({ where: { slug: "home" } });
  const original = (await (await page.request.get(`/api/admin/pages/${home.id}`)).json()).page.content;

  await page.goto("/admin/pages");
  await page.getByRole("link", { name: /Home/ }).click();
  await page.getByRole("button", { name: "Edit Hero" }).click();
  const drawer = page.getByRole("dialog", { name: "Edit: Hero" });
  const title = `Chemicals for makers, sent from Delhi ${stamp}`;
  await drawer.getByLabel(/Main title/).fill(title);
  await drawer.getByRole("button", { name: "Apply changes" }).click();
  await page.getByRole("button", { name: "Hide FAQ" }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved. Visitors still see the published page.")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/page-editor-1280.png`, fullPage: true });

  // Visitor: still the published page
  const visitorCtx = await browser.newContext();
  const visitor = await visitorCtx.newPage();
  await visitor.goto("/");
  await expect(visitor.getByRole("heading", { level: 1 })).not.toContainText(title);

  // Preview in a new tab: draft + banner
  const [previewTab] = await Promise.all([page.context().waitForEvent("page"), page.getByRole("button", { name: "Preview" }).click()]);
  await previewTab.waitForLoadState();
  await expect(previewTab.getByTestId("preview-banner")).toContainText("Preview of unpublished changes");
  await expect(previewTab.getByRole("heading", { level: 1 })).toContainText(title);
  await expect(previewTab.getByRole("heading", { name: "Asked before almost every first order." })).toHaveCount(0);
  await previewTab.getByRole("button", { name: "Exit preview" }).click();
  await expect(previewTab.getByTestId("preview-banner")).toHaveCount(0);
  await previewTab.close();

  // A leaked preview cookie alone shows nothing: visitor with draft mode but no admin session
  const leaked = (await page.context().cookies()).find((c) => c.name === "__prerender_bypass");
  if (leaked) {
    await visitorCtx.addCookies([{ ...leaked }]);
    await visitor.goto("/");
    await expect(visitor.getByRole("heading", { level: 1 })).not.toContainText(title);
  }

  // Publish
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published. The page is live.")).toBeVisible();
  await visitor.goto("/");
  await expect(visitor.getByRole("heading", { level: 1 })).toContainText(title);
  await expect(visitor.getByRole("heading", { name: "Asked before almost every first order." })).toHaveCount(0);

  // Put the original content back the same way an editor would (draft + publish)
  expect((await page.request.put(`/api/admin/pages/${home.id}`, { data: original, headers: { origin: "http://localhost:3100" } })).ok()).toBe(true);
  expect((await page.request.post(`/api/admin/pages/${home.id}/publish`, { data: {}, headers: { origin: "http://localhost:3100" } })).ok()).toBe(true);
  await visitor.goto("/");
  await expect(visitor.getByRole("heading", { level: 1 })).toContainText("Raw materials for food, cosmetics and cleaning products");
  await visitorCtx.close();
});
