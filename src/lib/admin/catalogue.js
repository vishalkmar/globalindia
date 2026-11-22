import "server-only";

import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { EMPTY_CONTENT, productContentSchema } from "@/lib/validation/catalogue";

/**
 * Shared server logic for the catalogue admin (Phase 12): media checks, slug conflicts, 301 redirects
 * when a URL changes, soft delete and the editor's data shape.
 */

export const productPath = (categorySlug, slug) => `/products/${categorySlug}/${slug}`;
export const categoryPath = (slug) => `/products/${slug}`;

const fieldError = (fields, message = "Please check the highlighted fields.") =>
  new HttpError(400, message, { body: { fields } });

/**
 * Every referenced file must be live, of the right type, and images need alt text. One query.
 * @param {{ path: string, id: string, kind: "image"|"pdf" }[]} refs
 */
export async function assertMediaRefs(refs) {
  const list = refs.filter((r) => r.id);
  if (!list.length) return;
  const found = await db.mediaAsset.findMany({
    where: { id: { in: [...new Set(list.map((r) => r.id))] }, deletedAt: null },
    select: { id: true, type: true, alt: true },
  });
  const byId = new Map(found.map((m) => [m.id, m]));
  const fields = {};
  for (const r of list) {
    const m = byId.get(r.id);
    if (!m) fields[r.path] = "This file was deleted from the media library.";
    else if (r.kind === "image" && m.type !== "IMAGE") fields[r.path] = "Choose an image.";
    else if (r.kind === "pdf" && m.type !== "PDF") fields[r.path] = "Choose a PDF.";
    else if (r.kind === "image" && !m.alt.trim())
      fields[r.path] = "Add alt text to this image in the media library first.";
  }
  if (Object.keys(fields).length) throw fieldError(fields, "Some files cannot be used.");
}

export async function assertSlugFree(model, slug, exceptId = null) {
  const hit = await db[model].findUnique({ where: { slug }, select: { id: true } });
  if (hit && hit.id !== exceptId) throw fieldError({ slug: "Another item already uses this URL slug." });
}

/**
 * Record 301s from old paths to new ones (Phase 12 todo 19), inside the caller's transaction.
 * - chains are collapsed (an older redirect pointing at an old path now points at the new path)
 * - a redirect whose source is now a live URL again is removed (no loops)
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {[string, string][]} moves [fromPath, toPath]
 */
export async function recordRedirects(tx, moves) {
  for (const [from, to] of moves) {
    if (from === to) continue;
    await tx.redirect.deleteMany({ where: { fromPath: to } });
    await tx.redirect.updateMany({ where: { toPath: from }, data: { toPath: to } });
    await tx.redirect.upsert({
      where: { fromPath: from },
      update: { toPath: to, statusCode: 301 },
      create: { fromPath: from, toPath: to, statusCode: 301 },
    });
  }
  return moves.some(([a, b]) => a !== b);
}

/** A soft-deleted row gives its slug back so a new item can use it. */
export const retiredSlug = (slug, id) => `${slug}--deleted-${id.slice(-8)}`.slice(0, 120);

export function invalidateCatalogue({ productSlugs = [], categorySlugs = [], redirects = false } = {}) {
  invalidate(
    TAGS.products,
    TAGS.categories,
    ...productSlugs.map((s) => TAGS.product(s)),
    ...categorySlugs.map((s) => TAGS.category(s)),
    ...(redirects ? [TAGS.redirects] : []),
  );
}

/* ------------------------------------------------------------------ categories */

export function categoryEditorShape(c) {
  return {
    name: c.name,
    slug: c.slug,
    family: c.family,
    intro: c.intro,
    guide: c.guide,
    faqs: Array.isArray(c.faqs) ? c.faqs : [],
    imageId: c.imageId,
    status: c.status,
    seo: { title: "", description: "", noindex: false, ...(c.seo ?? {}) },
  };
}

