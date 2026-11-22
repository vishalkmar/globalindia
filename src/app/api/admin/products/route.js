import { containsAny, enumFilter, listResponse, parseListQuery } from "@/lib/admin/listQuery";
import { PRODUCT_LIST_SELECT, saveProduct } from "@/lib/admin/products";
import { requirePermission } from "@/lib/auth/guard";
import { FAMILY_KEYS } from "@/lib/catalogue/families";
import { db } from "@/lib/db";
import { assertSameOrigin, json, readJson, route } from "@/lib/http";
import { idSchema } from "@/lib/validation/auth";
import { productSchema, STATUSES } from "@/lib/validation/catalogue";

/** GET /api/admin/products — table with search (name, slug, CAS) and category/family/status/featured filters. */
export const GET = route(async (req) => {
  await requirePermission("read", "products");
  const q = parseListQuery(new URL(req.url).searchParams, {
    sortable: ["name", "updatedAt", "status", "casNo"],
    defaultSort: ["updatedAt", "desc"],
    search: containsAny(["name", "slug", "casNo"]),
    filters: {
      category: (v) => (idSchema.safeParse(v).success ? { categoryId: v } : null),
      family: (v) => (FAMILY_KEYS.includes(v) ? { category: { family: v } } : null),
      status: enumFilter("status", STATUSES),
      featured: (v) => (v === "yes" ? { featured: true } : v === "no" ? { featured: false } : null),
    },
  });
  const where = { AND: [{ deletedAt: null }, q.where] };
  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: q.orderBy,
      skip: q.skip,
      take: q.take,
      select: PRODUCT_LIST_SELECT,
    }),
    db.product.count({ where }),
  ]);
  return json(listResponse({ rows, total, page: q.page, pageSize: q.pageSize }));
});

/** POST /api/admin/products — create. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("create", "products");
  const data = await readJson(req, productSchema, { maxBytes: 256 * 1024 });
  const id = await saveProduct({ user, before: null, data, note: "Created" });
  return json({ ok: true, id }, { status: 201 });
});
