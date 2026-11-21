import { themeShape } from "@/lib/admin/themes";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { saveRevision } from "@/lib/revisions";
import { themeUpdateSchema } from "@/lib/settings/theme";
import { idSchema } from "@/lib/validation/auth";

async function load(ctx) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const theme = await db.theme.findUnique({ where: { id } });
  if (!theme) throw new HttpError(404);
  return theme;
}

/** GET /api/admin/themes/:id */
export const GET = route(async (_req, ctx) => {
  await requirePermission("read", "theme");
  return json({ ok: true, theme: themeShape(await load(ctx)) });
});

/**
 * PATCH /api/admin/themes/:id { name?, mode?, tokens? }
 * Editors may prepare any inactive theme. Changing the colours/mode of the ACTIVE theme changes the
 * live site, so it needs the publish permission (SUPER_ADMIN).
 */
export const PATCH = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "theme");
  const theme = await load(ctx);
  const changes = await readJson(req, themeUpdateSchema, { maxBytes: 32 * 1024 });
  const touchesLive = theme.isActive && (changes.tokens !== undefined || changes.mode !== undefined);
  if (touchesLive && !can(user, "publish", "theme")) {
    await audit({ actorId: user.id, action: "authz.denied", entity: "theme", diff: { action: "publish", themeId: theme.id } });
    throw new HttpError(403, "This theme is live. Only a super admin can change it — duplicate it to try changes.");
  }

  const updated = await db.$transaction(async (tx) => {
    const t = await tx.theme.update({ where: { id: theme.id }, data: changes });
    await saveRevision({ entity: "theme", entityId: theme.id, data: { name: t.name, mode: t.mode, tokens: t.tokens }, authorId: user.id }, tx);
    return t;
  });
  if (theme.isActive) invalidate(TAGS.theme);
  await audit({ actorId: user.id, action: touchesLive ? "theme.publish_edit" : "theme.update", entity: "Theme", entityId: theme.id, diff: { fields: Object.keys(changes) } });
  return json({ ok: true, theme: themeShape(updated) });
});

/** DELETE /api/admin/themes/:id — not the active theme, never a built-in preset. */
export const DELETE = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("delete", "theme");
  const theme = await load(ctx);
  if (theme.isActive) throw new HttpError(400, "Activate another theme before deleting this one.");
  if (theme.isPreset) throw new HttpError(400, "Built-in presets cannot be deleted. Duplicate one to make your own.");
  await db.theme.delete({ where: { id: theme.id } });
  await audit({ actorId: user.id, action: "theme.delete", entity: "Theme", entityId: theme.id, diff: { name: theme.name } });
  return json({ ok: true });
});
