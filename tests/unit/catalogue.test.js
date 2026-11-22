import { beforeAll, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { parseCsv, parseCsvObjects, toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { categorySchema, isValidCas, productSchema, slugify } from "@/lib/validation/catalogue";

import { CATEGORIES, PRODUCTS } from "../../prisma/seed-catalogue.js";
import { makeUser } from "../helpers.js";

/** Phase 12: catalogue schemas, CSV, categories/products admin API, redirects and role permissions. */

const cookieJar = { access: "" };
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({
    get: (name) => (name.endsWith("gi_at") ? { value: cookieJar.access } : undefined),
  }),
}));

async function as(role) {
  const { user } = await makeUser({ role });
  await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
  cookieJar.access = (await createSession(user)).accessToken;
  return user;
}

const ORIGIN = "http://localhost:3000";
const req = (method, body, url = `${ORIGIN}/api/admin/x`) =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = (params) => ({ params: Promise.resolve(params) });
const stamp = Date.now().toString(36);

const categories = () => import("@/app/api/admin/categories/route");
const category = () => import("@/app/api/admin/categories/[id]/route");
const reorder = () => import("@/app/api/admin/categories/reorder/route");
const products = () => import("@/app/api/admin/products/route");
const product = () => import("@/app/api/admin/products/[id]/route");
const duplicate = () => import("@/app/api/admin/products/[id]/duplicate/route");
const importer = () => import("@/app/api/admin/products/import/route");
const exporter = () => import("@/app/api/admin/products/export/route");

function productBody(over = {}) {
  return productSchema.parse({
    name: `Test Glycol ${stamp}`,
    slug: `test-glycol-${stamp}`,
    categoryId: over.categoryId,
    casNo: "57-55-6",
    packSizes: ["200 L drum"],
    status: "DRAFT",
    ...over,
  });
}

describe("seed catalogue", () => {
  it("22 categories over the six families, every product valid with a correct CAS check digit", () => {
    expect(CATEGORIES).toHaveLength(22);
    expect(new Set(CATEGORIES.map((c) => c[2])).size).toBe(6);
    for (const p of PRODUCTS) if (p.cas) expect(isValidCas(p.cas), `${p.n} ${p.cas}`).toBe(true);
    expect(new Set(PRODUCTS.map((p) => p.s)).size).toBe(PRODUCTS.length);
    for (const [slug] of CATEGORIES)
      expect(
        PRODUCTS.some((p) => p.c === slug),
        slug,
      ).toBe(true);
  });

  it("buying guides are valid category data and survive the sanitiser unchanged", async () => {
    const { CATEGORY_GUIDES } = await import("../../prisma/seed-guides.js");
    const { sanitizeRichText } = await import("@/lib/security/sanitize");
    for (const [slug, g] of Object.entries(CATEGORY_GUIDES)) {
      expect(
        CATEGORIES.some((c) => c[0] === slug),
        slug,
      ).toBe(true);
      expect(categorySchema.safeParse({ name: "X", slug, family: "FOOD", ...g }).success, slug).toBe(true);
      expect(sanitizeRichText(g.guide), slug).toBe(g.guide);
    }
  });

  it("keeps the category slugs the footer links to", () => {
    const slugs = CATEGORIES.map((c) => c[0]);
    for (const s of ["light-liquid-paraffin", "refined-glycerine", "detergent-raw-material", "food-additive"])
      expect(slugs).toContain(s);
  });
});

