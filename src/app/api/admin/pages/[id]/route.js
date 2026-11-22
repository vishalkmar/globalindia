import { assertSectionMedia, editorShape, loadPageForEditor } from "@/lib/admin/pages";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, json, readJson, route } from "@/lib/http";
import { pageDraftSchema } from "@/lib/validation/pages";

/** GET /api/admin/pages/:id — editor content (draft if present, else live). */
export const GET = route(async (_req, ctx) => {
  await requirePermission("read", "pages");
  const { id } = await ctx.params;
  return json({ ok: true, page: editorShape(await loadPageForEditor(id)) });
});

/**
 * PUT /api/admin/pages/:id { title, seo, sections } — save a DRAFT. The live page does not change;
 * the draft can be previewed and is published separately.
 */
export const PUT = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "pages");
  const { id } = await ctx.params;
  const { page } = await loadPageForEditor(id);
  const draft = await readJson(req, pageDraftSchema, { maxBytes: 256 * 1024 });
  await assertSectionMedia(draft.sections);
  await db.page.update({
    where: { id: page.id },
    data: { draftData: draft, draftAt: new Date(), draftById: user.id },
  });
  await audit({
    actorId: user.id,
    action: "page.draft_save",
    entity: "Page",
    entityId: page.id,
    diff: { sections: draft.sections.length },
  });
  return json({ ok: true, page: editorShape(await loadPageForEditor(id)) });
});
