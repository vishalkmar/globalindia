import "server-only";

import { TAGS,tagWithLife } from "@/lib/cache";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isNestedPageSlug, PAGE_SLUG } from "@/lib/pages";

/**
 * Every public URL with its last change and images (Phase 31 todos 07, 08). Published and not deleted
 * only; drafts, admin, API and download links never appear. Cached, refreshed when content changes
 * (tags) and at least every hour (scheduled articles go live by the clock).
 */

const STATIC_ROUTES = ["/products", "/industries", "/insights", "/faq", "/contact"];
const live = { status: "PUBLISHED", deletedAt: null };
const media = { select: { url: true, alt: true, deletedAt: true } };

const pagePath = (slug) => (slug === "home" ? "/" : isNestedPageSlug(slug) ? `/${slug.replace("-", "/")}` : `/${slug}`);
const imgs = (...list) => list.filter((m) => m && !m.deletedAt && m.url?.startsWith("http")).map((m) => m.url);

export async function sitemapEntries() {
  "use cache";
  tagWithLife("hours", TAGS.products, TAGS.categories, TAGS.posts, TAGS.industries, TAGS.media, TAGS.pages);
  const base = siteUrl();
  try {
    const [pages, categories, products, industries, posts] = await Promise.all([
      db.page.findMany({ where: live, select: { slug: true, updatedAt: true } }),
      db.productCategory.findMany({ where: live, select: { slug: true, updatedAt: true, image: media } }),
      db.product.findMany({
        where: { ...live, category: live },
        select: {
          slug: true,
          updatedAt: true,
          category: { select: { slug: true } },
          image: media,
          gallery: { orderBy: { order: "asc" }, take: 6, select: { media } },
        },
      }),
      db.industry.findMany({ where: live, select: { slug: true, updatedAt: true, image: media } }),
      db.post.findMany({
        where: { ...live, publishedAt: { lte: new Date() } },
        select: { slug: true, updatedAt: true, cover: media },
      }),
    ]);
    const newest = (rows) => rows.reduce((d, r) => (r.updatedAt > d ? r.updatedAt : d), new Date(0));
    const entry = (path, lastModified, changeFrequency, priority, images = []) => ({
      url: `${base}${path === "/" ? "" : path}` || base,
      lastModified,
      changeFrequency,
      priority,
      ...(images.length ? { images } : {}),
    });
    return [
      ...pages
        .filter((p) => PAGE_SLUG.test(p.slug))
        .map((p) => entry(pagePath(p.slug), p.updatedAt, p.slug === "home" ? "weekly" : "monthly", p.slug === "home" ? 1 : p.slug.startsWith("legal-") ? 0.2 : 0.6)),
      entry("/products", newest(products), "weekly", 0.9),
      ...STATIC_ROUTES.slice(1).map((r) => entry(r, newest(r === "/insights" ? posts : r === "/industries" ? industries : pages), "weekly", 0.6)),
      ...categories.map((c) => entry(`/products/${c.slug}`, c.updatedAt, "weekly", 0.8, imgs(c.image))),
      ...products.map((p) =>
        entry(`/products/${p.category.slug}/${p.slug}`, p.updatedAt, "monthly", 0.7, imgs(p.image, ...p.gallery.map((g) => g.media))),
      ),
      ...industries.map((i) => entry(`/industries/${i.slug}`, i.updatedAt, "monthly", 0.6, imgs(i.image))),
      ...posts.map((p) => entry(`/insights/${p.slug}`, p.updatedAt, "monthly", 0.5, imgs(p.cover))),
    ];
  } catch (err) {
    logger.error("sitemap.failed", { err });
    return [{ url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 }];
  }
}