describe("catalogue schemas", () => {
  it("checks CAS check digits and formats", () => {
    expect(isValidCas("57-55-6")).toBe(true);
    expect(isValidCas("7732-18-5")).toBe(true);
    expect(isValidCas("57-55-7")).toBe(false);
    expect(isValidCas("5755-6")).toBe(false);
  });

  it("slugify makes clean slugs", () => {
    expect(slugify("Propylene Glycol 99% IP")).toBe("propylene-glycol-99-ip");
    expect(slugify("  Café — Crème  ")).toBe("cafe-creme");
  });

  it("product rules: price needs a value, brand notes say we supply, no markup, no duplicate files", () => {
    const id = "cm0000000000000000000abcd";
    const base = { name: "X", slug: "x-product", categoryId: id };
    expect(productSchema.safeParse({ ...base, showPrice: true }).error.issues[0].path).toEqual([
      "indicativePrice",
    ]);
    expect(productSchema.safeParse({ ...base, brandNote: "Made by Godrej" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, brandNote: "We supply Godrej SLES." }).success).toBe(true);
    expect(productSchema.safeParse({ ...base, name: "<b>X</b>" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, gallery: [id, id] }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, casNo: "11-11-1" }).success).toBe(false);
    expect(productSchema.parse({ ...base, applications: ["Soap", "Soap"] }).applications).toEqual(["Soap"]);
    expect(categorySchema.safeParse({ name: "X", slug: "x-cat", family: "WEAPONS" }).success).toBe(false);
  });
});

