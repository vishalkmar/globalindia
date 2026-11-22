import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";

/** Admin view of the gallery: every item, hidden ones included, with its image. */
export async function loadGallery() {
  const rows = await db.galleryItem.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      mediaId: true,
      caption: true,
      category: true,
      isVisible: true,
      media: { select: { id: true, url: true, alt: true, type: true, width: true, height: true, originalName: true, focalX: true, focalY: true, deletedAt: true } },
    },
  });
  return rows.map(({ media: { deletedAt, ...media }, ...item }) => ({ ...item, media, missing: Boolean(deletedAt) }));
}

/**
 * Every referenced file must be a live image with alt text (one query for the whole list).
 * Returns field errors keyed like the form ("items.3.mediaId") so the editor can point at the row.
 */
export async function assertGalleryMedia(items) {
  const ids = items.map((i) => i.mediaId);
  const found = await db.mediaAsset.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true, type: true, alt: true } });
  const byId = new Map(found.map((m) => [m.id, m]));
  const fields = {};
  items.forEach((item, i) => {
    const m = byId.get(item.mediaId);
    if (!m) fields[`items.${i}.mediaId`] = "This photo was deleted from the media library.";
    else if (m.type !== "IMAGE") fields[`items.${i}.mediaId`] = "Only images can go in the gallery.";
    else if (!m.alt.trim()) fields[`items.${i}.mediaId`] = "Add alt text to this image in the media library first.";
  });
  if (Object.keys(fields).length) throw new HttpError(400, "Some photos cannot be used.", { body: { fields } });
}
