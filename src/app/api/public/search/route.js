import { db } from "@/lib/db";
import { errorResponse, json, route } from "@/lib/http";
import { clientIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * GET /api/public/search?q= — header search (Phase 9 todo 07).
 * - Published, non-deleted items only; a few fields each; max 8 products + 5 categories.
 * - Rate limited per IP; refuses cross-site callers (Sec-Fetch-Site) so it is not an open catalogue API (Phase 28).
 * - Query length capped; Prisma parameterises it.
 */
export const GET = route(async (req) => {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return errorResponse(403);

  const limited = await rateLimit("search", clientIp(req.headers));
  if (!limited.success) return errorResponse(429, "Too many searches. Please wait a moment.", { retryAfter: limited.retryAfter });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return json({ ok: true, products: [], categories: [] });

  const contains = { contains: q, mode: "insensitive" };
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { status: "PUBLISHED", deletedAt: null, OR: [{ name: contains }, { casNo: contains }, { applications: { has: q } }] },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      take: 8,
      select: { name: true, slug: true, casNo: true, grade: true, category: { select: { name: true, slug: true } } },
    }),
    db.productCategory.findMany({
      where: { status: "PUBLISHED", deletedAt: null, name: contains },
      orderBy: { order: "asc" },
      take: 5,
      select: { name: true, slug: true, _count: { select: { products: { where: { status: "PUBLISHED", deletedAt: null } } } } },
    }),
  ]);

  return json(
    {
      ok: true,
      products: products.map((p) => ({ name: p.name, href: `/products/${p.category.slug}/${p.slug}`, casNo: p.casNo, grade: p.grade, category: p.category.name })),
      categories: categories.map((c) => ({ name: c.name, href: `/products/${c.slug}`, count: c._count.products })),
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
});
