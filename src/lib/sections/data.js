import "server-only";

import { tag, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Cached data for data-driven sections (featured products, family counts, numbers, logos,
 * testimonials, insights). Every reader returns [] / 0 if the database is unreachable, so the
 * section simply hides instead of breaking the page.
 */

async function safe(label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    logger.error("sections.data_failed", { label, err });
    return fallback;
  }
}

const PUBLISHED = { status: "PUBLISHED", deletedAt: null };

export async function getFeaturedProducts(limit = 6) {
  "use cache";
  tag(TAGS.products, TAGS.categories, TAGS.media);
  return safe(
    "featured",
    async () => {
      const rows = await db.product.findMany({
        where: { ...PUBLISHED, featured: true, category: PUBLISHED },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          casNo: true,
          grade: true,
          purity: true,
          packSizes: true,
          moq: true,
          category: { select: { slug: true, name: true } },
          image: { select: { url: true, alt: true, width: true, height: true, focalX: true, focalY: true } },
        },
      });
      return rows;
    },
    [],
  );
}

/** Published product count per family key, e.g. { FOOD: 18, ... }. */
export async function getFamilyCounts() {
  "use cache";
  tag(TAGS.products, TAGS.categories);
  return safe(
    "familyCounts",
    async () => {
      const cats = await db.productCategory.findMany({
        where: PUBLISHED,
        select: { family: true, _count: { select: { products: { where: PUBLISHED } } } },
      });
      const out = {};
      for (const c of cats) out[c.family] = (out[c.family] ?? 0) + c._count.products;
      return out;
    },
    {},
  );
}

export async function getCatalogueTotals() {
  "use cache";
  tag(TAGS.products, TAGS.categories);
  return safe(
    "totals",
    async () => {
      const [products, categories] = await Promise.all([
        db.product.count({ where: { ...PUBLISHED, category: PUBLISHED } }),
        db.productCategory.count({ where: PUBLISHED }),
      ]);
      return { products, categories };
    },
    { products: 0, categories: 0 },
  );
}

export async function getClientLogos() {
  "use cache";
  tag(TAGS.clientLogos, TAGS.media);
  return safe(
    "logos",
    () =>
      db.clientLogo.findMany({
        where: { isVisible: true, media: { deletedAt: null } },
        orderBy: { order: "asc" },
        select: { id: true, name: true, url: true, media: { select: { url: true, alt: true, width: true, height: true } } },
      }),
    [],
  );
}

export async function getTestimonials() {
  "use cache";
  tag(TAGS.testimonials);
  return safe(
    "testimonials",
    () => db.testimonial.findMany({ where: { isVisible: true }, orderBy: { order: "asc" }, take: 6, select: { id: true, quote: true, name: true, role: true, company: true, city: true } }),
    [],
  );
}

export async function getLatestPosts(limit = 3) {
  "use cache";
  tag(TAGS.posts, TAGS.media);
  return safe(
    "posts",
    () =>
      db.post.findMany({
        where: { ...PUBLISHED, publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: limit,
        select: { id: true, slug: true, title: true, excerpt: true, category: true, publishedAt: true, cover: { select: { url: true, alt: true, width: true, height: true, focalX: true, focalY: true } } },
      }),
    [],
  );
}
