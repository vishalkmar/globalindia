import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { assetUsage, serializeAsset } from "@/lib/media/service";
import { clientIp, hashIp } from "@/lib/security/ip";
import { stripTags } from "@/lib/security/sanitize";
import { idSchema } from "@/lib/validation/auth";
import { assetUpdateSchema } from "@/lib/validation/media";

async function load(ctx) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const asset = await db.mediaAsset.findFirst({ where: { id, deletedAt: null }, include: { uploadedBy: { select: { name: true, email: true } } } });
  if (!asset) throw new HttpError(404);
  return asset;
}

/** GET /api/admin/media/:id — asset plus where it is used. */
export const GET = route(async (_req, ctx) => {
  await requirePermission("read", "media");
  const asset = await load(ctx);
  return json({ ok: true, asset: serializeAsset(asset), usage: await assetUsage(asset.id) });
});

/** PATCH /api/admin/media/:id { alt?, folder?, focalX?, focalY? } */
export const PATCH = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "media");
  const asset = await load(ctx);
  const changes = await readJson(req, assetUpdateSchema);
  if (changes.alt !== undefined) changes.alt = stripTags(changes.alt, 200);
  if ((changes.focalX !== undefined) !== (changes.focalY !== undefined)) throw new HttpError(400, "Send both focal coordinates.");
  if (asset.type === "PDF" && (changes.focalX !== undefined)) throw new HttpError(400, "PDFs have no focal point.");
  const updated = await db.mediaAsset.update({
    where: { id: asset.id },
    data: changes,
    include: { uploadedBy: { select: { name: true, email: true } } },
  });
  invalidate(TAGS.mediaItem(asset.id), TAGS.media);
  await audit({ actorId: user.id, action: "media.update", entity: "MediaAsset", entityId: asset.id, diff: changes });
  return json({ ok: true, asset: serializeAsset(updated) });
});

/**
 * DELETE /api/admin/media/:id — refused while the file is used anywhere (Phase 7 todo 15).
 * Soft delete: the row leaves the library now; the stored file is purged by the 30-day trash job (Phase 16).
 */
export const DELETE = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("delete", "media");
  const asset = await load(ctx);
  const usage = await assetUsage(asset.id);
  if (usage.length) {
    throw new HttpError(409, "This file is still in use. Remove it from these places first.", { body: { usage } });
  }
  await db.mediaAsset.update({ where: { id: asset.id }, data: { deletedAt: new Date() } });
  invalidate(TAGS.mediaItem(asset.id), TAGS.media);
  await audit({ actorId: user.id, action: "media.delete", entity: "MediaAsset", entityId: asset.id, diff: { originalName: asset.originalName }, ipHash: hashIp(clientIp(req.headers)) });
  return json({ ok: true });
});
