import { z } from "zod";

import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { assertUsableMedia } from "@/lib/media/service";
import { idSchema } from "@/lib/validation/auth";
import { documentAttachSchema } from "@/lib/validation/media";

async function product(ctx) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const p = await db.product.findFirst({ where: { id, deletedAt: null }, select: { id: true, name: true } });
  if (!p) throw new HttpError(404);
  return p;
}

const docShape = (d) => ({ id: d.id, type: d.type, label: d.label, isPublic: d.isPublic, media: { id: d.media.id, url: d.media.url, bytes: d.media.bytes, originalName: d.media.originalName } });

/** GET /api/admin/products/:id/documents — COA / SDS / TDS attached to a product (Phase 7 todo 17). */
export const GET = route(async (_req, ctx) => {
  await requirePermission("read", "products");
  const p = await product(ctx);
  const docs = await db.productDocument.findMany({ where: { productId: p.id }, include: { media: true }, orderBy: { createdAt: "asc" } });
  return json({ ok: true, documents: docs.map(docShape) });
});

/** POST /api/admin/products/:id/documents { mediaId, type, label? } — attach a PDF from the library. */
export const POST = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "products");
  const p = await product(ctx);
  const { mediaId, type, label } = await readJson(req, documentAttachSchema);
  await assertUsableMedia(mediaId, "pdf");
  const exists = await db.productDocument.findFirst({ where: { productId: p.id, mediaId, type } });
  if (exists) throw new HttpError(400, "This document is already attached.");
  const doc = await db.productDocument.create({ data: { productId: p.id, mediaId, type, label: label || null }, include: { media: true } });
  await audit({ actorId: user.id, action: "product.document_attach", entity: "Product", entityId: p.id, diff: { type, mediaId } });
  return json({ ok: true, document: docShape(doc) }, { status: 201 });
});

/** DELETE /api/admin/products/:id/documents { documentId } — detach (the PDF stays in the library). */
export const DELETE = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "products");
  const p = await product(ctx);
  const { documentId } = await readJson(req, z.strictObject({ documentId: idSchema }));
  const doc = await db.productDocument.findFirst({ where: { id: documentId, productId: p.id } });
  if (!doc) throw new HttpError(404);
  await db.productDocument.delete({ where: { id: doc.id } });
  await audit({ actorId: user.id, action: "product.document_detach", entity: "Product", entityId: p.id, diff: { type: doc.type } });
  return json({ ok: true });
});
