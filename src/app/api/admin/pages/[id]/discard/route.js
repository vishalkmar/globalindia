import { editorShape, loadPageForEditor } from "@/lib/admin/pages";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, json, route } from "@/lib/http";

/** POST /api/admin/pages/:id/discard — throw away the draft; the editor reloads the live page. */
export const POST = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "pages");
  const { id } = await ctx.params;
  const { page } = await loadPageForEditor(id);
  await db.page.update({ where: { id: page.id }, data: { draftData: null, draftAt: null, draftById: null } });
  await audit({ actorId: user.id, action: "page.draft_discard", entity: "Page", entityId: page.id });
  return json({ ok: true, page: editorShape(await loadPageForEditor(id)) });
});
