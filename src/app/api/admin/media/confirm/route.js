import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { readIntent } from "@/lib/media/intent";
import { uploadLimits } from "@/lib/media/limits";
import { inspectUploaded, removeStored, serializeAsset } from "@/lib/media/service";
import { clientIp, hashIp } from "@/lib/security/ip";
import { confirmSchema } from "@/lib/validation/media";

/**
 * POST /api/admin/media/confirm { intent, folder, alt, originalName }
 * Step 3: verifies the signed intent, inspects the stored bytes (type, size, dimensions, PDF scan),
 * then creates the MediaAsset — or, for a replace, updates the same row (same id everywhere, new version).
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("create", "media");
  const body = await readJson(req, confirmSchema);
  const intent = readIntent(body.intent, user.id);
  if (!intent) throw new HttpError(400, "This upload has expired. Please try again.");

  const limits = await uploadLimits();
  const stored = await inspectUploaded(intent.driver, intent.id, intent.kind, limits);
  const ipHash = hashIp(clientIp(req.headers));

  try {
    if (intent.replaceId) {
      await requirePermission("update", "media");
      const before = await db.mediaAsset.findFirst({ where: { id: intent.replaceId, deletedAt: null } });
      if (!before) throw new HttpError(404);
      const asset = await db.mediaAsset.update({
        where: { id: before.id },
        data: {
          url:
            intent.driver === "local"
              ? stored.url.replace(/\?v=\d+$/, `?v=${before.version + 1}`)
              : stored.url,
          format: stored.format,
          bytes: stored.bytes,
          width: stored.width,
          height: stored.height,
          sha256: stored.sha256,
          version: { increment: 1 },
          focalX: null,
          focalY: null,
        },
        include: { uploadedBy: { select: { name: true, email: true } } },
      });
      invalidate(TAGS.mediaItem(asset.id), TAGS.media);
      await audit({
        actorId: user.id,
        action: "media.replace",
        entity: "MediaAsset",
        entityId: asset.id,
        diff: { bytes: asset.bytes, format: asset.format },
        ipHash,
      });
      return json({ ok: true, asset: serializeAsset(asset) });
    }

    const asset = await db.mediaAsset.create({
      data: {
        publicId: stored.publicId,
        url: stored.url,
        driver: intent.driver,
        type: intent.kind === "pdf" ? "PDF" : "IMAGE",
        format: stored.format,
        bytes: stored.bytes,
        width: stored.width,
        height: stored.height,
        sha256: stored.sha256,
        alt: body.alt,
        folder: body.folder,
        originalName: body.originalName || null,
        uploadedById: user.id,
      },
      include: { uploadedBy: { select: { name: true, email: true } } },
    });
    await audit({
      actorId: user.id,
      action: "media.upload",
      entity: "MediaAsset",
      entityId: asset.id,
      diff: { type: asset.type, bytes: asset.bytes, folder: asset.folder },
      ipHash,
    });
    return json({ ok: true, asset: serializeAsset(asset) }, { status: 201 });
  } catch (err) {
    if (!intent.replaceId)
      await removeStored({
        driver: intent.driver,
        publicId: stored.publicId,
        format: stored.format,
        type: intent.kind === "pdf" ? "PDF" : "IMAGE",
      });
    throw err;
  }
});
