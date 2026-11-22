import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { signInWithOtp } from "./helpers.mjs";

/** Phase 13: product detail ("buyer's guide") page, its structured data, redirects and admin-written content. */

const db = new PrismaClient();
const stamp = Date.now().toString(36);
const SHOTS = process.env.SHOT_DIR;
const editor = { email: `e2e-pp-editor-${stamp}@test.local`, password: `Product-Page-${stamp}` };
let saved = null;

test.beforeAll(async () => {
  await db.adminUser.create({
    data: {
      email: editor.email,
      name: `Editor ${stamp}`,
      role: "EDITOR",
      passwordHash: await hash(editor.password, ARGON2_OPTIONS),
      mfaSetupAt: new Date(),
    },
  });
  saved = await db.product.findUnique({
    where: { slug: "caustic-soda-flakes" },
    select: { id: true, content: true },
  });
});

test.afterAll(async () => {
  // Restore the template product exactly as it was.
  if (saved)
    await db.product.update({ where: { id: saved.id }, data: { content: saved.content ?? undefined } });
  await db.$disconnect();
});

test("hero product page: every buyer's-guide section, sticky nav, FAQ and product data", async ({ page }) => {
  await page.goto("/products/anionic-surfactants/sles-70");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("SLES 70%");
  await expect(
    page.getByRole("heading", { level: 2, name: "SLES 70% Supplier in Delhi, India" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Request quotation/ }).first()).toHaveAttribute(
    "href",
    "/contact?product=sles-70#quote",
  );

  const facts = page.getByTestId("fact-strip");
  await expect(facts).toContainText("68585-34-2");
  await expect(facts).toContainText("50 kg");

  const nav = page.getByRole("navigation", { name: "On this page" });
  for (const label of [
    "Overview",
    "Sourcing",
    "Applications",
    "Specifications",
    "Questions to ask",
    "Packaging & storage",
    "Documents",
    "Supply & price",
    "FAQs",
  ]) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }
  for (const h of [
    "What is SLES 70%?",
    "Where it comes from.",
    "What SLES 70% is used for.",
    "Typical specification.",
    "Questions to ask any supplier.",
    "Packs, minimum order and dispatch.",
    "COA, SDS and technical data.",
    "What decides the price.",
  ]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  await expect(page.getByText(/ethoxylation/)).toBeVisible(); // written hero content, not the template
  await expect(page.getByRole("region", { name: "SLES 70% applications by industry" })).toContainText(
    "Car wash shampoos",
  );
  await expect(page.getByText(/Specifications are indicative/).first()).toBeVisible();

  await nav.getByRole("link", { name: "Documents" }).click();
  await expect(page).toHaveURL(/#documents$/);
  await expect(nav.getByRole("link", { name: "Documents" })).toHaveAttribute("aria-current", "true");
  await expect(
    page.getByTestId("documents").getByRole("link", { name: /Certificate of Analysis/ }),
  ).toHaveAttribute("href", "/contact?product=sles-70&doc=COA#quote");

  await page.getByText("How do I dilute SLES 70% without lumps?").click();
  await expect(page.getByText(/never water onto paste/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Buyers also ask about." })).toBeVisible();

  // Structured data: Product with an Offer, and no invented price
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const product = blocks.map((b) => JSON.parse(b)).find((d) => d["@type"] === "Product");
  expect(product.name).toBe("SLES 70%");
  expect(product.offers["@type"]).toBe("Offer");
  expect(product.offers.price).toBeUndefined();
  expect(product.additionalProperty.find((p) => p.name === "CAS number").value).toBe("68585-34-2");
  expect(blocks.some((b) => b.includes('"FAQPage"'))).toBe(true);
  await expect(page).toHaveTitle(/SLES 70% Supplier in Delhi, India/);
});

test("wrong category in the URL redirects; unknown products are a real 404", async ({ request, page }) => {
  const wrong = await request.get("/products/light-liquid-paraffin/sles-70", { maxRedirects: 0 });
  expect([301, 307, 308]).toContain(wrong.status());
  expect(wrong.headers().location).toContain("/products/anionic-surfactants/sles-70");
  expect((await request.get("/products/anionic-surfactants/no-such-product")).status()).toBe(404);
  await page.goto("/products/light-liquid-paraffin/sles-70");
  await expect(page).toHaveURL(/\/products\/anionic-surfactants\/sles-70$/);
});

test("mobile: the long template page has no sideways scroll and tables stack into cards", async ({
  browser,
}) => {
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await page.goto("/products/alkalis/caustic-soda-flakes");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Caustic Soda Flakes");
  await expect(page.getByText(/We do not manufacture Caustic Soda Flakes/)).toBeVisible(); // template text from data
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  const firstWhy = page.getByRole("region", { name: "Questions to ask the supplier" }).locator("td").first();
  expect(await firstWhy.evaluate((el) => getComputedStyle(el).display)).toBe("block");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p13-template-360.png`, fullPage: true });
  await page.close();
});

test("content written in the admin replaces the template on the live page", async ({ page }) => {
  test.setTimeout(120_000);
  await signInWithOtp(page, editor.email, editor.password);
  await page.goto(`/admin/products/${saved.id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Caustic Soda Flakes" })).toBeVisible();
  const text = `Caustic soda flakes are sold by weight in moisture-proof bags (${stamp}).`;
  await page.getByLabel("What is it?").fill(text);
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Product saved.")).toBeVisible();
  await page.goto("/products/alkalis/caustic-soda-flakes");
  await expect(page.getByText(text)).toBeVisible();
});
