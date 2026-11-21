import "server-only";

import { db } from "@/lib/db";
import { redact } from "@/lib/logger";

/**
 * Revision history (Phase 6 todo 12): every save of a page, product, post... stores a snapshot.
 * Only the newest 20 per item are kept. Restoring loads a snapshot back into the editor;
 * the user then saves it like any other change (so a restore is itself a new revision).
 */

export const MAX_REVISIONS = 20;

/** Entity name -> permission resource. Only these entities have revisions. */
export const REVISION_ENTITIES = {
  page: "pages",
  product: "products",
  category: "categories",
  post: "insights",
  industry: "industries",
  theme: "theme",
  settings: "siteSettings",
  menu: "menus",
};

/**
 * @param {{ entity: keyof typeof REVISION_ENTITIES, entityId: string, data: object, authorId?: string, note?: string }} r
 * @param {import('@prisma/client').Prisma.TransactionClient} [tx]
 */
export async function saveRevision({ entity, entityId, data, authorId = null, note = null }, tx = db) {
  if (!(entity in REVISION_ENTITIES)) throw new Error(`No revisions for entity ${entity}`);
  await tx.revision.create({ data: { entity, entityId, data: redact(data), authorId, note: note?.slice(0, 200) ?? null } });
  const old = await tx.revision.findMany({
    where: { entity, entityId },
    orderBy: { createdAt: "desc" },
    skip: MAX_REVISIONS,
    select: { id: true },
  });
  if (old.length) await tx.revision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
}

export async function listRevisions(entity, entityId) {
  return db.revision.findMany({
    where: { entity, entityId },
    orderBy: { createdAt: "desc" },
    take: MAX_REVISIONS,
    select: { id: true, note: true, createdAt: true, author: { select: { name: true, email: true } } },
  });
}

export async function getRevision(id) {
  return db.revision.findUnique({ where: { id } });
}