/* ------------------------------------------------------------------ products */

/** Stored content JSON -> editor shape (missing or broken fields become empty). */
export function normaliseContent(raw) {
  const r = productContentSchema.safeParse(raw ?? {});
  return r.success ? r.data : { ...EMPTY_CONTENT };
}

export const productEditorInclude = {
  category: { select: { id: true, slug: true, name: true } },
  gallery: { orderBy: { order: "asc" }, select: { mediaId: true } },
  documents: {
    orderBy: { createdAt: "asc" },
    select: { mediaId: true, type: true, label: true, isPublic: true },
  },
};

export function productEditorShape(p) {
  return {
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    casNo: p.casNo ?? "",
    grade: p.grade ?? "",
    purity: p.purity ?? "",
    form: p.form ?? "",
    packSizes: p.packSizes ?? [],
    moq: p.moq ?? "",
    shelfLife: p.shelfLife ?? "",
    dispatchTime: p.dispatchTime ?? "",
    applications: p.applications ?? [],
    summary: p.summary ?? "",
    specs: Array.isArray(p.specs)
      ? p.specs.map((s) => ({ property: s.property ?? "", value: s.value ?? "", method: s.method ?? "" }))
      : [],
    faqs: Array.isArray(p.faqs) ? p.faqs : [],
    content: normaliseContent(p.content),
    brandNote: p.brandNote ?? "",
    isSourced: p.isSourced,
    showPrice: p.showPrice,
    indicativePrice: p.indicativePrice ?? "",
    featured: p.featured,
    status: p.status,
    seo: { title: "", description: "", noindex: false, ...(p.seo ?? {}) },
    imageId: p.imageId,
    gallery: (p.gallery ?? []).map((g) => g.mediaId),
    documents: (p.documents ?? []).map((d) => ({
      mediaId: d.mediaId,
      type: d.type,
      label: d.label ?? "",
      isPublic: d.isPublic,
    })),
  };
}

/** Checks every file a product refers to (main image, gallery, documents). */
export function assertProductMedia(data) {
  return assertMediaRefs([
    { path: "imageId", id: data.imageId, kind: "image" },
    ...data.gallery.map((id, i) => ({ path: `gallery.${i}`, id, kind: "image" })),
    ...data.documents.map((d, i) => ({ path: `documents.${i}.mediaId`, id: d.mediaId, kind: "pdf" })),
  ]);
}

/** Product columns from validated form data (nullable text columns store null instead of ""). */
export function productColumns(data) {
  const nul = (v) => (v === "" ? null : v);
  const { gallery: _g, documents: _d, ...rest } = data;
  return {
    ...rest,
    casNo: nul(rest.casNo),
    grade: nul(rest.grade),
    purity: nul(rest.purity),
    form: nul(rest.form),
    moq: nul(rest.moq),
    shelfLife: nul(rest.shelfLife),
    dispatchTime: nul(rest.dispatchTime),
    brandNote: nul(rest.brandNote),
    indicativePrice: nul(rest.indicativePrice),
  };
}

/** Replace a product's gallery and documents inside a transaction. */
export async function writeProductMedia(tx, productId, data) {
  await tx.productImage.deleteMany({ where: { productId } });
  if (data.gallery.length)
    await tx.productImage.createMany({
      data: data.gallery.map((mediaId, order) => ({ productId, mediaId, order })),
    });
  await tx.productDocument.deleteMany({ where: { productId } });
  if (data.documents.length) {
    await tx.productDocument.createMany({
      data: data.documents.map((d) => ({
        productId,
        mediaId: d.mediaId,
        type: d.type,
        label: d.label || null,
        isPublic: d.isPublic,
      })),
    });
  }
}

/** Publishing (or un-publishing) needs the "publish" permission, editing a draft only "update". */
export function needsPublish(before, after) {
  return (before ?? "DRAFT") !== after && (before === "PUBLISHED" || after === "PUBLISHED");
}
