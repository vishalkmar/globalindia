import { containsAny, enumFilter, listResponse, parseListQuery } from "@/lib/admin/listQuery";
import { inviteSchema, placeholderPasswordHash, sendInvite, USER_LIST_SELECT } from "@/lib/admin/users";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { clientIp, hashIp } from "@/lib/security/ip";

/** GET /api/admin/users — SUPER_ADMIN only. */
export const GET = route(async (req) => {
  await requirePermission("read", "users");
  const q = parseListQuery(new URL(req.url).searchParams, {
    sortable: ["email", "name", "role", "status", "lastLoginAt", "createdAt"],
    defaultSort: ["createdAt", "desc"],
    search: containsAny(["email", "name"]),
    filters: {
      role: enumFilter("role", ["SUPER_ADMIN", "EDITOR", "VIEWER"]),
      status: enumFilter("status", ["ACTIVE", "INVITED", "DISABLED"]),
    },
  });
  const [rows, total] = await Promise.all([
    db.adminUser.findMany({ where: q.where, orderBy: q.orderBy, skip: q.skip, take: q.take, select: USER_LIST_SELECT }),
    db.adminUser.count({ where: q.where }),
  ]);
  return json(listResponse({ rows, total, page: q.page, pageSize: q.pageSize }));
});

/** POST /api/admin/users { email, name, role } — invite a new admin (SUPER_ADMIN only). */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const actor = await requirePermission("create", "users");
  const data = await readJson(req, inviteSchema);

  const exists = await db.adminUser.findUnique({ where: { email: data.email }, select: { id: true } });
  if (exists) throw new HttpError(400, "That email already has an account.", { body: { fields: { email: "Already has an account." } } });

  const user = await db.adminUser.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      status: "INVITED",
      passwordHash: await placeholderPasswordHash(),
      emailOtpEnabled: true,
    },
    select: { id: true, email: true, name: true, role: true },
  });
  await sendInvite(user, actor.name || actor.email);
  await audit({ actorId: actor.id, action: "user.invite", entity: "AdminUser", entityId: user.id, diff: { email: user.email, role: user.role }, ipHash: hashIp(clientIp(req.headers)) });
  return json({ ok: true, user }, { status: 201 });
});
