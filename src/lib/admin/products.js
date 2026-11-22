import "server-only";

import { audit } from "@/lib/audit";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { saveRevision } from "@/lib/revisions";

import {
  assertProductMedia,
  assertSlugFree,
  categoryPath,
  invalidateCatalogue,
  needsPublish,
  productColumns,
  productEditorInclude,
  productEditorShape,
  productPath,
  recordRedirects,
  retiredSlug,
  writeProductMedia,
} from "./catalogue";

/** Columns shown in the admin products table. */
export const PRODUCT_LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  casNo: true,
  status: true,
  featured: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true, family: true } },
};

async function liveCategory(id) {
  const c = await db.productCategory.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!c)
    throw new HttpError(400, "Please check the highlighted fields.", {
      body: { fields: { categoryId: "Choose a category." } },
    });
  return c;
}

export async function loadProduct(id) {
  return db.product.findFirst({ where: { id, deletedAt: null }, include: productEditorInclude });
}

/**
 * Create (before = null) or update a product from validated form data. Handles the publish
 * permission, slug conflicts, media checks, gallery/documents, 301s for changed URLs, revision,
 * cache invalidation and the audit log. Returns the product id.
 */
export async function saveProduct({ user, before, data, note = null, auditAction }) {
  if (needsPublish(before?.status ?? null, data.status) && !can(user, "publish", "products")) {
    throw new HttpError(
      403,
      before
        ? "Only a publisher can change whether this product is live."
        : "You can save it as a draft; publishing needs a publisher.",
    );
  }
  await assertSlugFree("product", data.slug, before?.id ?? null);
  const category = await liveCategory(data.categoryId);
  await assertProductMedia(data);

  const columns = productColumns(data);
  const becomesLive = data.status === "PUBLISHED" && before?.status !== "PUBLISHED";
  let moved = false;

  const id = await db.$transaction(async (tx) => {
    let productId;
    if (before) {
      await tx.product.update({
        where: { id: before.id },
        data: { ...columns, ...(becomesLive ? { publishedAt: new Date() } : {}) },
      });
      productId = before.id;
      const oldPath = productPath(before.category.slug, before.slug);
      const newPath = productPath(category.slug, data.slug);
      if (oldPath !== newPath) moved = await recordRedirects(tx, [[oldPath, newPath]]);
    } else {
      const last = await tx.product.aggregate({
        where: { categoryId: category.id, deletedAt: null },
        _max: { order: true },
      });
      const created = await tx.product.create({
        data: {
          ...columns,
          order: (last._max.order ?? -1) + 1,
          publishedAt: becomesLive ? new Date() : null,
        },
      });
      productId = created.id;
    }
    await writeProductMedia(tx, productId, data);
    await saveRevision({ entity: "product", entityId: productId, data, authorId: user.id, note }, tx);
    return productId;
  });

  invalidateCatalogue({
    productSlugs: [data.slug, ...(before ? [before.slug] : [])],
    categorySlugs: [category.slug, ...(before ? [before.category.slug] : [])],
    redirects: moved,
  });
  const diff = { name: data.name, status: data.status };
  if (before && before.slug !== data.slug) diff.slug = [before.slug, data.slug];
  if (before && before.categoryId !== data.categoryId) diff.category = [before.category.slug, category.slug];
  await audit({
    actorId: user.id,
    action: auditAction ?? (before ? "product.update" : "product.create"),
    entity: "Product",
    entityId: id,
    diff,
  });
  return id;
}

/** Soft delete: frees the slug and sends the old URL to its category page (keeps links working). */
export async function deleteProduct({ user, product }) {
  const oldPath = productPath(product.category.slug, product.slug);
  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
        featured: false,
        slug: retiredSlug(product.slug, product.id),
      },
    });
    if (product.status === "PUBLISHED")
      await recordRedirects(tx, [[oldPath, categoryPath(product.category.slug)]]);
  });
  invalidateCatalogue({
    productSlugs: [product.slug],
    categorySlugs: [product.category.slug],
    redirects: product.status === "PUBLISHED",
  });
  await audit({
    actorId: user.id,
    action: "product.delete",
    entity: "Product",
    entityId: product.id,
    diff: { name: product.name },
  });
}

/** First free "<slug>-copy", "<slug>-copy-2", ... */
export async function freeCopySlug(slug) {
  const stem = `${slug.slice(0, 70)}-copy`;
  const taken = new Set(
    (await db.product.findMany({ where: { slug: { startsWith: stem } }, select: { slug: true } })).map(
      (p) => p.slug,
    ),
  );
  if (!taken.has(stem)) return stem;
  for (let n = 2; n < 1000; n++) if (!taken.has(`${stem}-${n}`)) return `${stem}-${n}`;
  throw new HttpError(400, "Too many copies of this product.");
}

/** Duplicate (Phase 12 todo 15): a draft copy with the same details, images and documents. */
export async function duplicateProduct({ user, product }) {
  const data = productEditorShape(product);
  const copy = {
    ...data,
    name: `${data.name} (copy)`.slice(0, 120),
    slug: await freeCopySlug(product.slug),
    status: "DRAFT",
    featured: false,
  };
  return saveProduct({
    user,
    before: null,
    data: copy,
    note: `Copied from ${product.slug}`,
    auditAction: "product.duplicate",
  });
}
