import { z } from "zod";

import { destroyItem, listTrash, restoreItem, TRASH_TYPES } from "@/lib/admin/trash";
import { denyAccess, requireAdmin, requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { requireStepUp } from "@/lib/auth/stepUp";
import { assertSameOrigin, json, readJson, route } from "@/lib/http";
import { idSchema } from "@/lib/validation/auth";

const itemSchema = z.strictObject({ type: z.enum(Object.keys(TRASH_TYPES)), id: idSchema });

/** GET /api/admin/trash — deleted items the user may see, with the date each is purged. */
export const GET = route(async () => {
  const user = await requireAdmin();
  return json({ ok: true, items: await listTrash((resource) => can(user, "read", resource)) });
});

/** POST /api/admin/trash { type, id } — restore as a draft (needs delete rights on that kind of item). */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requireAdmin();
  // Roles that cannot delete anything (viewers) are refused before the body is even read.
  if (!Object.values(TRASH_TYPES).some((t) => can(user, "delete", t.resource)))
    await denyAccess(user, { action: "restore", resource: "trash" });
  const { type, id } = await readJson(req, itemSchema, { maxBytes: 512 });
  await requirePermission("delete", TRASH_TYPES[type].resource);
  const restored = await restoreItem({ user, type, id });
  return json({ ok: true, ...restored });
});

/** DELETE /api/admin/trash { type, id } — delete for good. Super admin only. */
export const DELETE = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("delete", "users"); // users:delete = super admin only
  await requireStepUp(user);
  if (user.role !== "SUPER_ADMIN") await denyAccess(user, { action: "delete", resource: "trash" });
  const { type, id } = await readJson(req, itemSchema, { maxBytes: 512 });
  await destroyItem({ user, type, id });
  return json({ ok: true });
});
