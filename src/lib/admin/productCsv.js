import "server-only";

import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { productSchema } from "@/lib/validation/catalogue";

/**
 * Product CSV columns (Phase 12 todo 14). Lists use "|" between items. Specs, FAQs, images and
 * documents are not in the CSV (edit them in the form); an import keeps them as they are.
 */
export const CSV_COLUMNS = [
  "slug",
  "name",
  "category_slug",
  "cas_no",
  "grade",
  "purity",
  "form",
  "pack_sizes",
  "moq",
  "shelf_life",
  "dispatch_time",
  "applications",
  "summary",
  "brand_note",
  "is_sourced",
  "show_price",
  "indicative_price",
  "featured",
  "status",
];
export const CSV_MAX_ROWS = 1000;

const yes = (v) => (v ? "yes" : "no");
const list = (v) =>
  (v ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
const bool = (v, fallback) => {
  const s = String(v ?? "").toLowerCase();
  if (["yes", "y", "true", "1"].includes(s)) return true;
  if (["no", "n", "false", "0"].includes(s)) return false;
  return fallback;
};

export async function exportProductsCsv() {
  const rows = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: { family: "asc" } }, { category: { order: "asc" } }, { order: "asc" }],
    include: { category: { select: { slug: true } } },
  });
  return toCsv(
    CSV_COLUMNS,
    rows.map((p) => ({
      slug: p.slug,
      name: p.name,
      category_slug: p.category.slug,
      cas_no: p.casNo ?? "",
      grade: p.grade ?? "",
      purity: p.purity ?? "",
      form: p.form ?? "",
      pack_sizes: p.packSizes.join(" | "),
      moq: p.moq ?? "",
      shelf_life: p.shelfLife ?? "",
      dispatch_time: p.dispatchTime ?? "",
      applications: p.applications.join(" | "),
      summary: p.summary,
      brand_note: p.brandNote ?? "",
      is_sourced: yes(p.isSourced),
      show_price: yes(p.showPrice),
      indicative_price: p.indicativePrice ?? "",
      featured: yes(p.featured),
      status: p.status,
    })),
  );
}

/**
 * Turn one CSV row into validated product data, merged over the existing product (if the slug exists)
 * so columns the CSV does not carry (specs, FAQs, SEO, media) are kept.
 * @returns {{ ok: true, data: object } | { ok: false, errors: string[] }}
 */
export function productFromRow(row, { existing, categoryIdBySlug }) {
  const categoryId = categoryIdBySlug.get(row.category_slug);
  if (!categoryId) return { ok: false, errors: [`Unknown category "${row.category_slug || "(empty)"}".`] };
  const base = existing ?? {};
  const candidate = {
    ...base,
    slug: row.slug,
    name: row.name,
    categoryId,
    casNo: row.cas_no ?? "",
    grade: row.grade ?? "",
    purity: row.purity ?? "",
    form: row.form ?? "",
    packSizes: list(row.pack_sizes),
    moq: row.moq ?? "",
    shelfLife: row.shelf_life ?? "",
    dispatchTime: row.dispatch_time ?? "",
    applications: list(row.applications),
    summary: row.summary ?? "",
    brandNote: row.brand_note ?? "",
    isSourced: bool(row.is_sourced, base.isSourced ?? true),
    showPrice: bool(row.show_price, base.showPrice ?? false),
    indicativePrice: row.indicative_price ?? "",
    featured: bool(row.featured, base.featured ?? false),
    status: (row.status || base.status || "DRAFT").toUpperCase(),
  };
  const r = productSchema.safeParse(candidate);
  if (!r.success)
    return {
      ok: false,
      errors: r.error.issues.slice(0, 3).map((i) => `${i.path.join(".") || "row"}: ${i.message}`),
    };
  return { ok: true, data: r.data };
}
