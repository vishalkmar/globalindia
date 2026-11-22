import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { csrfHeaders, signInWithOtp, waitForMail } from "./helpers.mjs";

/** Phase 30 todo 02: forgotten password, from the email link to signing in again. */

const db = new PrismaClient();
const stamp = Date.now();
const email = `e2e-reset-${stamp}@test.local`;
const OLD = `Old-Reset-Pass-${stamp}`;
const NEW = `New-Reset-Pass-${stamp}!`;

test.beforeAll(async () => {
  await db.adminUser.create({
    data: { email, name: "Reset Test", role: "EDITOR", passwordHash: await hash(OLD, ARGON2_OPTIONS), mfaSetupAt: new Date() },
  });
});
test.afterAll(async () => {
  await db.adminUser.deleteMany({ where: { email } });
  await db.$disconnect();
});

test("reset by email link: old sessions end, old password stops working, the link works once", async ({ browser }) => {
  // A signed-in device that should be signed out by the reset
  const deviceCtx = await browser.newContext();
  const device = await deviceCtx.newPage();
  await signInWithOtp(device, email, OLD);

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/admin/forgot");
  await page.getByLabel("Email").fill(email);
  const since = Date.now() - 1000;
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/If an account exists for that email/)).toBeVisible();

  const html = await waitForMail({ to: email, tag: "password-reset", since });
  const link = decodeURIComponent(html.match(/\/admin\/reset\?token=([^"&\s]+)/)[1]);
  await page.goto(`/admin/reset?token=${encodeURIComponent(link)}`);
  await page.getByLabel("New password").fill(NEW);
  await page.getByLabel("Type it again").fill(NEW);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Password changed")).toBeVisible();

  // the other device is signed out
  await device.goto("/admin/users");
  await expect(device).toHaveURL(/\/admin\/login/);

  // old password refused, new one accepted (first step)
  const login = async (password) =>
    page.request.post("/api/auth/login", { data: { email, password }, headers: await csrfHeaders(page) });
  expect((await login(OLD)).status()).toBe(401);
  expect((await login(NEW)).status()).toBe(200);

  // the link cannot be used again
  await page.goto(`/admin/reset?token=${encodeURIComponent(link)}`);
  await page.getByLabel("New password").fill(`${NEW}x`);
  await page.getByLabel("Type it again").fill(`${NEW}x`);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Password changed")).toHaveCount(0);

  await deviceCtx.close();
  await ctx.close();
});
