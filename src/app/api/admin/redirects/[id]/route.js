import { deleteRedirect, saveRedirect } from "@/lib/admin/redirects";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { idSchema } from "@/lib/validation/auth";
import { redirectSchema } from "@/lib/validation/redirects";

async function load(ctx) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const r = await db.redirect.findUnique({ where: { id } });
  if (!r) throw new HttpError(404);
  return r;
}

export const PUT = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "seo");
  const before = await load(ctx);
  const data = await readJson(req, redirectSchema, { maxBytes: 4096 });
  await saveRedirect({ user, before, data });
  return json({ ok: true });
});

export const DELETE = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("delete", "seo");
  const redirect = await load(ctx);
  await deleteRedirect({ user, redirect });
  return json({ ok: true });
});
