import { after } from "next/server";

import { activeSuperAdminCount, USER_LIST_SELECT, userUpdateSchema } from "@/lib/admin/users";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { notifySecurityChange } from "@/lib/auth/notify";
import { revokeAllForUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { clientIp, hashIp } from "@/lib/security/ip";
import { idSchema } from "@/lib/validation/auth";

async function target(ctx) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const user = await db.adminUser.findUnique({ where: { id }, select: USER_LIST_SELECT });
  if (!user) throw new HttpError(404);
  return user;
}

/** GET /api/admin/users/:id */
export const GET = route(async (_req, ctx) => {
  await requirePermission("read", "users");
  return json({ ok: true, user: await target(ctx) });
});

/**
 * PATCH /api/admin/users/:id { name?, role?, status? } — SUPER_ADMIN only.
 * - Nobody changes their own role or disables themselves.
 * - The last active SUPER_ADMIN cannot be demoted or disabled.
 * - Role change or disable ends every session of that user immediately (tokenVersion++).
 */
export const PATCH = route(async (req, ctx) => {
  assertSameOrigin(req);
  const actor = await requirePermission("update", "users");
  const user = await target(ctx);
  const changes = await readJson(req, userUpdateSchema);

  const self = user.id === actor.id;
  if (self && (changes.role !== undefined || changes.status !== undefined)) {
    throw new HttpError(400, "You cannot change your own role or disable your own account.");
  }
  if (user.status === "INVITED" && changes.status === "ACTIVE") throw new HttpError(400, "Invited users become active when they set their password.");

  const losesSuperAdmin =
    user.role === "SUPER_ADMIN" && user.status === "ACTIVE" && ((changes.role && changes.role !== "SUPER_ADMIN") || changes.status === "DISABLED");
  if (losesSuperAdmin && (await activeSuperAdminCount(user.id)) === 0) {
    throw new HttpError(400, "This is the last active super admin. Make someone else a super admin first.");
  }

  const data = {};
  if (changes.name !== undefined) data.name = changes.name;
  if (changes.role !== undefined && changes.role !== user.role) data.role = changes.role;
  if (changes.status !== undefined && changes.status !== user.status) data.status = changes.status;
  if (!Object.keys(data).length) return json({ ok: true, user });

  const updated = await db.adminUser.update({ where: { id: user.id }, data, select: USER_LIST_SELECT });
  const securityChange = data.role || data.status;
  if (securityChange) await revokeAllForUser(user.id, data.status === "DISABLED" ? "disabled_by_admin" : "role_changed");

  await audit({
    actorId: actor.id,
    action: data.status === "DISABLED" ? "user.disable" : data.status === "ACTIVE" ? "user.enable" : data.role ? "user.role_change" : "user.update",
    entity: "AdminUser",
    entityId: user.id,
    diff: { before: { role: user.role, status: user.status, name: user.name }, after: data },
    ipHash: hashIp(clientIp(req.headers)),
  });
  if (securityChange && updated.status === "ACTIVE") {
    const headers = req.headers;
    after(() => notifySecurityChange(user.id, headers, data.role ? `Your admin role is now ${data.role.replace("_", " ").toLowerCase()}` : "Your admin account was re-enabled"));
  }
  return json({ ok: true, user: updated });
});
