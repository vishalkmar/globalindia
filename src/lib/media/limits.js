import "server-only";

import { db } from "@/lib/db";

import { HARD_LIMITS, IMAGE_FORMATS } from "./constants";

/**
 * Effective upload limits = admin setting (SiteSetting "uploads": { imageMaxMB, pdfMaxMB, imageFormats, allowPdf })
 * clamped to the hard caps in code. A tampered or missing setting can only make limits stricter.
 */
export async function uploadLimits() {
  let setting = null;
  try {
    setting = (await db.siteSetting.findUnique({ where: { key: "uploads" } }))?.value ?? null;
  } catch {
    setting = null;
  }
  const mb = (v, cap) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.round(n * 1024 * 1024)) : cap;
  };
  return {
    imageBytes: mb(setting?.imageMaxMB, HARD_LIMITS.imageBytes),
    pdfBytes: mb(setting?.pdfMaxMB, HARD_LIMITS.pdfBytes),
    filesPerBatch: HARD_LIMITS.filesPerBatch,
    // Allowed types can only be narrowed from the built-in allow-list (never widened).
    imageFormats:
      Array.isArray(setting?.imageFormats) && setting.imageFormats.length
        ? IMAGE_FORMATS.filter((f) => setting.imageFormats.includes(f))
        : IMAGE_FORMATS,
    allowPdf: setting?.allowPdf !== false,
  };
}

export function maxBytesFor(kind, limits) {
  return kind === "pdf" ? limits.pdfBytes : limits.imageBytes;
}
