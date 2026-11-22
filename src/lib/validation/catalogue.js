import { z } from "zod";

import { FAMILY_KEYS } from "../catalogue/families.js";

/**
 * Catalogue schemas (Phase 12). Pure: shared by the admin forms (client), the API (server) and the
 * seed (plain Node, hence relative ".js" imports). Rich text (category buying guide) is sanitised by
 * the API on save, not here, because the sanitiser is server-only.
 */

const text = (max) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .refine((v) => !/[<>]/.test(v), "Cannot contain < or >.");
const required = (max, msg) => text(max).refine((v) => v.length > 0, msg);
const optional = (max) => text(max).default("");

export const idSchema = z.string().regex(/^c[a-z0-9]{20,32}$/, "Invalid id.");
const mediaRef = idSchema.nullable().default(null);

/** URL slug: lowercase words joined by single hyphens. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+){0,9}$/;
export const slugSchema = z
  .string()
  .trim()
  .min(2, "Enter a URL slug.")
  .max(80, "Keep the slug under 80 characters.")
  .regex(SLUG_RE, "Use lowercase letters, numbers and single hyphens only.");

/** Turn a name into a slug suggestion ("Propylene Glycol 99% IP" -> "propylene-glycol-99-ip"). */
export function slugify(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/%/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** CAS registry number with its check digit verified (e.g. 57-55-6). */
export function isValidCas(cas) {
  const m = /^(\d{2,7})-(\d{2})-(\d)$/.exec(cas);
  if (!m) return false;
  const digits = (m[1] + m[2]).split("").reverse();
  const sum = digits.reduce((acc, d, i) => acc + Number(d) * (i + 1), 0);
  return sum % 10 === Number(m[3]);
}
const casSchema = z
  .string()
  .trim()
  .default("")
  .refine((v) => v === "" || isValidCas(v), "Not a valid CAS number (check the digits, format 57-55-6).");

export const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];
export const DOCUMENT_TYPES = ["COA", "SDS", "TDS", "BROCHURE", "OTHER"];

export const seoSchema = z
  .strictObject({
    title: optional(70),
    description: optional(170),
    noindex: z.boolean().default(false),
  })
  .default({ title: "", description: "", noindex: false });

const faqSchema = z
  .array(z.strictObject({ q: required(200, "Enter the question."), a: required(1200, "Enter the answer.") }))
  .max(20, "Up to 20 questions.");

export const categorySchema = z.strictObject({
  name: required(80, "Enter the category name."),
  slug: slugSchema,
  family: z.enum(FAMILY_KEYS, { error: "Choose a family." }),
  intro: optional(600),
  guide: z.string().max(20_000, "The buying guide is too long.").default(""),
  faqs: faqSchema.default([]),
  imageId: mediaRef,
  status: z.enum(STATUSES).default("PUBLISHED"),
  seo: seoSchema,
});

const tagList = (maxItems, maxLen, label) =>
  z
    .array(required(maxLen, `Each ${label} must be 1 to ${maxLen} characters.`))
    .max(maxItems, `Up to ${maxItems} ${label}s.`)
    .default([])
    .transform((list) => [...new Set(list)]);

export const specRowSchema = z.strictObject({
  property: required(80, "Enter the property."),
  value: required(160, "Enter the value."),
  method: optional(80),
});

export const productDocumentSchema = z.strictObject({
  mediaId: idSchema,
  type: z.enum(DOCUMENT_TYPES),
  label: optional(80),
  isPublic: z.boolean().default(false),
});

export const productSchema = z
  .strictObject({
    name: required(120, "Enter the product name."),
    slug: slugSchema,
    categoryId: idSchema,
    casNo: casSchema,
    grade: optional(80),
    purity: optional(60),
    form: optional(80),
    packSizes: tagList(12, 40, "pack size"),
    moq: optional(60),
    shelfLife: optional(60),
    dispatchTime: optional(80),
    applications: tagList(20, 60, "application"),
    summary: optional(600),
    specs: z.array(specRowSchema).max(40, "Up to 40 specification rows.").default([]),
    faqs: faqSchema.default([]),
    brandNote: optional(200),
    isSourced: z.boolean().default(true),
    showPrice: z.boolean().default(false),
    indicativePrice: optional(60),
    featured: z.boolean().default(false),
    status: z.enum(STATUSES).default("DRAFT"),
    seo: seoSchema,
    imageId: mediaRef,
    gallery: z.array(idSchema).max(12, "Up to 12 gallery images.").default([]),
    documents: z.array(productDocumentSchema).max(10, "Up to 10 documents.").default([]),
  })
  .superRefine((p, ctx) => {
    if (p.showPrice && !p.indicativePrice)
      ctx.addIssue({
        code: "custom",
        path: ["indicativePrice"],
        message: "Enter the indicative price, or turn off “Show price”.",
      });
    if (p.brandNote && !/\b(supply|supplied|stock|stocked|distribut)/i.test(p.brandNote)) {
      ctx.addIssue({
        code: "custom",
        path: ["brandNote"],
        message: "Word brand notes as “We supply …” so the brand is not presented as our own make.",
      });
    }
    if (new Set(p.gallery).size !== p.gallery.length)
      ctx.addIssue({ code: "custom", path: ["gallery"], message: "The same image is in the gallery twice." });
    const seen = new Set();
    p.documents.forEach((d, i) => {
      if (seen.has(d.mediaId))
        ctx.addIssue({
          code: "custom",
          path: ["documents", i, "mediaId"],
          message: "This file is attached twice.",
        });
      seen.add(d.mediaId);
    });
  });

/** Category reorder: ids in the new order (one family at a time or all). */
export const reorderSchema = z.strictObject({ ids: z.array(idSchema).min(1).max(500) });
