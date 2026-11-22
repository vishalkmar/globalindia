import { duplicateProduct, loadProduct } from "@/lib/admin/products";
import { requirePermission } from "@/lib/auth/guard";
import { assertSameOrigin, HttpError, json, route } from "@/lib/http";
import { idSchema } from "@/lib/validation/auth";

/** POST /api/admin/products/:id/duplicate — creates a draft copy and returns its id. */
export const POST = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("create", "products");
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const product = await loadProduct(id);
  if (!product) throw new HttpError(404);
  const copyId = await duplicateProduct({ user, product });
  return json({ ok: true, id: copyId }, { status: 201 });
});
