import "server-only";

import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { assertUsableMedia } from "@/lib/media/service";
import { normaliseSection } from "@/lib/sections/registry";
import { idSchema } from "@/lib/validation/auth";

/** Page as the editor sees it: the draft if there is one, otherwise the live content. */
export async function loadPageForEditor(id) {
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const page = await db.page.findFirst({ where: { id, deletedAt: null }, include: { sections: { orderBy: { order: "asc" } } } });
  if (!page) throw new HttpError(404);
  const live = {
    title: page.title,
    seo: { title: page.seo?.title ?? "", description: page.seo?.description ?? "", noindex: Boolean(page.seo?.noindex) },
    sections: page.sections.map((s) => ({ id: s.id, type: s.type, isVisible: s.isVisible, data: normaliseSection(s.type, s.data) })),
  };
  return { page, live, draft: page.draftData ?? null };
}

/** Every image referenced by the sections must exist and have alt text (Phase 7 todo 11). */
export async function assertSectionMedia(sections) {
  for (const s of sections) {
    for (const key of ["imageId"]) {
      if (s.data?.[key]) await assertUsableMedia(s.data[key], "image");
    }
  }
}

export function editorShape({ page, live, draft }) {
  return {
    id: page.id,
    slug: page.slug,
    status: page.status,
    publishedAt: page.publishedAt,
    draftAt: page.draftAt,
    content: draft ?? live,
    hasDraft: Boolean(draft),
  };
}
