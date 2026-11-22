import { faqListSchema, industrySchema, postSchema } from "../src/lib/validation/content.js";
import { INDUSTRIES } from "./seed-industries.js";
import { FAQS } from "./seed-legal.js";
import { POSTS } from "./seed-posts.js";

/**
 * Phase 15 content: 8 industries (linked to products), 3 starter posts and the global FAQ.
 * Only creates what is missing, so admin edits survive a re-seed. Everything passes the same schema
 * the admin uses. Testimonials and client logos are deliberately NOT seeded: they must be real.
 */
export async function seedContent(db, log) {
  let industries = 0;
  for (const [order, ind] of INDUSTRIES.entries()) {
    if (await db.industry.findUnique({ where: { slug: ind.slug } })) continue;
    const products = await db.product.findMany({
      where: { slug: { in: ind.products }, deletedAt: null },
      select: { id: true },
    });
    const data = industrySchema.parse({
      name: ind.name,
      slug: ind.slug,
      icon: ind.icon,
      summary: ind.summary,
      content: { intro: ind.intro, needs: ind.needs },
      faqs: ind.faqs,
      productIds: products.map((p) => p.id),
      status: "PUBLISHED",
    });
    const { productIds, ...columns } = data;
    await db.industry.create({
      data: { ...columns, order, products: { connect: productIds.map((id) => ({ id })) } },
    });
    industries += 1;
  }

  const author = await db.adminUser.findFirst({
    where: { role: "SUPER_ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  let posts = 0;
  for (const p of POSTS) {
    if (await db.post.findUnique({ where: { slug: p.slug } })) continue;
    const data = postSchema.parse({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      body: p.body,
      category: p.category,
      status: "PUBLISHED",
    });
    const publishedAt = new Date(Date.now() - p.daysAgo * 24 * 60 * 60 * 1000);
    const { publishAt: _publishAt, ...columns } = data;
    await db.post.create({ data: { ...columns, authorId: author?.id ?? null, publishedAt } });
    posts += 1;
  }

  let faqs = 0;
  if ((await db.faq.count()) === 0) {
    const { items } = faqListSchema.parse({
      items: FAQS.map(([topic, question, answer]) => ({ topic, question, answer })),
    });
    await db.faq.createMany({ data: items.map((f, order) => ({ ...f, order })) });
    faqs = items.length;
  }
  log("content", `${industries} industries, ${posts} posts, ${faqs} FAQs added`);
}
