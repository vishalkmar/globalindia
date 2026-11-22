import { z } from "zod";

import { ICON_KEYS } from "../sections/icons.js";
import { idSchema, seoSchema, slugSchema } from "./catalogue.js";

/**
 * Content schemas for Phase 15: industries, insights posts, FAQs, testimonials, client logos and the
 * newsletter. Pure (relative imports) so the admin forms, the API and the seed share them.
 * Rich text (post body) is sanitised by the API on save.
 */

const text = (max) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .refine((v) => !/[<>]/.test(v), "Cannot contain < or >.");
const required = (max, msg) => text(max).refine((v) => v.length > 0, msg);
const optional = (max) => text(max).default("");

const faqs = z
  .array(z.strictObject({ q: required(200, "Enter the question."), a: required(1200, "Enter the answer.") }))
  .max(20)
  .default([]);

/* ---------------------------------------------------------------- industries */
export const industrySchema = z.strictObject({
  name: required(80, "Enter the industry name."),
  slug: slugSchema,
  icon: z.enum(ICON_KEYS, { error: "Choose an icon." }),
  summary: required(240, "Write a one-line summary."),
  content: z
    .strictObject({
      intro: optional(1500),
      needs: z
        .array(
          z.strictObject({
            title: required(80, "Enter a title."),
            text: required(300, "Say what they need."),
          }),
        )
        .max(8)
        .default([]),
    })
    .default({ intro: "", needs: [] }),
  faqs,
  productIds: z.array(idSchema).max(40, "Link up to 40 products.").default([]),
  imageId: idSchema.nullable().default(null),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  seo: seoSchema,
});

/* ---------------------------------------------------------------- insights */
export const POST_CATEGORIES = ["Buying guides", "Quality", "Market news", "Company news", "How-to"];

export const postSchema = z
  .strictObject({
    title: required(140, "Enter the title."),
    slug: slugSchema,
    excerpt: required(300, "Write a short summary for the list and search results."),
    body: z
      .string()
      .max(100_000, "The article is too long.")
      .refine((v) => v.replace(/<[^>]*>/g, "").trim().length >= 50, "Write at least a few sentences."),
    category: z.enum(POST_CATEGORIES),
    coverId: idSchema.nullable().default(null),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    publishAt: z
      .string()
      .trim()
      .default("")
      .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Enter a valid date and time."),
    seo: seoSchema,
  })
  .superRefine((p, ctx) => {
    if (p.publishAt && p.status !== "PUBLISHED")
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "Set the status to Published to schedule it.",
      });
  });

/* ---------------------------------------------------------------- FAQ, testimonials, logos (list managers) */
export const FAQ_TOPICS = ["Ordering", "Delivery", "Quality", "Payments", "General"];
export const faqListSchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        question: required(200, "Enter the question."),
        answer: required(1200, "Enter the answer."),
        topic: z.enum(FAQ_TOPICS),
        isVisible: z.boolean().default(true),
      }),
    )
    .max(100),
});

export const testimonialListSchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        quote: required(600, "Enter what the customer said."),
        name: required(80, "Enter the customer's name."),
        role: optional(80),
        company: optional(120),
        city: optional(60),
        isVisible: z.boolean().default(true),
      }),
    )
    .max(40),
});

export const clientLogoListSchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        name: required(80, "Enter the company name."),
        mediaId: idSchema,
        url: z
          .string()
          .trim()
          .max(300)
          .default("")
          .refine(
            (v) => v === "" || /^https:\/\/[^\s<>"]+$/i.test(v),
            "Use a full https:// link or leave empty.",
          ),
        isVisible: z.boolean().default(true),
      }),
    )
    .max(60),
});

/* ---------------------------------------------------------------- newsletter */
export const newsletterSchema = z.strictObject({
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address."),
  website: z.string().max(200).default(""), // honeypot
  startedAt: z.number().int().nonnegative().default(0),
  turnstileToken: z.string().max(2048).default(""),
});
