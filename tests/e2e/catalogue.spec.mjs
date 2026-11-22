import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { signInWithOtp } from "./helpers.mjs";

/** Phase 12: products hub, category pages, admin category/product editing, CSV export, redirects, roles. */

const db = new PrismaClient();
const stamp = Date.now().toString(36);
const SHOTS = process.env.SHOT_DIR;
const editor = { email: `e2e-cat-editor-${stamp}@test.local`, password: `Catalogue-Editor-${stamp}` };
const viewer = { email: `e2e-cat-viewer-${stamp}@test.local`, password: `Catalogue-Viewer-${stamp}` };

test.beforeAll(async () => {
  for (const [u, role] of [
    [editor, "EDITOR"],
    [viewer, "VIEWER"],
  ]) {
    await db.adminUser.create({
      data: {
        email: u.email,
        name: `${role} ${stamp}`,
        role,
        passwordHash: await hash(u.password, ARGON2_OPTIONS),
        mfaSetupAt: new Date(),
      },
    });
  }
});

test.afterAll(async () => {
  // Remove everything this run created (products first: categories cannot go while products point at them).
  await db.product.deleteMany({ where: { slug: { contains: stamp } } });
  await db.productCategory.deleteMany({ where: { slug: { contains: stamp } } });
  await db.redirect.deleteMany({ where: { fromPath: { contains: stamp } } });
  await db.$disconnect();
});

test("products hub: family filter is a shareable link and the filter box finds by CAS", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /raw materials, \d+ categories, one supplier/,
  );
  const families = page.getByRole("group", { name: "Product families" });
  await families.getByRole("link", { name: /Paraffins, Oils & Glycols/ }).click();
  await expect(page).toHaveURL(/\/products\?family=paraffins-oils-glycols$/);
  await expect(families.getByRole("link", { name: /Paraffins, Oils & Glycols/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(page.getByRole("heading", { name: "Light Liquid Paraffin", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Refined Glycerine", level: 2 })).toHaveCount(0);

  await families.getByRole("link", { name: /All products/ }).click();
  await page.getByLabel("Filter products").fill("57-55-6");
  await expect(page.getByText(/products? match/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Propylene Glycol 99% IP/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Light Liquid Paraffin IP/ })).toHaveCount(0);
  await page.getByLabel("Filter products").fill("zzz-nothing");
  await expect(page.getByText(/Nothing matches/)).toBeVisible();
});

test("category page: breadcrumb, products table, buying guide, FAQs, related categories", async ({
  page,
}) => {
  await page.goto("/products/light-liquid-paraffin");
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.getByRole("link", { name: "Products" })).toHaveAttribute("href", "/products");
  await expect(crumbs.getByRole("link", { name: "Paraffins, Oils & Glycols" })).toHaveAttribute(
    "href",
    "/products?family=paraffins-oils-glycols",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Light Liquid Paraffin");
  const table = page.getByRole("region", { name: "Light Liquid Paraffin products" });
  await expect(table.getByRole("row")).toHaveCount(5); // header + 4 products
  await expect(table.getByText("8012-95-1").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /What to check before you order/ })).toBeVisible();
  await page.getByText("Is light liquid paraffin the same as mineral oil?").click();
  await expect(page.getByText(/highly refined mineral oil/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "More in Paraffins, Oils & Glycols" })).toBeVisible();
  expect((await page.request.get("/products/no-such-category")).status()).toBe(404);
});

