import { productEditorShape, productPath } from "@/lib/admin/catalogue";
import { deleteProduct, loadProduct, saveProduct } from "@/lib/admin/products";
import { requirePermission } from "@/lib/auth/guard";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { idSchema } from "@/lib/validation/auth";
import { productSchema } from "@/lib/validation/catalogue";

async function load(ctx) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const p = await loadProduct(id);
  if (!p) throw new HttpError(404);
  return p;
}

/** GET /api/admin/products/:id — editor data plus the public URL. */
export const GET = route(async (_req, ctx) => {
  await requirePermission("read", "products");
  const p = await load(ctx);
  return json({
    ok: true,
    id: p.id,
    product: productEditorShape(p),
    path: productPath(p.category.slug, p.slug),
    updatedAt: p.updatedAt,
  });
});

/** PUT /api/admin/products/:id — save everything (form, gallery, documents) in one transaction. */
export const PUT = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "products");
  const before = await load(ctx);
  const data = await readJson(req, productSchema, { maxBytes: 256 * 1024 });
  await saveProduct({ user, before, data });
  const after = await loadProduct(before.id);
  return json({
    ok: true,
    product: productEditorShape(after),
    path: productPath(after.category.slug, after.slug),
  });
});

/** DELETE /api/admin/products/:id — soft delete (old URL redirects to the category). */
export const DELETE = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("delete", "products");
  const product = await load(ctx);
  await deleteProduct({ user, product });
  return json({ ok: true });
});
