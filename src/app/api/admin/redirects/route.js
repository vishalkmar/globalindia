import { containsAny, listResponse, parseListQuery } from "@/lib/admin/listQuery";
import { saveRedirect } from "@/lib/admin/redirects";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, json, readJson, route } from "@/lib/http";
import { redirectSchema } from "@/lib/validation/redirects";

/** GET /api/admin/redirects — every redirect, searchable, with hit counts. */
export const GET = route(async (req) => {
  await requirePermission("read", "seo");
  const q = parseListQuery(new URL(req.url).searchParams, {
    sortable: ["fromPath", "toPath", "hits", "updatedAt"],
    defaultSort: ["updatedAt", "desc"],
    search: containsAny(["fromPath", "toPath"]),
  });
  const [rows, total] = await Promise.all([
    db.redirect.findMany({ where: q.where, orderBy: q.orderBy, skip: q.skip, take: q.take }),
    db.redirect.count({ where: q.where }),
  ]);
  return json(listResponse({ rows, total, page: q.page, pageSize: q.pageSize }));
});

/** POST /api/admin/redirects { fromPath, toPath, statusCode } */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("create", "seo");
  const data = await readJson(req, redirectSchema, { maxBytes: 4096 });
  const id = await saveRedirect({ user, before: null, data });
  return json({ ok: true, id }, { status: 201 });
});
