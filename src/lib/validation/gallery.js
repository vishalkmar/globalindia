import { z } from "zod";

import { idSchema } from "./auth.js";

/** Categories offered as suggestions in the admin; editors may type their own (they become filter buttons). */
export const GALLERY_CATEGORIES = ["Warehouse", "Stock", "Packing", "Dispatch", "Office"];
export const GALLERY_MAX_ITEMS = 120;

const oneLine = (max) =>
  z
    .string()
    .max(max, `Keep it under ${max} characters.`)
    .transform((s) => s.replace(/\s+/g, " ").trim());

export const galleryItemSchema = z.strictObject({
  mediaId: idSchema,
  caption: oneLine(140).default(""),
  category: oneLine(40).pipe(z.string().min(1, "Choose a category.")),
  isVisible: z.boolean().default(true),
});

export const gallerySchema = z
  .strictObject({ items: z.array(galleryItemSchema).max(GALLERY_MAX_ITEMS, `The gallery holds up to ${GALLERY_MAX_ITEMS} photos.`) })
  .superRefine(({ items }, ctx) => {
    const seen = new Set();
    items.forEach((item, i) => {
      if (seen.has(item.mediaId)) ctx.addIssue({ code: "custom", path: ["items", i, "mediaId"], message: "This photo is already in the gallery." });
      seen.add(item.mediaId);
    });
  });
