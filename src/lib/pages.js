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

/** URL-safe page slug: lowercase words joined by single hyphens (also guards the [page] route). */
export const PAGE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+){0,6}$/;

/**
 * Slugs of the published company pages served by the [page] route (home has its own route).
 * Build-time only; at least one slug is always returned because Cache Components requires it.
 */
export async function publishedPageSlugs() {
  try {
    const pages = await db.page.findMany({ where: { status: "PUBLISHED", deletedAt: null, slug: { not: "home" } }, select: { slug: true } });
    const slugs = pages.map((p) => p.slug).filter((s) => PAGE_SLUG.test(s));
    return slugs.length ? slugs : ["about"];
  } catch (err) {
    logger.warn("pages.slugs", { message: err.message });
    return ["about"];
  }
}
