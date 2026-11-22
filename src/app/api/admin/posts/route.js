import { savePost } from "@/lib/admin/content";
import { containsAny, enumFilter, listResponse, parseListQuery } from "@/lib/admin/listQuery";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, json, readJson, route } from "@/lib/http";
import { POST_CATEGORIES, postSchema } from "@/lib/validation/content";

/** GET /api/admin/posts — insights list for the admin table. */
export const GET = route(async (req) => {
  await requirePermission("read", "insights");
  const q = parseListQuery(new URL(req.url).searchParams, {
    sortable: ["title", "updatedAt", "publishedAt", "status"],
    defaultSort: ["updatedAt", "desc"],
    search: containsAny(["title", "slug", "excerpt"]),
    filters: {
      status: enumFilter("status", ["DRAFT", "PUBLISHED", "ARCHIVED"]),
      category: enumFilter("category", POST_CATEGORIES),
    },
  });
  const where = { AND: [{ deletedAt: null }, q.where] };
  const [rows, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: q.orderBy,
      skip: q.skip,
      take: q.take,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { name: true } },
      },
    }),
    db.post.count({ where }),
  ]);
  return json(listResponse({ rows, total, page: q.page, pageSize: q.pageSize }));
});

/** POST /api/admin/posts — create an article. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("create", "insights");
  const data = await readJson(req, postSchema, { maxBytes: 256 * 1024 });
  const id = await savePost({ user, before: null, data });
  return json({ ok: true, id }, { status: 201 });
});
