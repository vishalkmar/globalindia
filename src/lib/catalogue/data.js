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

const detailSelect = {
  id: true,
  name: true,
  slug: true,
  casNo: true,
  grade: true,
  purity: true,
  form: true,
  packSizes: true,
  moq: true,
  shelfLife: true,
  dispatchTime: true,
  applications: true,
  summary: true,
  content: true,
  specs: true,
  faqs: true,
  brandNote: true,
  isSourced: true,
  showPrice: true,
  indicativePrice: true,
  seo: true,
  updatedAt: true,
  image: imageSelect,
  gallery: {
    orderBy: { order: "asc" },
    where: { media: { deletedAt: null } },
    select: { media: imageSelect },
  },
  documents: {
    where: { media: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      label: true,
      isPublic: true,
      media: { select: { url: true, bytes: true } },
    },
  },
  category: { select: { id: true, slug: true, name: true, family: true, status: true, deletedAt: true } },
};

/**
 * One published product for its detail page (Phase 13), looked up by its own slug. The caller compares
 * the category slug in the URL with the real one and redirects when the product has moved.
 * Returns null when the product or its category is not live.
 */
export async function getProductPage(slug) {
  "use cache";
  tag(TAGS.products, TAGS.categories, TAGS.media, TAGS.product(slug));
  return safe(
    "product",
    async () => {
      const p = await db.product.findFirst({ where: { ...PUBLISHED, slug }, select: detailSelect });
      if (!p || p.category.status !== "PUBLISHED" || p.category.deletedAt) return null;
      const sameCategory = await db.product.findMany({
        where: { ...PUBLISHED, categoryId: p.category.id, id: { not: p.id } },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        take: 6,
        select: { ...listProductSelect, category: { select: { slug: true, name: true } } },
      });
      let related = sameCategory;
      if (related.length < 3) {
        const more = await db.product.findMany({
          where: {
            ...PUBLISHED,
            id: { notIn: [p.id, ...related.map((r) => r.id)] },
            category: { ...PUBLISHED, family: p.category.family },
          },
          orderBy: [{ featured: "desc" }, { order: "asc" }],
          take: 6 - related.length,
          select: { ...listProductSelect, category: { select: { slug: true, name: true } } },
        });
        related = [...related, ...more];
      }
      return {
        ...p,
        specs: Array.isArray(p.specs) ? p.specs : [],
        faqs: Array.isArray(p.faqs) ? p.faqs : [],
        gallery: p.gallery.map((g) => g.media),
        related,
      };
    },
    null,
  );
}

/** [category, product] pairs to prerender (at least one, as Cache Components requires). */
export async function getProductParams() {
  const fallback = [{ category: "light-liquid-paraffin", product: "light-liquid-paraffin-ip" }];
  return safe(
    "productParams",
    async () => {
      const rows = await db.product.findMany({
        where: { ...PUBLISHED, category: PUBLISHED },
        select: { slug: true, category: { select: { slug: true } } },
      });
      return rows.length ? rows.map((r) => ({ category: r.category.slug, product: r.slug })) : fallback;
    },
    fallback,
  );
}
