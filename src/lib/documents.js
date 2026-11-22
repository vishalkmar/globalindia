import "server-only";

import { db } from "@/lib/db";

/**
 * Which PDFs the public may download (Phase 28 todo 08): a PDF from the media library that is either
 * a public document of a published product or listed in a visible "Downloads" section of a published
 * page. Everything else (batch COAs, drafts, deleted files) is refused, whatever id is asked for.
 * @returns {Promise<object|null>} the media asset, or null
 */
export async function publicDocument(mediaId) {
  if (typeof mediaId !== "string" || !/^c[a-z0-9]{20,32}$/.test(mediaId)) return null;
  const media = await db.mediaAsset.findFirst({ where: { id: mediaId, type: "PDF", deletedAt: null } });
  if (!media) return null;
  const productDoc = await db.productDocument.findFirst({
    where: { mediaId, isPublic: true, product: { status: "PUBLISHED", deletedAt: null } },
    select: { id: true },
  });
  if (productDoc) return media;
  const sections = await db.section.findMany({
    where: { type: "downloads", isVisible: true, page: { status: "PUBLISHED", deletedAt: null } },
    select: { data: true },
  });
  const listed = sections.some((s) => Array.isArray(s.data?.items) && s.data.items.some((i) => i?.mediaId === mediaId));
  return listed ? media : null;
}
