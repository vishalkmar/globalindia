import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { png, signInWithOtp } from "./helpers.mjs";

/** Phase 11: About, Why Us, Quality, Gallery (+ admin gallery manager), Careers as a draft, real 404s. */

const db = new PrismaClient();
const stamp = Date.now();
const email = `e2e-gallery-${stamp}@test.local`;
const PASSWORD = `Gallery-Test-${stamp}`;
const SHOTS = process.env.SHOT_DIR;

let savedGallery = [];
test.beforeAll(async () => {
  savedGallery = await db.galleryItem.findMany({ orderBy: { order: "asc" } });
  await db.adminUser.create({ data: { email, name: "Gallery Editor", role: "EDITOR", passwordHash: await hash(PASSWORD, ARGON2_OPTIONS), mfaSetupAt: new Date() } });
});
test.afterAll(async () => {
  // Put the gallery back the way it was and retire the test uploads.
  await db.galleryItem.deleteMany({});
  if (savedGallery.length) await db.galleryItem.createMany({ data: savedGallery });
  await db.mediaAsset.updateMany({ where: { uploadedBy: { email } }, data: { deletedAt: new Date() } });
  await db.$disconnect();
});

test("about page tells the story with timeline, facts and the proprietor's note", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/same promise since 2002/);
  await expect(page).toHaveTitle(/About Global India/);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByText("About us")).toBeVisible();
  for (const h of ["How the business grew.", "Key facts.", "How we work, in plain words.", "Why we still answer the phone ourselves."]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  await expect(page.getByText("07BMMPA5592C1Z4").first()).toBeVisible();
  await expect(page.getByText("Akash Rathod").first()).toBeVisible();
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).toMatch(/\/about$/);
});

test("why us and quality pages render their sections; FAQ opens", async ({ page }) => {
  await page.goto("/why-us");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/one person to call/);
  await expect(page.getByRole("heading", { name: "What you can expect on every order." })).toBeVisible();

  await page.goto("/quality");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/paperwork travels with the material/);
  await expect(page.getByRole("heading", { name: "Certificate of Analysis" })).toBeVisible();
  await expect(page.getByText("Godrej", { exact: true })).toBeVisible();
  await expect(page.getByText(/not their manufacturer/)).toBeVisible();
  const q = page.getByText("Can I get the COA before I place the order?");
  await q.click();
  await expect(page.getByText(/share a recent COA with the quote/)).toBeVisible();
});

test("draft pages and unknown slugs return a real 404 status", async ({ request }) => {
  expect((await request.get("/careers")).status()).toBe(404);
  expect((await request.get(`/no-such-page-${stamp}`)).status()).toBe(404);
  expect((await request.get("/home")).status()).toBe(404);
  expect((await request.get("/Bad_Slug")).status()).toBe(404);
});

test("gallery: editor adds photos with categories, visitors filter and open them", async ({ page }) => {
  test.setTimeout(120_000);
  await signInWithOtp(page, email, PASSWORD);
  await page.getByRole("navigation", { name: "Admin" }).first().getByRole("link", { name: "Gallery" }).click();
  await expect(page.getByRole("heading", { name: "Gallery", level: 1 })).toBeVisible();

  const photos = [
    { file: "drums.png", alt: "Blue 200 L drums lined up for dispatch", caption: "Drums ready for dispatch", category: "Dispatch", rgb: [15, 59, 58] },
    { file: "racks.png", alt: "Bags of soda ash on warehouse racks", caption: "Soda ash on the racks", category: "Warehouse", rgb: [185, 133, 47] },
  ];
  for (const p of photos) {
    await page.getByRole("button", { name: "Choose image" }).click();
    const dialog = page.getByRole("dialog", { name: "Choose an image" });
    await dialog.getByTestId("media-file-input").setInputFiles({ name: p.file, mimeType: "image/png", buffer: png(1200, 900, p.rgb) });
    await dialog.getByLabel("Alt text (required)").fill(p.alt);
    await dialog.getByRole("button", { name: "Use this file" }).click();
    await expect(dialog).toBeHidden();
    await page.getByLabel(`Caption for ${p.alt}`).fill(p.caption);
    await page.getByLabel(`Category for ${p.alt}`).fill(p.category);
  }
  await expect(page.getByTestId("gallery-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Save gallery" }).click();
  await expect(page.getByText("Gallery saved.")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p11-admin-gallery-1280.png`, fullPage: true });

  await page.goto("/gallery");
  const filters = page.getByRole("group", { name: "Filter photos" });
  await expect(filters.getByRole("button")).toHaveText(["All", "Dispatch", "Warehouse"]);
  const grid = page.getByRole("list", { name: "Photos" });
  await expect(grid.getByRole("listitem")).toHaveCount(2);
  await filters.getByRole("button", { name: "Warehouse" }).click();
  await expect(filters.getByRole("button", { name: "Warehouse" })).toHaveAttribute("aria-pressed", "true");
  await expect(grid.getByRole("listitem")).toHaveCount(1);
  await expect(grid).toContainText("Soda ash on the racks");

  await filters.getByRole("button", { name: "All" }).click();
  await grid.getByRole("button").first().click();
  const viewer = page.getByRole("dialog", { name: "Drums ready for dispatch" });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText("1 / 2")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Soda ash on the racks" })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p11-gallery-viewer-1280.png` });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Soda ash on the racks" })).toBeHidden();

  // Hiding a photo in the admin removes it from the public page straight away.
  await page.goto("/admin/gallery");
  await page.getByRole("button", { name: "Hide Soda ash on the racks" }).click();
  await page.getByRole("button", { name: "Save gallery" }).click();
  await expect(page.getByText("Gallery saved.")).toBeVisible();
  await page.goto("/gallery");
  await expect(page.getByRole("list", { name: "Photos" }).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("group", { name: "Filter photos" })).toHaveCount(0);
});
