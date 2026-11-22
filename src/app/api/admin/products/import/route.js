import { z } from "zod";

import { productEditorShape } from "@/lib/admin/catalogue";
import { CSV_COLUMNS, CSV_MAX_ROWS, productFromRow } from "@/lib/admin/productCsv";
import { loadProduct, saveProduct } from "@/lib/admin/products";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { parseCsvObjects } from "@/lib/csv";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";

const MAX_BYTES = 2 * 1024 * 1024;
const bodySchema = z.strictObject({
  csv: z.string().min(1, "The file is empty.").max(MAX_BYTES, "The file is larger than 2 MB."),
  apply: z.boolean().default(false),
});

/**
 * POST /api/admin/products/import { csv, apply } — bulk create/update by slug (Phase 12 todo 14).
 * apply=false is a dry run: every row is checked and the plan returned, nothing is written.
 * apply=true writes only when EVERY row is valid (all or nothing from the editor's point of view).
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "products");
  if (!can(user, "create", "products")) throw new HttpError(403);
  const { csv, apply } = await readJson(req, bodySchema, { maxBytes: MAX_BYTES + 4096 });

  let parsed;
  try {
    parsed = parseCsvObjects(csv);
  } catch (err) {
    throw new HttpError(400, `The CSV could not be read: ${err.message}`);
  }
  const missing = ["slug", "name", "category_slug"].filter((c) => !parsed.header.includes(c));
  if (missing.length)
    throw new HttpError(
      400,
      `Missing column(s): ${missing.join(", ")}. Start from an export to get the right columns.`,
    );
  const unknown = parsed.header.filter((h) => !CSV_COLUMNS.includes(h));
  if (unknown.length) throw new HttpError(400, `Unknown column(s): ${unknown.join(", ")}.`);
  if (!parsed.rows.length) throw new HttpError(400, "The file has no product rows.");
  if (parsed.rows.length > CSV_MAX_ROWS)
    throw new HttpError(400, `Import up to ${CSV_MAX_ROWS} rows at a time.`);

  const categories = await db.productCategory.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true },
  });
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const slugs = parsed.rows.map((r) => r.slug);
  const existingRows = await db.product.findMany({
    where: { slug: { in: slugs }, deletedAt: null },
    select: { id: true },
  });
  const existingById = await Promise.all(existingRows.map((r) => loadProduct(r.id)));
  const existingBySlug = new Map(existingById.map((p) => [p.slug, p]));

  const seen = new Set();
  const plan = parsed.rows.map((row, i) => {
    const line = i + 2; // header is line 1
    if (seen.has(row.slug))
      return { line, slug: row.slug, action: "error", errors: ["This slug appears twice in the file."] };
    seen.add(row.slug);
    const before = existingBySlug.get(row.slug) ?? null;
    const result = productFromRow(row, {
      existing: before ? productEditorShape(before) : null,
      categoryIdBySlug,
    });
    if (!result.ok) return { line, slug: row.slug, action: "error", errors: result.errors };
    if (
      result.data.status === "PUBLISHED" &&
      before?.status !== "PUBLISHED" &&
      !can(user, "publish", "products")
    ) {
      return { line, slug: row.slug, action: "error", errors: ["You cannot publish products. Use DRAFT."] };
    }
    return { line, slug: row.slug, action: before ? "update" : "create", data: result.data, before };
  });

  const summary = { create: 0, update: 0, error: 0 };
  for (const p of plan) summary[p.action] += 1;
  const report = plan.map(({ line, slug, action, errors }) => ({ line, slug, action, errors: errors ?? [] }));

  if (!apply || summary.error) return json({ ok: true, applied: false, summary, rows: report });

  for (const p of plan)
    await saveProduct({
      user,
      before: p.before,
      data: p.data,
      note: "CSV import",
      auditAction: p.before ? "product.import_update" : "product.import_create",
    });
  await audit({
    actorId: user.id,
    action: "product.import",
    entity: "Product",
    entityId: "csv",
    diff: summary,
  });
  return json({ ok: true, applied: true, summary, rows: report });
});
