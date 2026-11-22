import "server-only";

import { tag, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Public catalogue reads (Phase 12). Cached with 'use cache' and invalidated by admin saves through
 * the products / categories / redirects tags. Only PUBLISHED, non-deleted rows in PUBLISHED,
 * non-deleted categories are ever returned.
 */

const PUBLISHED = { status: "PUBLISHED", deletedAt: null };

const imageSelect = {
  select: { url: true, alt: true, width: true, height: true, focalX: true, focalY: true },
};

const listProductSelect = {
  id: true,
  name: true,
  slug: true,
  casNo: true,
  grade: true,
  purity: true,
  form: true,
  packSizes: true,
  moq: true,
  applications: true,
  featured: true,
  image: imageSelect,
};

async function safe(label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    logger.error("catalogue.read_failed", { label, err });
    return fallback;
  }
}

/** Every published category with its published products (the products hub and mega menu counts). */
export async function getCatalogue() {
  "use cache";
  tag(TAGS.products, TAGS.categories, TAGS.media);
  return safe(
    "catalogue",
    () =>
      db.productCategory.findMany({
        where: PUBLISHED,
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          family: true,
          intro: true,
          products: {
            where: PUBLISHED,
            orderBy: [{ order: "asc" }, { name: "asc" }],
            select: listProductSelect,
          },
        },
      }),
    [],
  );
}

/** One published category with its products, buying guide and FAQs; null when not found. */
export async function getCategoryPage(slug) {
  "use cache";
  tag(TAGS.products, TAGS.categories, TAGS.media, TAGS.category(slug));
  return safe(
    "category",
    async () => {
      const category = await db.productCategory.findFirst({
        where: { ...PUBLISHED, slug },
        select: {
          id: true,
          slug: true,
          name: true,
          family: true,
          intro: true,
          guide: true,
          faqs: true,
          seo: true,
          image: imageSelect,
          products: {
            where: PUBLISHED,
            orderBy: [{ order: "asc" }, { name: "asc" }],
            select: listProductSelect,
          },
        },
      });
      if (!category) return null;
      const related = await db.productCategory.findMany({
        where: { ...PUBLISHED, family: category.family, id: { not: category.id } },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: { slug: true, name: true, _count: { select: { products: { where: PUBLISHED } } } },
      });
      return { ...category, faqs: Array.isArray(category.faqs) ? category.faqs : [], related };
    },
    null,
  );
}

/** Slugs to prerender at build time (at least one: Cache Components requires a non-empty list). */
export async function getCategorySlugs() {
  return safe(
    "categorySlugs",
    async () => {
      const rows = await db.productCategory.findMany({ where: PUBLISHED, select: { slug: true } });
      return rows.length ? rows.map((r) => r.slug) : ["light-liquid-paraffin"];
    },
    ["light-liquid-paraffin"],
  );
}

/**
 * Where an old URL moved to (slug changes, Phase 12 todo 19). Returns the target path or null.
 * Cached so a static route can call it; the admin invalidates the redirects tag on every change.
 */
export async function findRedirect(path) {
  "use cache";
  tag(TAGS.redirects);
  return safe(
    "redirect",
    async () => {
      const r = await db.redirect.findUnique({ where: { fromPath: path }, select: { toPath: true } });
      return r?.toPath ?? null;
    },
    null,
  );
}
