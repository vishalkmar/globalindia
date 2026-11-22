import { assertMediaRefs, assertSlugFree, invalidateCatalogue } from "@/lib/admin/catalogue";
import { audit } from "@/lib/audit";
import { denyAccess, requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { assertSameOrigin, json, readJson, route } from "@/lib/http";
import { saveRevision } from "@/lib/revisions";
import { sanitizeRichText } from "@/lib/security/sanitize";
import { categorySchema } from "@/lib/validation/catalogue";

/** GET /api/admin/categories — every category (drafts included) in family order, with product counts. */
export const GET = route(async () => {
  await requirePermission("read", "categories");
  const rows = await db.productCategory.findMany({
    where: { deletedAt: null },
    orderBy: [{ family: "asc" }, { order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      family: true,
      status: true,
      order: true,
      updatedAt: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  });
  return json({
    ok: true,
    categories: rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })),
  });
});

/** POST /api/admin/categories — create a category (publishing it needs the publish permission). */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("create", "categories");
  const data = await readJson(req, categorySchema, { maxBytes: 128 * 1024 });
  if (data.status === "PUBLISHED" && !can(user, "publish", "categories"))
    await denyAccess(user, { action: "publish", resource: "categories", message: "You can save it as a draft; publishing needs a publisher." });
  await assertSlugFree("productCategory", data.slug);
  await assertMediaRefs([{ path: "imageId", id: data.imageId, kind: "image" }]);
  const last = await db.productCategory.aggregate({
    where: { family: data.family, deletedAt: null },
    _max: { order: true },
  });

  const category = await db.$transaction(async (tx) => {
    const c = await tx.productCategory.create({
      data: { ...data, guide: sanitizeRichText(data.guide), order: (last._max.order ?? -1) + 1 },
    });
    await saveRevision(
      {
        entity: "category",
        entityId: c.id,
        data: { ...data, guide: c.guide },
        authorId: user.id,
        note: "Created",
      },
      tx,
    );
    return c;
  });
  invalidateCatalogue({ categorySlugs: [category.slug] });
  await audit({
    actorId: user.id,
    action: "category.create",
    entity: "ProductCategory",
    entityId: category.id,
    diff: { name: category.name, status: category.status },
  });
  return json({ ok: true, id: category.id }, { status: 201 });
});
