import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { codeFrom, waitForMail } from "./helpers.mjs";

/** Phase 6: admin shell, role-based navigation, users, audit log, 403/404, mobile layout. */

const db = new PrismaClient();
const stamp = Date.now();
const PASSWORD = `Shell-Test-${stamp}`;
const accounts = {
  SUPER_ADMIN: `e2e-sa-${stamp}@test.local`,
  VIEWER: `e2e-viewer-${stamp}@test.local`,
  MOBILE: `e2e-mobile-${stamp}@test.local`, // separate account: OTP resend has a 60 s cooldown per user
};
const SHOTS = process.env.SHOT_DIR;

test.beforeAll(async () => {
  const passwordHash = await hash(PASSWORD, ARGON2_OPTIONS);
  for (const [role, email] of Object.entries(accounts)) {
    await db.adminUser.create({
      data: {
        email,
        name: role === "VIEWER" ? "Ravi Viewer" : "Akash Test",
        role: role === "MOBILE" ? "SUPER_ADMIN" : role,
        passwordHash,
        emailOtpEnabled: true,
        mfaSetupAt: new Date(),
      },
    });
  }
});

test.afterAll(async () => {
  await db.adminUser.deleteMany({ where: { email: { in: [...Object.values(accounts), `invitee-${stamp}@test.local`] } } });
  await db.$disconnect();
});

async function signIn(page, email) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  const since = Date.now() - 1000;
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/admin\/verify/);
  const code = codeFrom(await waitForMail({ to: email, tag: "otp-login", since }));
  await page.getByLabel("6-digit code").fill(code);
  await page.waitForURL((u) => u.pathname === "/admin");
}

test("super admin: shell, users, invite, audit log", async ({ page }) => {
  await signIn(page, accounts.SUPER_ADMIN);
  await expect(page.getByRole("heading", { name: /Good to see you/ })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Admin" }).first();
  await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Audit log" })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-dashboard-1280.png`, fullPage: true });

  await nav.getByRole("link", { name: "Users" }).click();
  await expect(page.getByRole("heading", { name: "Users", level: 1 })).toBeVisible();
  await expect(page.getByText(accounts.VIEWER)).toBeVisible();

  // Invite
  const since = Date.now() - 1000;
  await page.getByRole("button", { name: "Invite user" }).click();
  const dialog = page.getByRole("dialog", { name: "Invite a user" });
  await dialog.getByLabel("Full name").fill("Priya Sharma");
  await dialog.getByLabel(/^Email/).fill(`invitee-${stamp}@test.local`);
  await dialog.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText(`Invite sent to invitee-${stamp}@test.local.`)).toBeVisible();
  const invite = await waitForMail({ to: `invitee-${stamp}@test.local`, tag: "invite", since });
  expect(invite).toContain("/admin/reset?token=");
  await expect(page.getByRole("cell", { name: /Priya Sharma/ })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-users-1280.png`, fullPage: true });

  // Cannot change own role (field disabled)
  await page.getByRole("button", { name: `Edit ${accounts.SUPER_ADMIN}` }).click();
  await expect(page.getByRole("dialog").getByLabel("Role")).toBeDisabled();
  await page.keyboard.press("Escape");

  // Audit log shows the invite
  await nav.getByRole("link", { name: "Audit log" }).click();
  await page.getByRole("combobox", { name: "Areas" }).selectOption("user");
  await expect(page.getByText("user.invite").first()).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-audit-1280.png`, fullPage: true });

  // Unknown admin URL -> 404 inside the shell
  await page.goto("/admin/does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
});

test("viewer: read-only navigation, users area forbidden", async ({ page }) => {
  await signIn(page, accounts.VIEWER);
  const nav = page.getByRole("navigation", { name: "Admin" }).first();
  await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Users" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Audit log" })).toHaveCount(0);

  await page.goto("/admin/users");
  await page.waitForURL(/\/admin\/forbidden/);
  await expect(page.getByRole("heading", { name: "You do not have access to this page" })).toBeVisible();

  // API answers 403 too, not only the UI
  const res = await page.request.get("/api/admin/users");
  expect(res.status()).toBe(403);

  // Admin and API are never indexed or cached
  const adminPage = await page.request.get("/admin/login");
  expect(adminPage.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(adminPage.headers()["cache-control"]).toContain("no-store");
  expect(res.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
});

test("mobile layout: drawer navigation works at 390 px", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await signIn(page, accounts.MOBILE);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390); // no horizontal scroll
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-dashboard-390.png`, fullPage: true });
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Menu" });
  await expect(drawer).toBeVisible();
  await page.waitForTimeout(400); // let the slide-in finish before the screenshot
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-drawer-390.png` });
  await drawer.getByRole("link", { name: "Users" }).click();
  await expect(page.getByRole("heading", { name: "Users", level: 1 })).toBeVisible();
  await ctx.close();
});
