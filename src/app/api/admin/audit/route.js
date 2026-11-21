import { AUDIT_GROUPS } from "@/lib/admin/auditGroups";
import { containsAny, listResponse, parseListQuery } from "@/lib/admin/listQuery";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { idSchema } from "@/lib/validation/auth";

const GROUPS = AUDIT_GROUPS.map((g) => g.value);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/admin/audit — SUPER_ADMIN only. Filters: group, actor, from, to (YYYY-MM-DD), q. */
export const GET = route(async (req) => {
  await requirePermission("read", "audit");
  const q = parseListQuery(new URL(req.url).searchParams, {
    sortable: ["at", "action"],
    defaultSort: ["at", "desc"],
    search: containsAny(["action", "entity", "entityId"]),
    filters: {
      group: (v) => (GROUPS.includes(v) ? { action: { startsWith: `${v}.` } } : null),
      actor: (v) => (idSchema.safeParse(v).success ? { actorId: v } : null),
      from: (v) => (DAY.test(v) ? { at: { gte: new Date(`${v}T00:00:00+05:30`) } } : null),
      to: (v) => (DAY.test(v) ? { at: { lte: new Date(`${v}T23:59:59.999+05:30`) } } : null),
    },
  });
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where: q.where,
      orderBy: q.orderBy,
      skip: q.skip,
      take: q.take,
      select: { id: true, action: true, entity: true, entityId: true, diff: true, at: true, actor: { select: { email: true, name: true } } },
    }),
    db.auditLog.count({ where: q.where }),
  ]);
  return json(listResponse({ rows, total, page: q.page, pageSize: q.pageSize }));
});
