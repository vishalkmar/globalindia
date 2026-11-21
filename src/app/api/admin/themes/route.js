import { themeShape } from "@/lib/admin/themes";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { themeCreateSchema } from "@/lib/settings/theme";
import { DEFAULT_THEME } from "@/lib/theme/presets";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "theme";

/** GET /api/admin/themes — every saved theme, active first. */
export const GET = route(async () => {
  await requirePermission("read", "theme");
  const themes = await db.theme.findMany({ orderBy: [{ isActive: "desc" }, { isPreset: "desc" }, { createdAt: "asc" }] });
  return json({ ok: true, themes: themes.map(themeShape) });
});

/** POST /api/admin/themes { name, fromId? } — new theme, copied from an existing one (duplicate) or the default. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("create", "theme");
  const { name, fromId } = await readJson(req, themeCreateSchema);
  let tokens = DEFAULT_THEME.tokens;
  let mode = "LIGHT";
  if (fromId) {
    const src = await db.theme.findUnique({ where: { id: fromId } });
    if (!src) throw new HttpError(404);
    tokens = src.tokens;
    mode = src.mode;
  }
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await db.theme.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  const theme = await db.theme.create({ data: { name, slug, tokens, mode, isActive: false, isPreset: false, createdById: user.id } });
  await audit({ actorId: user.id, action: "theme.create", entity: "Theme", entityId: theme.id, diff: { name, fromId: fromId ?? null } });
  return json({ ok: true, theme: themeShape(theme) }, { status: 201 });
});
