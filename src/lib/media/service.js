import "server-only";

import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import * as cloud from "@/lib/cloudinary";
import { db } from "@/lib/db";
import { isProduction } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { logger } from "@/lib/logger";

import { detectFileType, looksLikeMarkup, pdfActiveContent } from "./fileType";
import { dimensionsAcceptable, imageSize } from "./imageSize";
import { maxBytesFor } from "./limits";
import { localDelete, localDeleteOthers, localRead, localSave, localUrl } from "./localDriver";

/**
 * Media service: one place where every upload path (picker, drag-drop, URL, replace) is checked
 * the same way before a MediaAsset row exists.
 */

/** Which storage to use. Cloudinary when configured; local only outside production. */
export function activeDriver() {
  if (cloud.cloudinaryEnabled()) return "cloudinary";
  if (!isProduction) return "local";
  throw new HttpError(503, "Media storage is not configured yet.");
}

const fmt = (bytes) => `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;

/**
 * Validate bytes: real type from magic bytes, matches the expected kind, size within limit,
 * no markup/SVG, sane image dimensions, PDF without active content.
 * @returns {{ ext: string, mime: string, kind: string, width: number|null, height: number|null, bytes: number, sha256: string }}
 */
export function validateBuffer(buffer, expectedKind, limits) {
  const max = maxBytesFor(expectedKind, limits);
  if (!buffer?.length) throw new HttpError(400, "The file is empty.");
  if (buffer.length > max)
    throw new HttpError(413, `The file is ${fmt(buffer.length)}; the limit is ${fmt(max)}.`);
  if (looksLikeMarkup(buffer))
    throw new HttpError(415, "SVG, HTML and XML files are not accepted. Upload JPG, PNG, WEBP, AVIF or PDF.");
  const type = detectFileType(buffer);
  if (!type) throw new HttpError(415, "This file type is not accepted. Upload JPG, PNG, WEBP, AVIF or PDF.");
  if (type.kind !== expectedKind)
    throw new HttpError(
      415,
      expectedKind === "pdf" ? "Please choose a PDF file." : "Please choose an image file.",
    );

  let width = null;
  let height = null;
  if (type.kind === "image") {
    const size = imageSize(buffer, type.ext);
    if (!dimensionsAcceptable(size))
      throw new HttpError(
        415,
        "The image dimensions could not be read or are too large (max 12,000 px per side).",
      );
    ({ width, height } = size);
  } else {
    const reason = pdfActiveContent(buffer);
    if (reason) throw new HttpError(415, `This PDF ${reason}, so it was not accepted.`);
  }
  return {
    ...type,
    width,
    height,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

/** Store validated bytes (URL uploads, local driver). Returns delivery facts. */
export async function storeBuffer(driver, id, kind, buffer, info, { overwrite = false } = {}) {
  if (driver === "local") {
    await localSave(id, info.ext, buffer);
    if (overwrite) await localDeleteOthers(id, info.ext);
    return {
      publicId: id,
      url: localUrl(id, info.ext),
      bytes: info.bytes,
      format: info.ext,
      width: info.width,
      height: info.height,
    };
  }
  const r = await cloud.uploadBuffer(id, kind, buffer, { overwrite });
  return { ...r, format: r.format ?? info.ext };
}

/**
 * After a direct browser upload: fetch what the storage actually holds and validate it.
 * Anything invalid is deleted from storage before the error is returned.
 */
export async function inspectUploaded(driver, id, kind, limits) {
  const max = maxBytesFor(kind, limits);
  if (driver === "local") {
    for (const ext of kind === "pdf" ? ["pdf"] : ["jpg", "png", "webp", "avif"]) {
      const buf = await localRead(id, ext);
      if (!buf) continue;
      try {
        const info = validateBuffer(buf, kind, limits);
        if (info.ext !== ext) throw new HttpError(415, "The file content does not match its type.");
        return {
          publicId: id,
          url: localUrl(id, ext),
          bytes: info.bytes,
          format: ext,
          width: info.width,
          height: info.height,
          sha256: info.sha256,
        };
      } catch (err) {
        await localDelete(id, ext);
        throw err;
      }
    }
    throw new HttpError(400, "The upload did not arrive. Please try again.");
  }

  const fullId = `global-india/${isProduction ? "prod" : "dev"}/${id}`;
  const res = await cloud.getResource(fullId, kind);
  if (!res) throw new HttpError(400, "The upload did not arrive. Please try again.");
  try {
    if (res.bytes > max) throw new HttpError(413, `The file is ${fmt(res.bytes)}; the limit is ${fmt(max)}.`);
    const buf = await cloud.downloadStored(res.url, max);
    const info = validateBuffer(buf, kind, limits);
    return {
      publicId: fullId,
      url: res.url,
      bytes: res.bytes,
      format: res.format ?? info.ext,
      width: res.width ?? info.width,
      height: res.height ?? info.height,
      sha256: info.sha256,
    };
  } catch (err) {
    await cloud.destroy(fullId, kind);
    if (err instanceof HttpError) throw err;
    logger.error("media.inspect_failed", { err });
    throw new HttpError(400, "The upload could not be checked. Please try again.");
  }
}

/** Remove a stored file (used when a DB write fails after upload, and by the trash purge in Phase 16). */
export async function removeStored(asset) {
  if (asset.driver === "local") return localDelete(asset.publicId, asset.format);
  return cloud.destroy(asset.publicId, asset.type === "PDF" ? "pdf" : "image");
}

/** Shape sent to the admin UI. */
export function serializeAsset(a) {
  return {
    id: a.id,
    url: a.url,
    type: a.type,
    format: a.format,
    bytes: a.bytes,
    width: a.width,
    height: a.height,
    alt: a.alt,
    folder: a.folder,
    originalName: a.originalName,
    focalX: a.focalX,
    focalY: a.focalY,
    version: a.version,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    uploadedBy: a.uploadedBy ? a.uploadedBy.name || a.uploadedBy.email : null,
    needsAlt: a.type === "IMAGE" && !a.alt.trim(),
  };
}

/**
 * Where an asset is used (Phase 7 todo 15): direct relations plus JSON content (sections, settings,
 * SEO, theme). JSON search uses a parameterised query (Prisma.sql), never string-built SQL.
 * @returns {Promise<{ label: string, href: string|null }[]>}
 */
export async function assetUsage(id) {
  const [categories, products, gallery, docs, industries, posts, logos, galleryItems] = await Promise.all([
    db.productCategory.findMany({
      where: { imageId: id, deletedAt: null },
      select: { id: true, name: true },
    }),
    db.product.findMany({ where: { imageId: id, deletedAt: null }, select: { id: true, name: true } }),
    db.productImage.findMany({
      where: { mediaId: id },
      select: { product: { select: { id: true, name: true } } },
    }),
    db.productDocument.findMany({
      where: { mediaId: id },
      select: { type: true, product: { select: { id: true, name: true } } },
    }),
    db.industry.findMany({ where: { imageId: id, deletedAt: null }, select: { id: true, name: true } }),
    db.post.findMany({ where: { coverId: id, deletedAt: null }, select: { id: true, title: true } }),
    db.clientLogo.findMany({ where: { mediaId: id }, select: { id: true, name: true } }),
    db.galleryItem.findMany({ where: { mediaId: id }, select: { id: true, caption: true } }),
  ]);
  const pattern = `%${id}%`;
  const [sections, settings, seoPages] = await Promise.all([
    db.$queryRaw(
      Prisma.sql`SELECT s."id", p."title", p."id" AS "pageId" FROM "Section" s JOIN "Page" p ON p."id" = s."pageId" WHERE s."data"::text LIKE ${pattern}`,
    ),
    db.$queryRaw(Prisma.sql`SELECT "key" FROM "SiteSetting" WHERE "value"::text LIKE ${pattern}`),
    db.$queryRaw(Prisma.sql`SELECT "id", "title" FROM "Page" WHERE "seo"::text LIKE ${pattern}`),
  ]);

  return [
    ...categories.map((c) => ({ label: `Category: ${c.name}`, href: `/admin/categories/${c.id}` })),
    ...products.map((p) => ({ label: `Product image: ${p.name}`, href: `/admin/products/${p.id}` })),
    ...gallery.map((g) => ({
      label: `Product gallery: ${g.product.name}`,
      href: `/admin/products/${g.product.id}`,
    })),
    ...docs.map((d) => ({
      label: `${d.type} document: ${d.product.name}`,
      href: `/admin/products/${d.product.id}`,
    })),
    ...industries.map((i) => ({ label: `Industry: ${i.name}`, href: `/admin/industries/${i.id}` })),
    ...posts.map((p) => ({ label: `Insight cover: ${p.title}`, href: `/admin/insights/${p.id}` })),
    ...logos.map((l) => ({ label: `Client logo: ${l.name}`, href: null })),
    ...galleryItems.map((g) => ({ label: `Gallery: ${g.caption || "photo"}`, href: null })),
    ...sections.map((s) => ({ label: `Page section: ${s.title}`, href: `/admin/pages/${s.pageId}` })),
    ...settings.map((s) => ({ label: `Site settings: ${s.key}`, href: "/admin/settings" })),
    ...seoPages.map((p) => ({ label: `SEO image: ${p.title}`, href: `/admin/pages/${p.id}` })),
  ];
}

/**
 * For editors saving a reference to an image (Phase 7 todo 11): the asset must exist, not be deleted,
 * be of the right type, and (for images) have alt text.
 */
export async function assertUsableMedia(id, kind = "image") {
  const a = await db.mediaAsset.findFirst({ where: { id, deletedAt: null } });
  if (!a) throw new HttpError(400, "The chosen file no longer exists.");
  if ((kind === "image") !== (a.type === "IMAGE"))
    throw new HttpError(400, kind === "image" ? "Choose an image." : "Choose a PDF.");
  if (a.type === "IMAGE" && !a.alt.trim())
    throw new HttpError(400, "Add alt text to the image before using it.");
  return a;
}
