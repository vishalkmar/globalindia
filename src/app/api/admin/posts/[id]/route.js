import { deletePost, postEditorShape, savePost } from "@/lib/admin/content";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { idSchema } from "@/lib/validation/auth";
import { postSchema } from "@/lib/validation/content";

async function load(ctx) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const p = await db.post.findFirst({ where: { id, deletedAt: null } });
  if (!p) throw new HttpError(404);
  return p;
}

export const GET = route(async (_req, ctx) => {
  await requirePermission("read", "insights");
  const p = await load(ctx);
  return json({
    ok: true,
    id: p.id,
    post: postEditorShape(p),
    live: p.status === "PUBLISHED" && p.publishedAt && p.publishedAt <= new Date(),
  });
});

export const PUT = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "insights");
  const before = await load(ctx);
  const data = await readJson(req, postSchema, { maxBytes: 256 * 1024 });
  await savePost({ user, before, data });
  const after = await load(ctx);
  return json({ ok: true, post: postEditorShape(after) });
});

export const DELETE = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("delete", "insights");
  const post = await load(ctx);
  await deletePost({ user, post });
  return json({ ok: true });
});
