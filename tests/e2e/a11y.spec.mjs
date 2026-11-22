import AxeBuilder from "@axe-core/playwright";
import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { signInWithOtp } from "./helpers.mjs";

/**
 * Phase 16 todos 15-16: automated accessibility audit (axe, WCAG 2.1 A/AA) of public and admin pages.
 * Serious and critical findings fail the test; the report names the rule and the elements.
 */

const db = new PrismaClient();
const stamp = Date.now().toString(36);
const admin = { email: `e2e-a11y-${stamp}@test.local`, password: `A11y-Admin-${stamp}` };

const PUBLIC = [
  "/",
  "/about",
  "/quality",
  "/products",
  "/products/light-liquid-paraffin",
  "/products/anionic-surfactants/sles-70",
  "/contact",
  "/contact/thank-you?type=quote&ref=GI-ABC123",
  "/faq",
  "/industries",
  "/industries/food-beverage",
  "/insights",
  "/insights/how-to-read-a-coa",
  "/legal/privacy",
];
const ADMIN = [
  "/admin",
  "/admin/products",
  "/admin/enquiries",
  "/admin/settings",
  "/admin/redirects",
  "/admin/insights",
  "/admin/faqs",
  "/admin/trash",
];

test.beforeAll(async () => {
  await db.adminUser.create({
    data: {
      email: admin.email,
      name: `A11y ${stamp}`,
      role: "SUPER_ADMIN",
      passwordHash: await hash(admin.password, ARGON2_OPTIONS),
      mfaSetupAt: new Date(),
    },
  });
});
test.afterAll(async () => {
  await db.$disconnect();
});

async function audit(page, path) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("[data-testid=cookie-consent]")
    .analyze();
  return result.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) =>
        `${path}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join(" | ")})`,
    );
}

test("public pages have no serious accessibility problems", async ({ page }) => {
  test.setTimeout(240_000);
  const problems = [];
  for (const path of PUBLIC) {
    await page.goto(path, { waitUntil: "networkidle" });
    problems.push(...(await audit(page, path)));
  }
  expect(problems, problems.join("\n")).toEqual([]);
});

test("admin pages have no serious accessibility problems", async ({ page }) => {
  test.setTimeout(240_000);
  await signInWithOtp(page, admin.email, admin.password);
  const problems = [];
  for (const path of ADMIN) {
    await page.goto(path, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    problems.push(...(await audit(page, path)));
  }
  await page.goto("/admin/login");
  expect(problems, problems.join("\n")).toEqual([]);
});
