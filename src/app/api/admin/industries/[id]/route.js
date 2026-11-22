import { deleteIndustry, industryEditorShape, saveIndustry } from "@/lib/admin/content";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { idSchema } from "@/lib/validation/auth";
import { industrySchema } from "@/lib/validation/content";

async function load(ctx) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const i = await db.industry.findFirst({
    where: { id, deletedAt: null },
    include: { products: { where: { deletedAt: null }, select: { id: true } } },
  });
  if (!i) throw new HttpError(404);
  return i;
}

export const GET = route(async (_req, ctx) => {
  await requirePermission("read", "industries");
  const i = await load(ctx);
  return json({ ok: true, id: i.id, industry: industryEditorShape(i) });
});

export const PUT = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "industries");
  const before = await load(ctx);
  const data = await readJson(req, industrySchema, { maxBytes: 128 * 1024 });
  await saveIndustry({ user, before, data });
  return json({ ok: true });
});

export const DELETE = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("delete", "industries");
  const industry = await load(ctx);
  await deleteIndustry({ user, industry });
  return json({ ok: true });
});
