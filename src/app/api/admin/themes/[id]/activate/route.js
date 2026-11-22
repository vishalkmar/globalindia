import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { requireStepUp } from "@/lib/auth/stepUp";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, route } from "@/lib/http";
import { themeTokensSchema } from "@/lib/settings/theme";
import { idSchema } from "@/lib/validation/auth";

/**
 * POST /api/admin/themes/:id/activate — make this the live theme (SUPER_ADMIN, "publish").
 * Exactly one theme is active; the public cache tag "theme" is expired so the next request
 * renders the whole site with the new colours and fonts — no redeploy.
 */
export const POST = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("publish", "theme");
  await requireStepUp(user);
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const theme = await db.theme.findUnique({ where: { id } });
  if (!theme) throw new HttpError(404);
  if (!themeTokensSchema.safeParse(theme.tokens).success)
    throw new HttpError(
      400,
      "This theme has invalid values. Open it, fix the highlighted fields and save first.",
    );

  const previous = await db.theme.findFirst({ where: { isActive: true }, select: { id: true, name: true } });
  await db.$transaction([
    db.theme.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    db.theme.update({ where: { id }, data: { isActive: true } }),
  ]);
  invalidate(TAGS.theme);
  await audit({
    actorId: user.id,
    action: "theme.activate",
    entity: "Theme",
    entityId: id,
    diff: { from: previous?.name ?? null, to: theme.name },
  });
  return json({ ok: true });
});
