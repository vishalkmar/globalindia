import { sendInvite } from "@/lib/admin/users";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, route } from "@/lib/http";
import { idSchema } from "@/lib/validation/auth";

/** POST /api/admin/users/:id/invite — send a fresh invite link (old links stop working). */
export const POST = route(async (req, ctx) => {
  assertSameOrigin(req);
  const actor = await requirePermission("create", "users");
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const user = await db.adminUser.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true, status: true } });
  if (!user) throw new HttpError(404);
  if (user.status !== "INVITED") throw new HttpError(400, "This user has already set a password.");
  await sendInvite(user, actor.name || actor.email);
  await audit({ actorId: actor.id, action: "user.invite_resent", entity: "AdminUser", entityId: user.id });
  return json({ ok: true });
});