describe("CSV", () => {
  it("round-trips quotes, commas, newlines and unicode", () => {
    const rows = [{ a: 'He said "hi", ok', b: "line1\nline2", c: "40 °C – 60 °C" }];
    const { rows: back } = parseCsvObjects(toCsv(["a", "b", "c"], rows));
    expect(back).toEqual(rows);
  });

  it("neutralises spreadsheet formulas on export and restores them on import", () => {
    const csv = toCsv(["x"], [{ x: '=HYPERLINK("http://evil")' }, { x: "-5 °C" }, { x: "@SUM(A1)" }]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'-5 °C");
    expect(parseCsvObjects(csv).rows.map((r) => r.x)).toEqual([
      '=HYPERLINK("http://evil")',
      "-5 °C",
      "@SUM(A1)",
    ]);
  });

  it("rejects an unclosed quote and skips blank lines", () => {
    expect(() => parseCsv('a,b\n"open,1')).toThrow();
    expect(parseCsv("a,b\r\n\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("categories API", () => {
  let catId;
  beforeAll(async () => {
    await as("EDITOR");
  });

  it("creates, edits and lists a category; the slug change adds 301s for the category and its products", async () => {
    const body = categorySchema.parse({
      name: `Test Category ${stamp}`,
      slug: `test-cat-${stamp}`,
      family: "FOOD",
      intro: "For tests.",
      guide: "<p>Guide<script>alert(1)</script></p>",
      status: "PUBLISHED",
    });
    const res = await (await categories()).POST(req("POST", body));
    expect(res.status).toBe(201);
    catId = (await res.json()).id;
    const saved = await db.productCategory.findUnique({ where: { id: catId } });
    expect(saved.guide).not.toContain("script");

    const dup = await (await categories()).POST(req("POST", body));
    expect(dup.status).toBe(400);
    expect((await dup.json()).fields.slug).toMatch(/already uses/);

    const p = await (
      await products()
    ).POST(req("POST", productBody({ categoryId: catId, status: "PUBLISHED" })));
    expect(p.status).toBe(201);

    const moved = await (
      await category()
    ).PUT(req("PUT", { ...body, slug: `test-cat-moved-${stamp}` }), ctx({ id: catId }));
    expect(moved.status).toBe(200);
    const redirects = await db.redirect.findMany({
      where: { fromPath: { startsWith: `/products/test-cat-${stamp}` } },
    });
    expect(redirects.map((r) => [r.fromPath, r.toPath]).sort()).toEqual(
      [
        [`/products/test-cat-${stamp}`, `/products/test-cat-moved-${stamp}`],
        [
          `/products/test-cat-${stamp}/test-glycol-${stamp}`,
          `/products/test-cat-moved-${stamp}/test-glycol-${stamp}`,
        ],
      ].sort(),
    );

    // Moving back removes the loop and collapses the chain
    await (await category()).PUT(req("PUT", { ...body }), ctx({ id: catId }));
    expect(await db.redirect.findUnique({ where: { fromPath: `/products/test-cat-${stamp}` } })).toBeNull();
    expect(
      (await db.redirect.findUnique({ where: { fromPath: `/products/test-cat-moved-${stamp}` } })).toPath,
    ).toBe(`/products/test-cat-${stamp}`);

    const list = await (await categories()).GET(req("GET"));
    const row = (await list.json()).categories.find((c) => c.id === catId);
    expect(row.productCount).toBe(1);
  });

  it("will not delete a category that still has products", async () => {
    const res = await (await category()).DELETE(req("DELETE"), ctx({ id: catId }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Move or delete its 1 product/);
  });

  it("reorders one family at a time and refuses mixed or partial lists", async () => {
    const food = await db.productCategory.findMany({
      where: { family: "FOOD", deletedAt: null },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    const ids = food.map((c) => c.id).reverse();
    expect((await (await reorder()).PUT(req("PUT", { ids }))).status).toBe(200);
    const after = await db.productCategory.findMany({
      where: { family: "FOOD", deletedAt: null },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    expect(after.map((c) => c.id)).toEqual(ids);
    expect((await (await reorder()).PUT(req("PUT", { ids: ids.slice(1) }))).status).toBe(400);
    const other = await db.productCategory.create({
      data: { name: "Other family", slug: `other-${stamp}`, family: "DETERGENT" },
    });
    expect((await (await reorder()).PUT(req("PUT", { ids: [...ids, other.id] }))).status).toBe(400);
  });
});

describe("products API", () => {
  let editor;
  let catId;
  let catSlug;
  beforeAll(async () => {
    editor = await as("EDITOR");
    const c = await db.productCategory.create({
      data: { name: `P Cat ${stamp}`, slug: `p-cat-${stamp}`, family: "DETERGENT", status: "PUBLISHED" },
    });
    catId = c.id;
    catSlug = c.slug;
  });

  it("creates with gallery and documents, refuses wrong file types, lists with filters", async () => {
    const img = await db.mediaAsset.create({
      data: {
        publicId: `gi_p${stamp}a`,
        url: "/a.png",
        type: "IMAGE",
        format: "png",
        bytes: 1,
        alt: "Drum",
        uploadedById: editor.id,
        driver: "local",
      },
    });
    const pdf = await db.mediaAsset.create({
      data: {
        publicId: `gi_p${stamp}b`,
        url: "/b.pdf",
        type: "PDF",
        format: "pdf",
        bytes: 1,
        alt: "",
        uploadedById: editor.id,
        driver: "local",
      },
    });

    const wrong = await (
      await products()
    ).POST(req("POST", productBody({ categoryId: catId, slug: `wrong-${stamp}`, gallery: [pdf.id] })));
    expect(wrong.status).toBe(400);
    expect((await wrong.json()).fields["gallery.0"]).toMatch(/Choose an image/);

    const body = productBody({
      categoryId: catId,
      slug: `sles-test-${stamp}`,
      name: `SLES Test ${stamp}`,
      imageId: img.id,
      gallery: [img.id],
      documents: [{ mediaId: pdf.id, type: "COA", label: "Batch 12", isPublic: false }],
      specs: [{ property: "Active", value: "70%", method: "" }],
    });
    const res = await (await products()).POST(req("POST", body));
    expect(res.status).toBe(201);
    const { id } = await res.json();
    const got = await (await product()).GET(req("GET"), ctx({ id }));
    const data = await got.json();
    expect(data.product.gallery).toEqual([img.id]);
    expect(data.product.documents[0]).toMatchObject({ mediaId: pdf.id, type: "COA", label: "Batch 12" });
    expect(data.path).toBe(`/products/${catSlug}/sles-test-${stamp}`);

    const list = await (
      await products()
    ).GET(
      req(
        "GET",
        undefined,
        `${ORIGIN}/api/admin/products?q=sles-test-${stamp}&category=${catId}&status=DRAFT`,
      ),
    );
    expect((await list.json()).rows.map((r) => r.id)).toEqual([id]);
    const bad = await (
      await products()
    ).GET(req("GET", undefined, `${ORIGIN}/api/admin/products?status=DELETED`));
    expect(bad.status).toBe(400);
  });

  it("slug change on a product adds a 301; delete sends the old URL to the category", async () => {
    const res = await (
      await products()
    ).POST(req("POST", productBody({ categoryId: catId, slug: `old-${stamp}`, status: "PUBLISHED" })));
    const { id } = await res.json();
    const body = (await (await (await product()).GET(req("GET"), ctx({ id }))).json()).product;
    const put = await (await product()).PUT(req("PUT", { ...body, slug: `new-${stamp}` }), ctx({ id }));
    expect(put.status).toBe(200);
    expect(
      (await db.redirect.findUnique({ where: { fromPath: `/products/${catSlug}/old-${stamp}` } })).toPath,
    ).toBe(`/products/${catSlug}/new-${stamp}`);

    expect((await (await product()).DELETE(req("DELETE"), ctx({ id }))).status).toBe(200);
    const gone = await db.product.findUnique({ where: { id } });
    expect(gone.deletedAt).not.toBeNull();
    expect(gone.slug).toMatch(/--deleted-/);
    expect(
      (await db.redirect.findUnique({ where: { fromPath: `/products/${catSlug}/new-${stamp}` } })).toPath,
    ).toBe(`/products/${catSlug}`);
    expect(
      (await db.redirect.findUnique({ where: { fromPath: `/products/${catSlug}/old-${stamp}` } })).toPath,
    ).toBe(`/products/${catSlug}`);
    expect((await (await product()).GET(req("GET"), ctx({ id }))).status).toBe(404);
  });

  it("duplicates as a draft copy with a free slug and the same files", async () => {
    const res = await (
      await products()
    ).POST(
      req(
        "POST",
        productBody({ categoryId: catId, slug: `dup-${stamp}`, featured: true, status: "PUBLISHED" }),
      ),
    );
    const { id } = await res.json();
    const a = await (await duplicate()).POST(req("POST"), ctx({ id }));
    const b = await (await duplicate()).POST(req("POST"), ctx({ id }));
    const [ca, cb] = await Promise.all([
      db.product.findUnique({ where: { id: (await a.json()).id } }),
      db.product.findUnique({ where: { id: (await b.json()).id } }),
    ]);
    expect([ca.slug, cb.slug]).toEqual([`dup-${stamp}-copy`, `dup-${stamp}-copy-2`]);
    expect(ca.status).toBe("DRAFT");
    expect(ca.featured).toBe(false);
    expect(ca.name).toMatch(/\(copy\)$/);
  });

  it("CSV export then import: dry run reports, apply writes, bad rows block the whole import", async () => {
    const out = await (await exporter()).GET(req("GET"));
    expect(out.headers.get("content-type")).toMatch(/text\/csv/);
    const csv = await out.text();
    expect(csv.split("\r\n")[0]).toContain("slug,name,category_slug,cas_no");

    const file = [
      "slug,name,category_slug,cas_no,pack_sizes,applications,status,featured",
      `csv-new-${stamp},CSV New ${stamp},${catSlug},64-17-5,50 L can | 200 L drum,Cleaning | Lab,DRAFT,no`,
      `dup-${stamp},Renamed by CSV,${catSlug},,,,PUBLISHED,yes`,
    ].join("\n");
    const dry = await (await importer()).POST(req("POST", { csv: file, apply: false }));
    const dryBody = await dry.json();
    expect(dryBody.applied).toBe(false);
    expect(dryBody.summary).toEqual({ create: 1, update: 1, error: 0 });
    expect(await db.product.findUnique({ where: { slug: `csv-new-${stamp}` } })).toBeNull();

    const done = await (await importer()).POST(req("POST", { csv: file, apply: true }));
    expect((await done.json()).applied).toBe(true);
    const created = await db.product.findUnique({ where: { slug: `csv-new-${stamp}` } });
    expect(created.packSizes).toEqual(["50 L can", "200 L drum"]);
    expect((await db.product.findUnique({ where: { slug: `dup-${stamp}` } })).name).toBe("Renamed by CSV");

    const broken = `slug,name,category_slug,cas_no\nok-${stamp},Fine,${catSlug},\nbad-${stamp},Bad,${catSlug},12-34-5\nx-${stamp},X,no-such-category,`;
    const rej = await (await importer()).POST(req("POST", { csv: broken, apply: true }));
    const rejBody = await rej.json();
    expect(rejBody.applied).toBe(false);
    expect(rejBody.summary.error).toBe(2);
    expect(rejBody.rows.find((r) => r.line === 3).errors[0]).toMatch(/CAS/);
    expect(rejBody.rows.find((r) => r.line === 4).errors[0]).toMatch(/Unknown category/);
    expect(await db.product.findUnique({ where: { slug: `ok-${stamp}` } })).toBeNull();

    const evil = await (
      await importer()
    ).POST(req("POST", { csv: "slug,name,category_slug,password\nx,y,z,w", apply: false }));
    expect(evil.status).toBe(400);
  });
});

describe("catalogue permissions per role", () => {
  it("viewer reads but cannot create, edit, delete, reorder, import or duplicate", async () => {
    const anyCat = await db.productCategory.findFirst({ where: { deletedAt: null } });
    const anyProduct = await db.product.findFirst({ where: { deletedAt: null } });
    await as("VIEWER");
    expect((await (await categories()).GET(req("GET"))).status).toBe(200);
    expect((await (await products()).GET(req("GET", undefined, `${ORIGIN}/api/admin/products`))).status).toBe(
      200,
    );
    expect(
      (await (await categories()).POST(req("POST", { name: "X", slug: "x-cat", family: "FOOD" }))).status,
    ).toBe(403);
    expect((await (await category()).DELETE(req("DELETE"), ctx({ id: anyCat.id }))).status).toBe(403);
    expect((await (await product()).PUT(req("PUT", {}), ctx({ id: anyProduct.id }))).status).toBe(403);
    expect((await (await duplicate()).POST(req("POST"), ctx({ id: anyProduct.id }))).status).toBe(403);
    expect((await (await importer()).POST(req("POST", { csv: "a" }))).status).toBe(403);
  });

  it("a role without publish rights cannot make a product live", async () => {
    const { can } = await import("@/lib/auth/permissions");
    const { needsPublish } = await import("@/lib/admin/catalogue");
    expect(can({ role: "EDITOR" }, "publish", "products")).toBe(true);
    expect(can({ role: "VIEWER" }, "publish", "products")).toBe(false);
    expect(needsPublish("DRAFT", "PUBLISHED")).toBe(true);
    expect(needsPublish("PUBLISHED", "ARCHIVED")).toBe(true);
    expect(needsPublish("DRAFT", "ARCHIVED")).toBe(false);
    expect(needsPublish(null, "DRAFT")).toBe(false);
  });

  it("super admin can delete an empty category; the slug is released", async () => {
    await as("SUPER_ADMIN");
    const c = await db.productCategory.create({
      data: { name: "Empty", slug: `empty-${stamp}`, family: "FOOD" },
    });
    expect((await (await category()).DELETE(req("DELETE"), ctx({ id: c.id }))).status).toBe(200);
    expect(await db.productCategory.findUnique({ where: { slug: `empty-${stamp}` } })).toBeNull();
  });
});
