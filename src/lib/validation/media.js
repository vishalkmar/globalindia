import { z } from "zod";

import { FOLDER_VALUES, IMAGE_MIME, PDF_MIME } from "@/lib/media/constants";

const idSchema = z.string().regex(/^c[a-z0-9]{20,32}$/, "Invalid id.");

export const altSchema = z
  .string()
  .trim()
  .max(200, "Keep alt text under 200 characters.")
  .refine((v) => !/[<>]/.test(v), "Alt text cannot contain < or >.");

export const signSchema = z.strictObject({
  kind: z.enum(["image", "pdf"]),
  mime: z.enum([...IMAGE_MIME, ...PDF_MIME]),
  bytes: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024),
  replaceId: idSchema.optional(),
});

export const confirmSchema = z.strictObject({
  intent: z.string().min(20).max(600),
  folder: z.enum(FOLDER_VALUES).default("library"),
  alt: altSchema.default(""),
  originalName: z
    .string()
    .trim()
    .max(160)
    .transform((v) => v.replace(/[^\w .()-]/g, "_"))
    .default(""),
});

export const fromUrlSchema = z.strictObject({
  url: z.string().trim().url("Enter a full https:// link.").max(2000),
  kind: z.enum(["image", "pdf"]),
  folder: z.enum(FOLDER_VALUES).default("library"),
  alt: altSchema.default(""),
});

export const assetUpdateSchema = z
  .strictObject({
    alt: altSchema.optional(),
    folder: z.enum(FOLDER_VALUES).optional(),
    focalX: z.number().min(0).max(1).nullable().optional(),
    focalY: z.number().min(0).max(1).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const documentAttachSchema = z.strictObject({
  mediaId: idSchema,
  type: z.enum(["COA", "SDS", "TDS", "BROCHURE", "OTHER"]),
  label: z.string().trim().max(120).optional(),
});
