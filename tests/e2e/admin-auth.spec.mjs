import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { currentStep, totpCode } from "../../src/lib/auth/totp.js";
import { codeFrom, waitForMail } from "./helpers.mjs";

/**
 * Phase 5 todo 20 — full admin sign-in journey in a real browser:
 * password -> email OTP -> forced password change -> authenticator setup approved from the
 * owner's inbox -> recovery codes -> dashboard; then sign-in with TOTP and with a recovery code.
 */

const db = new PrismaClient();
const stamp = Date.now();
const email = `e2e-${stamp}@test.local`;
const firstPassword = `First-Pass-${stamp}`;
const newPassword = `Burari-Road-419-${stamp}`;
// Same rule as defaultAdminContact() in lib/auth/mfa.js: the security setting, else the oldest
// active super admin of THIS database (never the .env seed address, which may point at production).
let approvalInbox = "";

test.beforeAll(async () => {
  const security = await db.siteSetting.findUnique({ where: { key: "security" } });
  const owner = await db.adminUser.findFirst({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { email: true },
  });
  approvalInbox = String(security?.value?.defaultAdminEmail || owner?.email || "").toLowerCase();
  await db.adminUser.create({
    data: {
      email,
      name: "E2E Editor",
      role: "EDITOR",
      passwordHash: await hash(firstPassword, ARGON2_OPTIONS),
      mustChangePassword: true,
      emailOtpEnabled: true,
    },
  });
});

test.afterAll(async () => {
  await db.adminUser.deleteMany({ where: { email } });
  await db.$disconnect();
});

async function signOut(page) {
  await page.getByRole("button", { name: /E2E Editor/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
}

async function signIn(page, password) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/admin\/verify/);
}

test("full sign-in, setup, TOTP and recovery journey", async ({ page, context }) => {
  // Wrong password -> generic message
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();

  // 1. Password + email OTP (auto-sent because email is the only method)
  const sentAt = Date.now() - 1000;
  const otpResponse = page.waitForResponse((r) => r.url().endsWith("/api/auth/otp/send"));
  await signIn(page, firstPassword);
  const otpBody = await (await otpResponse).text();
  const mail = await waitForMail({ to: email, tag: "otp-login", since: sentAt });
  const loginCode = codeFrom(mail);
  expect(otpBody).not.toContain(loginCode); // the code is never in an API response
  await page.getByLabel("6-digit code").fill(loginCode);
  await page.waitForURL(/\/admin\/setup/);

  // Tokens live only in httpOnly cookies
  const cookies = await context.cookies();
  const access = cookies.find((c) => c.name.endsWith("gi_at"));
  expect(access?.httpOnly).toBe(true);
  expect(access?.sameSite).toBe("Strict");
  const storage = await page.evaluate(() => [localStorage.length, sessionStorage.length]);
  expect(storage).toEqual([0, 0]);

  // 2. Forced password change
  await page.getByLabel("Current password").fill(firstPassword);
  await page.getByLabel("New password").fill(newPassword);
  await page.getByLabel("Type it again").fill(newPassword);
  await page.getByRole("button", { name: "Save password and continue" }).click();

  // 3. Authenticator: read the manual key, ask for approval from the owner's inbox
  const keyBox = page.locator("code.select-all");
  await expect(keyBox).toBeVisible();
  const secret = (await keyBox.innerText()).replace(/\s/g, "");
  const approvalSentAt = Date.now() - 1000;
  await page.getByRole("button", { name: /send approval code/i }).click();
  const approvalMail = await waitForMail({ to: approvalInbox, tag: "otp-mfa-toggle", since: approvalSentAt });
  expect(approvalMail).toContain(email); // the owner sees which account is being changed
  await page.getByLabel("Approval code from email").fill(codeFrom(approvalMail));
  const setupStep = currentStep();
  await page.getByLabel("Current code from your authenticator app").fill(totpCode(secret));
  await page.getByRole("button", { name: "Switch on authenticator" }).click();

  // 4. Recovery codes shown once
  await expect(page.getByText("Save these 10 recovery codes now")).toBeVisible();
  const codes = (await page.locator("ol li").allInnerTexts()).filter((t) =>
    /^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(t.trim()),
  );
  expect(codes).toHaveLength(10);
  await page.getByLabel("I have stored these codes somewhere safe").check();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: "Go to the admin panel" }).click();
  await expect(page.getByRole("heading", { name: /Good to see you/ })).toBeVisible();

  // 5. Sign out, then sign in with the authenticator app
  await signOut(page);
  await page.waitForURL(/\/admin\/login/);
  await page.goto("/admin");
  await page.waitForURL(/\/admin\/login/); // back button / direct visit shows nothing after logout

  await signIn(page, newPassword);
  await expect(page.getByRole("radio", { name: "Authenticator app" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  while (currentStep() <= setupStep) await page.waitForTimeout(1000); // same 30 s code cannot be replayed
  await page.getByLabel("6-digit code").fill(totpCode(secret));
  await page.waitForURL((url) => url.pathname === "/admin");
  await expect(page.getByRole("heading", { name: /Good to see you/ })).toBeVisible();

  // 6. Recovery code works once
  await signOut(page);
  await page.waitForURL(/\/admin\/login/);
  await signIn(page, newPassword);
  await page.getByRole("radio", { name: "Recovery code" }).click();
  await page.getByLabel("Recovery code").fill(codes[0]);
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await page.waitForURL((url) => url.pathname === "/admin");

  await signOut(page);
  await page.waitForURL(/\/admin\/login/);
  await signIn(page, newPassword);
  await page.getByRole("radio", { name: "Recovery code" }).click();
  await page.getByLabel("Recovery code").fill(codes[0]);
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(page.getByText("That recovery code is not valid or was already used.")).toBeVisible();

  // Audit trail recorded the journey
  const user = await db.adminUser.findUnique({ where: { email } });
  const actions = (await db.auditLog.findMany({ where: { actorId: user.id }, select: { action: true } })).map(
    (a) => a.action,
  );
  for (const a of [
    "auth.login.failed",
    "auth.login.success",
    "auth.password.changed",
    "mfa.totp.enabled",
    "auth.mfa.recovery_used",
    "auth.mfa.recovery_failed",
    "auth.logout",
  ]) {
    expect(actions).toContain(a);
  }
});
