import { saveIndustry } from "@/lib/admin/content";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, json, readJson, route } from "@/lib/http";
import { industrySchema } from "@/lib/validation/content";

/** GET /api/admin/industries — every industry page with its product count. */
export const GET = route(async () => {
  await requirePermission("read", "industries");
  const rows = await db.industry.findMany({
    where: { deletedAt: null },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      status: true,
      updatedAt: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  });
  return json({
    ok: true,
    industries: rows.map(({ _count, ...r }) => ({ ...r, productCount: _count.products })),
  });
});

/** POST /api/admin/industries — create. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("create", "industries");
  const data = await readJson(req, industrySchema, { maxBytes: 128 * 1024 });
  const id = await saveIndustry({ user, before: null, data });
  return json({ ok: true, id }, { status: 201 });
});
