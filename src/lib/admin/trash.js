import "server-only";

import { audit } from "@/lib/audit";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { logger } from "@/lib/logger";
import { removeStored } from "@/lib/media/service";

/**
 * Trash (Phase 16 todo 07): soft-deleted items stay restorable for 30 days, then the purge job removes
 * them for good. Restored items come back as drafts with their original slug (or "-restored" if that
 * slug has been reused meanwhile).
 */
export const TRASH_DAYS = 30;

const original = (slug) => slug.replace(/--deleted-[a-z0-9]{1,8}$/, "");

export const TRASH_TYPES = {
  product: {
    resource: "products",
    model: "product",
    label: (r) => r.name,
    select: { id: true, name: true, slug: true, deletedAt: true, categoryId: true },
    tags: [TAGS.products, TAGS.categories],
  },
  category: {
    resource: "categories",
    model: "productCategory",
    label: (r) => r.name,
    select: { id: true, name: true, slug: true, deletedAt: true },
    tags: [TAGS.categories, TAGS.products],
  },
  post: {
    resource: "insights",
    model: "post",
    label: (r) => r.title,
    select: { id: true, title: true, slug: true, deletedAt: true },
    tags: [TAGS.posts],
  },
  industry: {
    resource: "industries",
    model: "industry",
    label: (r) => r.name,
    select: { id: true, name: true, slug: true, deletedAt: true },
    tags: [TAGS.industries],
  },
  page: {
    resource: "pages",
    model: "page",
    label: (r) => r.title,
    select: { id: true, title: true, slug: true, deletedAt: true },
    tags: [],
  },
  media: {
    resource: "media",
    model: "mediaAsset",
    label: (r) => r.originalName || r.alt || "File",
    select: { id: true, originalName: true, alt: true, type: true, deletedAt: true },
    tags: [TAGS.media],
  },
};

/** Items in the trash that the user may see, newest first. */
export async function listTrash(canRead) {
  const since = new Date(Date.now() - TRASH_DAYS * 86_400_000);
  const groups = await Promise.all(
    Object.entries(TRASH_TYPES)
      .filter(([, t]) => canRead(t.resource))
      .map(async ([type, t]) => {
        const rows = await db[t.model].findMany({
          where: { deletedAt: { not: null, gte: since } },
          orderBy: { deletedAt: "desc" },
          select: t.select,
          take: 200,
        });
        return rows.map((r) => ({
          type,
          id: r.id,
          label: t.label(r),
          deletedAt: r.deletedAt,
          purgeAt: new Date(r.deletedAt.getTime() + TRASH_DAYS * 86_400_000),
        }));
      }),
  );
  return groups.flat().sort((a, b) => b.deletedAt - a.deletedAt);
}

async function freeSlug(model, slug) {
  const base = original(slug);
  if (!(await db[model].findUnique({ where: { slug: base }, select: { id: true } }))) return base;
  for (let n = 1; n < 100; n++) {
    const candidate = n === 1 ? `${base}-restored` : `${base}-restored-${n}`;
    if (!(await db[model].findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
  }
  throw new HttpError(409, "Could not find a free address for the restored item.");
}

/** Restore one item as a draft. */
export async function restoreItem({ user, type, id }) {
  const t = TRASH_TYPES[type];
  const row = await db[t.model].findFirst({
    where: { id, deletedAt: { not: null } },
    select: { ...t.select, ...(t.select.slug ? { slug: true } : {}) },
  });
  if (!row) throw new HttpError(404);
  if (type === "product") {
    const cat = await db.productCategory.findUnique({
      where: { id: row.categoryId },
      select: { deletedAt: true, name: true },
    });
    if (cat?.deletedAt) throw new HttpError(400, `Restore its category (${cat.name}) first.`);
  }
  const data = { deletedAt: null };
  if (row.slug) data.slug = await freeSlug(t.model, row.slug);
  if (type !== "media") data.status = "DRAFT";
  await db[t.model].update({ where: { id }, data });
  if (t.tags.length) invalidate(...t.tags);
  await audit({
    actorId: user.id,
    action: `${type}.restore`,
    entity: type,
    entityId: id,
    diff: { slug: data.slug },
  });
  return { slug: data.slug ?? null };
}

/** Delete one item for good (super admin only, checked by the caller). Media files are removed from storage. */
export async function destroyItem({ user, type, id }) {
  const t = TRASH_TYPES[type];
  const row = await db[t.model].findFirst({ where: { id, deletedAt: { not: null } } });
  if (!row) throw new HttpError(404);
  await destroyRow(type, row);
  await audit({ actorId: user.id, action: `${type}.destroy`, entity: type, entityId: id });
}

async function destroyRow(type, row) {
  const t = TRASH_TYPES[type];
  if (type === "category") {
    const products = await db.product.count({ where: { categoryId: row.id } });
    if (products)
      throw new HttpError(
        400,
        "Products (also in the trash) still belong to this category. Delete those first.",
      );
  }
  if (type === "media") {
    const docs = await db.productDocument.count({ where: { mediaId: row.id } });
    if (docs) throw new HttpError(400, "This file is still attached to a product as a document.");
    await removeStored(row).catch((err) =>
      logger.warn("trash.storage_delete_failed", { message: err.message }),
    );
  }
  await db[t.model].delete({ where: { id: row.id } });
}

/** Purge job: everything deleted more than 30 days ago. Returns counts; one failure never stops the rest. */
export async function purgeExpired() {
  const before = new Date(Date.now() - TRASH_DAYS * 86_400_000);
  const result = {};
  for (const type of ["product", "post", "industry", "page", "category", "media"]) {
    const t = TRASH_TYPES[type];
    const rows = await db[t.model].findMany({ where: { deletedAt: { not: null, lt: before } } });
    let done = 0;
    for (const row of rows) {
      try {
        await destroyRow(type, row);
        done += 1;
      } catch (err) {
        logger.warn("trash.purge_skipped", { type, id: row.id, message: err.message });
      }
    }
    result[type] = done;
  }
  await audit({ actorId: null, action: "trash.purge", entity: "Trash", entityId: "cron", diff: result });
  return result;
}
