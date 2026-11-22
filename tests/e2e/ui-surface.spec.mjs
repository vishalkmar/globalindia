import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { csrfHeaders, signInWithOtp } from "./helpers.mjs";

/** Phase 29: what a person (or attacker) can see and do in the browser. */

const db = new PrismaClient();
const stamp = Date.now();
const email = `e2e-ui-${stamp}@test.local`;
const PASSWORD = `Ui-Surface-${stamp}`;
const lockEmail = `e2e-ui-lock-${stamp}@test.local`;
// A second account for the storage test: the sign-in code cooldown (60 s) would hold back a new code.
const email2 = `e2e-ui-2-${stamp}@test.local`;
const SECRETS = ["passwordHash", "tokenVersion", "refreshTokenHash", "codeHash", "totpSecretEnc", "JWT_ACCESS_SECRET", "OTP_PEPPER", "DATABASE_URL"];

test.beforeAll(async () => {
  const passwordHash = await hash(PASSWORD, ARGON2_OPTIONS);
  await db.adminUser.createMany({
    data: [
      { email, name: "UI Surface", role: "SUPER_ADMIN", passwordHash, mfaSetupAt: new Date() },
      { email: lockEmail, name: "Lock Test", role: "EDITOR", passwordHash, mfaSetupAt: new Date() },
      { email: email2, name: "UI Surface Two", role: "SUPER_ADMIN", passwordHash, mfaSetupAt: new Date() },
    ],
  });
});
test.afterAll(async () => {
  await db.adminUser.deleteMany({ where: { email: { in: [email, lockEmail, email2] } } });
  await db.$disconnect();
});

test("pages cannot be framed by another site (clickjacking)", async ({ page }) => {
  await page.goto("http://127.0.0.1:3100/about");
  await page.setContent(`<iframe id="f" src="http://localhost:3100/admin/login" width="600" height="400"></iframe>`);
  await page.waitForTimeout(1500);
  const frame = page.frames().find((f) => f.url().includes("/admin/login"));
  // Chromium refuses to render it: either no frame, or a frame without the login form.
  if (frame) await expect(frame.getByLabel("Email")).toHaveCount(0);
});

test("no secrets in page source or RSC payload; errors show no stack; HSTS; no mixed content", async ({ page, request }) => {
  for (const path of ["/", "/products", "/contact", "/admin/login"]) {
    const html = await (await request.get(path)).text();
    const rsc = await (await request.get(path, { headers: { RSC: "1" } })).text();
    for (const s of SECRETS) {
      expect(html, `${path} html`).not.toContain(s);
      expect(rsc, `${path} rsc`).not.toContain(s);
    }
    expect(html, path).not.toMatch(/(src|href)="http:\/\/(?!localhost|127\.0\.0\.1)/);
  }
  const res = await request.get("/");
  expect(res.headers()["strict-transport-security"]).toMatch(/max-age=63072000; includeSubDomains; preload/);

  const missing = await request.get("/products/no-such-family/no-such-product");
  expect(missing.status()).toBe(404);
  // What a visitor sees (dev builds name script files after node_modules, so check the text, not the HTML).
  await page.goto("/products/no-such-family/no-such-product");
  const text = await page.locator("body").innerText();
  for (const leak of ["node_modules", "    at ", "Error:", "prisma", "webpack-internal", "Stack"]) expect(text).not.toContain(leak);

  const apiMissing = await request.get("/api/admin/products/not-a-real-id");
  expect(await apiMissing.text()).not.toMatch(/stack|node_modules|prisma/i);

  // signed in: the admin HTML and RSC also stay clean
  await signInWithOtp(page, email, PASSWORD);
  const adminHtml = await (await page.request.get("/admin/users")).text();
  for (const s of SECRETS) expect(adminHtml).not.toContain(s);
});

test("sign-in: no code in any URL, no token in storage or script-readable cookies, back after logout shows nothing", async ({ page }) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await signInWithOtp(page, email2, PASSWORD);
  expect(urls.filter((u) => /[?&/=]\d{6}(\b|$)/.test(new URL(u).pathname + new URL(u).search))).toEqual([]);

  const storage = await page.evaluate(() => ({
    local: JSON.stringify(Object.entries(localStorage)),
    session: JSON.stringify(Object.entries(sessionStorage)),
    cookie: document.cookie,
  }));
  expect(storage.local).not.toMatch(/eyJ|token|gi_at|gi_rt/i);
  expect(storage.session).not.toMatch(/eyJ|token|gi_at|gi_rt/i);
  expect(storage.cookie).not.toMatch(/gi_at|gi_rt|gi_mfa|gi_su|gi_pre/);

  const adminPage = await page.request.get("/admin/users");
  expect(adminPage.headers()["cache-control"]).toContain("no-store");

  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users", level: 1 })).toBeVisible();
  await page.locator('button[aria-haspopup="menu"]').first().click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(/\/admin\/login/);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Users", level: 1 })).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("the map loads only after a click", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.locator('iframe[src*="google.com/maps"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Show map" }).click();
  await expect(page.locator('iframe[src*="google.com/maps"]')).toHaveCount(1);
});

test("wrong passwords and a locked account get the same message", async ({ page }) => {
  await page.goto("/admin/login");
  const answers = [];
  for (let i = 0; i < 7; i++) {
    const res = await page.request.post("/api/auth/login", {
      data: { email: lockEmail, password: `wrong-${i}-password` },
      headers: await csrfHeaders(page),
    });
    answers.push(`${res.status()} ${(await res.json()).error}`);
  }
  expect(new Set(answers).size).toBe(1);
  expect(answers[0]).toBe("401 Invalid email or password.");
  expect((await db.adminUser.findUnique({ where: { email: lockEmail } })).lockedUntil).not.toBeNull();
});
