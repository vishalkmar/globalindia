import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";

/** GET /api/admin/pages — all managed pages with publish state. */
export const GET = route(async () => {
  await requirePermission("read", "pages");
  const pages = await db.page.findMany({
    where: { deletedAt: null },
    orderBy: { slug: "asc" },
    select: { id: true, slug: true, title: true, status: true, publishedAt: true, updatedAt: true, draftAt: true, _count: { select: { sections: true } } },
  });
  return json({
    ok: true,
    pages: pages.map((p) => ({ ...p, sectionCount: p._count.sections, hasDraft: Boolean(p.draftAt), _count: undefined })),
  });
});
