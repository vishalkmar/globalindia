import "server-only";

import { tag, TAGS, tagWithLife } from "@/lib/cache";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/** Public reads for Phase 15 content (industries, insights, FAQ). Cached and tag-invalidated. */

const PUBLISHED = { status: "PUBLISHED", deletedAt: null };
const imageSelect = {
  select: { url: true, alt: true, width: true, height: true, focalX: true, focalY: true },
};

async function safe(label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    logger.error("content.read_failed", { label, err });
    return fallback;
  }
}

/* ---------------------------------------------------------------- industries */

export async function getIndustries() {
  "use cache";
  tag(TAGS.industries, TAGS.products, TAGS.media);
  return safe(
    "industries",
    () =>
      db.industry.findMany({
        where: PUBLISHED,
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          icon: true,
          summary: true,
          image: imageSelect,
          _count: { select: { products: { where: PUBLISHED } } },
        },
      }),
    [],
  );
}

export async function getIndustryPage(slug) {
  "use cache";
  tag(TAGS.industries, TAGS.products, TAGS.categories, TAGS.media);
  return safe(
    "industry",
    async () => {
      const ind = await db.industry.findFirst({
        where: { ...PUBLISHED, slug },
        select: {
          id: true,
          slug: true,
          name: true,
          icon: true,
          summary: true,
          content: true,
          faqs: true,
          seo: true,
          image: imageSelect,
          products: {
            where: { ...PUBLISHED, category: PUBLISHED },
            orderBy: [{ featured: "desc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              slug: true,
              casNo: true,
              grade: true,
              purity: true,
              packSizes: true,
              moq: true,
              image: imageSelect,
              category: { select: { slug: true, name: true } },
            },
          },
        },
      });
      if (!ind) return null;
      const others = await db.industry.findMany({
        where: { ...PUBLISHED, id: { not: ind.id } },
        orderBy: { order: "asc" },
        select: { slug: true, name: true, icon: true },
      });
      const content = ind.content && typeof ind.content === "object" ? ind.content : {};
      return {
        ...ind,
        content: { intro: content.intro ?? "", needs: Array.isArray(content.needs) ? content.needs : [] },
        faqs: Array.isArray(ind.faqs) ? ind.faqs : [],
        others,
      };
    },
    null,
  );
}

/** Industries that use a product (internal links on the product page, Phase 15 todo 19). */
export async function getIndustriesForProduct(productId) {
  "use cache";
  tag(TAGS.industries, TAGS.products);
  return safe(
    "productIndustries",
    () =>
      db.industry.findMany({
        where: { ...PUBLISHED, products: { some: { id: productId } } },
        orderBy: { order: "asc" },
        select: { slug: true, name: true, icon: true },
      }),
    [],
  );
}

/* ---------------------------------------------------------------- FAQ */

export async function getFaqs() {
  "use cache";
  tag(TAGS.faqs);
  return safe(
    "faqs",
    () =>
      db.faq.findMany({
        where: { isVisible: true },
        orderBy: [{ order: "asc" }],
        select: { id: true, question: true, answer: true, topic: true },
      }),
    [],
  );
}

/* ---------------------------------------------------------------- insights */

export const POSTS_PER_PAGE = 9;
/** Published and due: a scheduled post has publishedAt in the future until its time comes. */
const livePost = () => ({ ...PUBLISHED, publishedAt: { lte: new Date() } });

/**
 * Published posts, newest first. Post reads are cached for about an hour (not "max") so a scheduled
 * post appears on its own within the hour after its publish time.
 */
export async function getPosts() {
  "use cache";
  tagWithLife("hours", TAGS.posts, TAGS.media);
  return safe(
    "posts",
    async () => {
      const rows = await db.post.findMany({
        where: livePost(),
        orderBy: { publishedAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          publishedAt: true,
          cover: imageSelect,
        },
      });
      return rows;
    },
    [],
  );
}

export async function getPost(slug) {
  "use cache";
  tagWithLife("hours", TAGS.posts, TAGS.post(slug), TAGS.media);
  return safe(
    "post",
    async () => {
      const p = await db.post.findFirst({
        where: { ...livePost(), slug },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          body: true,
          category: true,
          publishedAt: true,
          updatedAt: true,
          seo: true,
          cover: imageSelect,
        },
      });
      if (!p) return null;
      const related = await db.post.findMany({
        where: { ...livePost(), id: { not: p.id } },
        orderBy: [{ publishedAt: "desc" }],
        take: 6,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          publishedAt: true,
          cover: imageSelect,
        },
      });
      return { ...p, related };
    },
    null,
  );
}

export async function getPostSlugs() {
  return safe(
    "postSlugs",
    async () => {
      const rows = await db.post.findMany({ where: livePost(), select: { slug: true } });
      return rows.length ? rows.map((r) => r.slug) : ["how-to-read-a-coa"];
    },
    ["how-to-read-a-coa"],
  );
}
