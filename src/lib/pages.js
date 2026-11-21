import "server-only";

import { tag, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normaliseSection, SECTIONS } from "@/lib/sections/registry";

/**
 * Page content (Page + Section rows). Public pages read the published version (cached by tag
 * "page:<slug>"); preview reads the unpublished draft (never cached, admin only — see lib/preview.js).
 */

function shapeSections(list) {
  return list
    .filter((s) => Object.hasOwn(SECTIONS, s.type) && s.isVisible !== false)
    .map((s, i) => ({ id: s.id ?? `draft-${i}`, type: s.type, data: normaliseSection(s.type, s.data) }));
}

/** Published page or null (404). */
export async function getPublishedPage(slug) {
  "use cache";
  tag(TAGS.page(slug));
  try {
    const page = await db.page.findFirst({
      where: { slug, status: "PUBLISHED", deletedAt: null },
      select: { id: true, slug: true, title: true, seo: true, updatedAt: true, sections: { orderBy: { order: "asc" } } },
    });
    if (!page) return null;
    return { id: page.id, slug: page.slug, title: page.title, seo: page.seo ?? {}, updatedAt: page.updatedAt, sections: shapeSections(page.sections) };
  } catch (err) {
    logger.error("pages.read_failed", { slug, err });
    return null;
  }
}

/** Draft (or live, if no draft) for preview. Call only after isPreview() is true. */
export async function getPreviewPage(slug) {
  const page = await db.page.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, title: true, seo: true, draftData: true, updatedAt: true, sections: { orderBy: { order: "asc" } } },
  });
  if (!page) return null;
  const draft = page.draftData;
  return {
    id: page.id,
    slug: page.slug,
    title: draft?.title ?? page.title,
    seo: draft?.seo ?? page.seo ?? {},
    updatedAt: page.updatedAt,
    sections: shapeSections(draft?.sections ?? page.sections),
    isDraft: Boolean(draft),
  };
}
