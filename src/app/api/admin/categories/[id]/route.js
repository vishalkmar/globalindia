import {
  assertMediaRefs,
  assertSlugFree,
  categoryEditorShape,
  categoryPath,
  invalidateCatalogue,
  needsPublish,
  productPath,
  recordRedirects,
  retiredSlug,
} from "@/lib/admin/catalogue";
import { audit } from "@/lib/audit";
import { denyAccess, requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { saveRevision } from "@/lib/revisions";
import { sanitizeRichText } from "@/lib/security/sanitize";
import { idSchema } from "@/lib/validation/auth";
import { categorySchema } from "@/lib/validation/catalogue";

async function load(ctx) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const c = await db.productCategory.findFirst({ where: { id, deletedAt: null } });
  if (!c) throw new HttpError(404);
  return c;
}

/** GET /api/admin/categories/:id — editor data. */
export const GET = route(async (_req, ctx) => {
  await requirePermission("read", "categories");
  const c = await load(ctx);
  const productCount = await db.product.count({ where: { categoryId: c.id, deletedAt: null } });
  return json({ ok: true, id: c.id, category: categoryEditorShape(c), productCount, updatedAt: c.updatedAt });
});

/**
 * PUT /api/admin/categories/:id — save. A slug change adds 301s for the category page AND every
 * product URL under it, so old links and search results keep working.
 */
export const PUT = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "categories");
  const before = await load(ctx);
  const data = await readJson(req, categorySchema, { maxBytes: 128 * 1024 });
  if (needsPublish(before.status, data.status) && !can(user, "publish", "categories"))
    await denyAccess(user, { action: "publish", resource: "categories", message: "Only a publisher can change whether this category is live." });
  await assertSlugFree("productCategory", data.slug, before.id);
  await assertMediaRefs([{ path: "imageId", id: data.imageId, kind: "image" }]);
  const guide = sanitizeRichText(data.guide);
  const familyChanged = data.family !== before.family;
  const last = familyChanged
    ? await db.productCategory.aggregate({
        where: { family: data.family, deletedAt: null },
        _max: { order: true },
      })
    : null;

  let moved = false;
  await db.$transaction(async (tx) => {
    await tx.productCategory.update({
      where: { id: before.id },
      data: { ...data, guide, ...(familyChanged ? { order: (last._max.order ?? -1) + 1 } : {}) },
    });
    if (data.slug !== before.slug) {
      const products = await tx.product.findMany({
        where: { categoryId: before.id, deletedAt: null },
        select: { slug: true },
      });
      moved = await recordRedirects(tx, [
        [categoryPath(before.slug), categoryPath(data.slug)],
        ...products.map((p) => [productPath(before.slug, p.slug), productPath(data.slug, p.slug)]),
      ]);
    }
    await saveRevision(
      { entity: "category", entityId: before.id, data: { ...data, guide }, authorId: user.id },
      tx,
    );
  });

  invalidateCatalogue({ categorySlugs: [before.slug, data.slug], redirects: moved });
  const diff = {};
  if (data.slug !== before.slug) diff.slug = [before.slug, data.slug];
  if (data.status !== before.status) diff.status = [before.status, data.status];
  await audit({
    actorId: user.id,
    action: "category.update",
    entity: "ProductCategory",
    entityId: before.id,
    diff,
  });
  return json({ ok: true });
});

/** DELETE /api/admin/categories/:id — soft delete; refused while products still belong to it. */
export const DELETE = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("delete", "categories");
  const c = await load(ctx);
  const count = await db.product.count({ where: { categoryId: c.id, deletedAt: null } });
  if (count)
    throw new HttpError(
      400,
      count === 1 ? "Move or delete its 1 product first." : `Move or delete its ${count} products first.`,
    );
  await db.productCategory.update({
    where: { id: c.id },
    data: { deletedAt: new Date(), status: "ARCHIVED", slug: retiredSlug(c.slug, c.id) },
  });
  invalidateCatalogue({ categorySlugs: [c.slug] });
  await audit({
    actorId: user.id,
    action: "category.delete",
    entity: "ProductCategory",
    entityId: c.id,
    diff: { name: c.name },
  });
  return json({ ok: true });
});
