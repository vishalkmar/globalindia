import { assertSectionMedia, editorShape, loadPageForEditor } from "@/lib/admin/pages";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, route } from "@/lib/http";
import { saveRevision } from "@/lib/revisions";
import { pageDraftSchema } from "@/lib/validation/pages";

/**
 * POST /api/admin/pages/:id/publish — the saved draft becomes the live page in one transaction.
 * The draft is validated again (it may be older than today's rules), a revision is stored,
 * and the page cache is expired so visitors see it on their next request.
 */
export const POST = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("publish", "pages");
  const { id } = await ctx.params;
  const { page, draft } = await loadPageForEditor(id);
  if (!draft) throw new HttpError(400, "There are no unpublished changes. Save a draft first.");
  const checked = pageDraftSchema.safeParse(draft);
  if (!checked.success)
    throw new HttpError(400, "The draft has invalid fields. Open the page, fix them and save again.");
  const content = checked.data;
  await assertSectionMedia(content.sections);

  await db.$transaction(async (tx) => {
    await tx.section.deleteMany({ where: { pageId: page.id } });
    await tx.section.createMany({
      data: content.sections.map((s, order) => ({
        pageId: page.id,
        type: s.type,
        order,
        isVisible: s.isVisible,
        data: s.data,
      })),
    });
    await tx.page.update({
      where: { id: page.id },
      data: {
        title: content.title,
        seo: content.seo,
        status: "PUBLISHED",
        publishedAt: new Date(),
        draftData: null,
        draftAt: null,
        draftById: null,
      },
    });
    await saveRevision(
      { entity: "page", entityId: page.id, data: content, authorId: user.id, note: "Published" },
      tx,
    );
  });

  invalidate(TAGS.page(page.slug));
  await audit({
    actorId: user.id,
    action: "page.publish",
    entity: "Page",
    entityId: page.id,
    diff: { slug: page.slug, sections: content.sections.length },
  });
  return json({ ok: true, page: editorShape(await loadPageForEditor(id)) });
});
