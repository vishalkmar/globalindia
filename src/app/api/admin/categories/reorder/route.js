import { invalidateCatalogue } from "@/lib/admin/catalogue";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { reorderSchema } from "@/lib/validation/catalogue";

/**
 * PUT /api/admin/categories/reorder { ids } — new order within ONE family (the admin reorders one
 * family at a time). Every live category of that family must be listed exactly once.
 */
export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "categories");
  const { ids } = await readJson(req, reorderSchema);
  if (new Set(ids).size !== ids.length) throw new HttpError(400, "A category is listed twice.");
  const rows = await db.productCategory.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true, family: true },
  });
  const families = new Set(rows.map((r) => r.family));
  if (rows.length !== ids.length || families.size !== 1)
    throw new HttpError(400, "Reorder one family at a time.");
  const all = await db.productCategory.count({ where: { family: rows[0].family, deletedAt: null } });
  if (all !== ids.length) throw new HttpError(400, "The list is out of date. Reload and try again.");

  await db.$transaction(
    ids.map((id, order) => db.productCategory.update({ where: { id }, data: { order } })),
  );
  invalidateCatalogue();
  await audit({
    actorId: user.id,
    action: "category.reorder",
    entity: "ProductCategory",
    entityId: rows[0].family,
    diff: { count: ids.length },
  });
  return json({ ok: true });
});
