import { assertGalleryMedia, loadGallery } from "@/lib/admin/gallery";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { assertSameOrigin, json, readJson, route } from "@/lib/http";
import { saveRevision } from "@/lib/revisions";
import { gallerySchema } from "@/lib/validation/gallery";

/** GET /api/admin/gallery — every gallery photo in display order, hidden ones included. */
export const GET = route(async () => {
  await requirePermission("read", "media");
  return json({ ok: true, items: await loadGallery() });
});

/**
 * PUT /api/admin/gallery { items } — saves the whole gallery in one transaction (order = array order).
 * Each photo must be a live image with alt text. The public gallery cache is refreshed straight away.
 */
export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "media");
  const { items } = await readJson(req, gallerySchema, { maxBytes: 64 * 1024 });
  await assertGalleryMedia(items);

  await db.$transaction(async (tx) => {
    await tx.galleryItem.deleteMany({});
    if (items.length)
      await tx.galleryItem.createMany({ data: items.map((item, order) => ({ ...item, order })) });
    await saveRevision({ entity: "gallery", entityId: "gallery", data: { items }, authorId: user.id }, tx);
  });

  invalidate(TAGS.gallery);
  await audit({
    actorId: user.id,
    action: "gallery.update",
    entity: "GalleryItem",
    entityId: "gallery",
    diff: { count: items.length, hidden: items.filter((i) => !i.isVisible).length },
  });
  return json({ ok: true, items: await loadGallery() });
});