test("editor: creates a category and a product, the website follows, slug change redirects", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await signInWithOtp(page, editor.email, editor.password);

  // New category
  await page.goto("/admin/categories/new");
  await page.getByLabel("Category name").fill(`E2E Waxes ${stamp}`);
  await expect(page.getByLabel("URL slug")).toHaveValue(`e2e-waxes-${stamp}`);
  await page.getByLabel("Family").selectOption({ label: "Paraffins, Oils & Glycols" });
  await page.getByLabel("Status").selectOption("PUBLISHED");
  await page.getByLabel("Short introduction").fill("Test waxes for the end-to-end run.");
  await page.getByRole("button", { name: "Create category" }).click();
  await expect(page.getByText("Category created.")).toBeVisible();
  await page.waitForURL(/\/admin\/categories\/c[a-z0-9]+$/);
  const categoryUrl = page.url();

  // New product in it
  await page.goto("/admin/products/new");
  await page.getByLabel("Product name").fill(`Microcrystalline Wax ${stamp}`);
  await page.getByLabel("Category").selectOption({ label: `E2E Waxes ${stamp}` });
  await page.getByLabel("CAS number").fill("63231-60-7");
  await page.getByLabel("Grade").fill("Cosmetic");
  await page.getByLabel("Pack sizes").fill("25 kg bag");
  await page.getByLabel("Pack sizes").press("Enter");
  await page.getByLabel("Applications").fill("Lip balm, Candles");
  await page.getByLabel("Applications").press("Enter");
  await page.getByRole("button", { name: "Add row" }).click();
  await page.getByLabel("Property").fill("Melting point");
  await page.getByLabel("Value").fill("70–80 °C");
  // A wrong CAS check digit is caught before saving
  await page.getByLabel("CAS number").fill("63231-60-8");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByText(/Not a valid CAS number/)).toBeVisible();
  await page.getByLabel("CAS number").fill("63231-60-7");
  await page.getByLabel("Status").selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByText("Product created.")).toBeVisible();
  await page.waitForURL(/\/admin\/products\/c[a-z0-9]+$/);
  // the editor of the saved product (Next keeps the previous "new" page hidden for back navigation)
  await expect(page.getByRole("heading", { level: 1, name: `Microcrystalline Wax ${stamp}` })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p12-admin-product-1280.png`, fullPage: true });

  await page.goto(`/products/e2e-waxes-${stamp}`);
  await expect(page.getByRole("link", { name: `Microcrystalline Wax ${stamp}` })).toBeVisible();
  await expect(page.getByText("63231-60-7")).toBeVisible();

  // Admin list: search by CAS
  await page.goto("/admin/products");
  await page.getByLabel("Search name, slug or CAS number").fill("63231-60-7");
  await expect(page.getByRole("cell", { name: new RegExp(`Microcrystalline Wax ${stamp}`) })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(2); // header + the one match
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p12-admin-products-1280.png`, fullPage: true });
  const csv = await page.request.get("/api/admin/products/export");
  expect(csv.headers()["content-type"]).toMatch(/text\/csv/);
  expect(await csv.text()).toContain(`microcrystalline-wax-${stamp}`);

  // Rename the category slug: the old address answers with a permanent redirect
  await page.goto(categoryUrl);
  await page.getByLabel("URL slug").fill(`e2e-waxes-moved-${stamp}`);
  await page.getByRole("button", { name: "Save category" }).click();
  await expect(page.getByText("Category saved.")).toBeVisible();
  const old = await page.request.get(`/products/e2e-waxes-${stamp}`, { maxRedirects: 0 });
  expect([301, 307, 308]).toContain(old.status());
  expect(old.headers().location).toContain(`/products/e2e-waxes-moved-${stamp}`);
  await page.goto(`/products/e2e-waxes-${stamp}`);
  await expect(page).toHaveURL(new RegExp(`/products/e2e-waxes-moved-${stamp}$`));

  // Categories admin shows it with its product count
  await page.goto("/admin/categories");
  await expect(page.getByTestId("category-row").filter({ hasText: `E2E Waxes ${stamp}` })).toContainText(
    "1 product",
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p12-admin-categories-1280.png`, fullPage: true });
});

test("viewer: can read products but every field is locked and there are no create buttons", async ({
  page,
}) => {
  await signInWithOtp(page, viewer.email, viewer.password);
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "New product" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Import CSV" })).toHaveCount(0);
  const first = await db.product.findFirst({
    where: { deletedAt: null, slug: "light-liquid-paraffin-ip" },
    select: { id: true },
  });
  await page.goto(`/admin/products/${first.id}`);
  await expect(page.getByLabel("Product name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save product" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await page.goto("/admin/products/new");
  await expect(page).toHaveURL(/\/admin\/forbidden/);
});
