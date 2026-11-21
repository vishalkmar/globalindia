import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { codeFrom, waitForMail } from "./helpers.mjs";

/** Phase 8 todo 20: theme and settings changes reach the live site without a redeploy. */

const db = new PrismaClient();
const stamp = Date.now();
const email = `e2e-owner-${stamp}@test.local`;
const PASSWORD = `Theme-Test-${stamp}`;
const SHOTS = process.env.SHOT_DIR;
let original = {};

test.beforeAll(async () => {
  await db.adminUser.create({
    data: { email, name: "Owner Test", role: "SUPER_ADMIN", passwordHash: await hash(PASSWORD, ARGON2_OPTIONS), mfaSetupAt: new Date() },
  });
  original.theme = (await db.theme.findFirst({ where: { isActive: true } }))?.id;
  original.header = (await db.siteSetting.findUnique({ where: { key: "header" } }))?.value;
  original.maintenance = (await db.siteSetting.findUnique({ where: { key: "maintenance" } }))?.value;
});

test.afterAll(async () => {
  // Leave the dev database as it was.
  if (original.theme) {
    await db.theme.updateMany({ data: { isActive: false } });
    await db.theme.update({ where: { id: original.theme }, data: { isActive: true } });
  }
  if (original.header) await db.siteSetting.update({ where: { key: "header" }, data: { value: original.header } });
  if (original.maintenance) await db.siteSetting.update({ where: { key: "maintenance" }, data: { value: original.maintenance } });
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

const primaryOf = (page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--c-primary").trim().toUpperCase());

test("activate a theme, edit the header, toggle maintenance — the public site follows", async ({ page, browser }) => {
  await signIn(page);
  page.on("dialog", (d) => d.accept()); // confirm "make live"

  // Theme: Navy & Copper goes live from the admin UI
  await page.goto("/admin/theme");
  const navyCard = page.getByRole("listitem").filter({ hasText: "Navy & Copper" });
  await navyCard.getByRole("button", { name: "Make live" }).click();
  await expect(page.getByText('"Navy & Copper" is now live.')).toBeVisible();

  const visitor = await browser.newContext();
  const site = await visitor.newPage();
  await site.goto("/");
  expect(await primaryOf(site)).toBe("#14284B");
  if (SHOTS) await site.screenshot({ path: `${SHOTS}/home-navy-1280.png` });

  // Theme editor: live preview + contrast report
  await page.goto("/admin/theme");
  await page.getByRole("listitem").filter({ hasText: "Pine & Brass" }).getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Live preview" })).toBeVisible();
  await expect(page.getByText("All text meets the WCAG AA contrast minimum.")).toBeVisible();
  await page.getByLabel("Primary hex value", { exact: true }).fill("#EEEEEE");
  await expect(page.getByText(/colour pairs? (are|is) hard to read/)).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/theme-editor-1280.png`, fullPage: true });
  await page.getByLabel("Primary hex value", { exact: true }).fill("#0F3B3A");
  await page.getByRole("button", { name: "Save and make live" }).click();
  await expect(page.getByText(/saved and now live/)).toBeVisible();
  await site.reload();
  expect(await primaryOf(site)).toBe("#0F3B3A");

  // Header button text from Settings > Header
  await page.goto("/admin/settings/header");
  await page.getByLabel(/^Button text/).fill("Get today's price");
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expect(page.getByText(/Header saved/)).toBeVisible();
  await site.reload();
  await expect(site.getByTestId("site-header").getByRole("link", { name: "Get today's price" })).toBeVisible();

  // Maintenance mode: visitor sees the notice, the signed-in admin still sees the site
  await page.goto("/admin/settings/maintenance");
  await page.getByLabel("Turn on maintenance mode").check();
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expect(page.getByText(/Maintenance mode saved/)).toBeVisible();
  await site.reload();
  await expect(site.getByRole("heading", { name: "We are updating the website" })).toBeVisible();
  await expect(site.getByTestId("home-title")).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByText(/Maintenance mode is on/)).toBeVisible();
  await expect(page.getByTestId("home-title")).toBeVisible();

  await page.goto("/admin/settings/maintenance");
  await page.getByLabel("Turn on maintenance mode").uncheck();
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expect(page.getByText(/Maintenance mode saved/)).toBeVisible();
  await site.reload();
  await expect(site.getByTestId("home-title")).toBeVisible();
  await visitor.close();
});
