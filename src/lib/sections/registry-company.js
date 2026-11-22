import { z } from "zod";

import { safeHref } from "../settings/schemas.js";
import { ICON_KEYS, ICON_OPTIONS } from "./icons.js";

/**
 * Section types for company pages (Phase 11): page hero with breadcrumb, rich text, timeline, key facts,
 * vision/mission, values, proprietor message, image + text, sourcing partners, packaging options,
 * contact block, gallery and job openings. Merged into SECTIONS by registry.js.
 */

const t = (max) =>
  z
    .string()
    .trim()
    .max(max, "Too long.")
    .refine((v) => !/[<>]/.test(v), "Cannot contain < or >.");
const req = (max, msg) => t(max).refine((v) => v.length > 0, msg);
const cta = z.strictObject({ text: t(40), href: safeHref });
const mediaId = z
  .string()
  .regex(/^c[a-z0-9]{20,32}$/)
  .nullable()
  .default(null);
const headingFields = [
  { name: "eyebrow", label: "Eyebrow" },
  { name: "title", label: "Title", wide: true },
];
const ctaFields = (name, label) => ({
  name,
  label,
  type: "group",
  fields: [
    { name: "text", label: "Button text" },
    { name: "href", label: "Link", hint: "Leave both empty to hide." },
  ],
});

export const COMPANY_SECTIONS = {
  pageHero: {
    label: "Page header",
    description: "Title block at the top of an inner page, with the breadcrumb.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: req(160, "Enter the page title (H1)."),
      intro: t(420),
      imageId: mediaId,
    }),
    defaults: { eyebrow: "", title: "Page title", intro: "", imageId: null },
    fields: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "title", label: "Page title (H1)", type: "textarea", rows: 2, required: true },
      { name: "intro", label: "Intro", type: "textarea", rows: 3 },
      { name: "imageId", label: "Photo (optional)", type: "media", folder: "pages" },
    ],
  },

  richText: {
    label: "Text block",
    description: "Headings, paragraphs, lists and links. Formatting is cleaned on save.",
    schema: z.strictObject({ eyebrow: t(80), title: t(140), body: z.string().max(40000), aside: t(300) }),
    defaults: { eyebrow: "", title: "", body: "<p>Write here.</p>", aside: "" },
    fields: [
      ...headingFields,
      { name: "body", label: "Text", type: "richtext" },
      {
        name: "aside",
        label: "Side note (optional)",
        type: "textarea",
        rows: 2,
        hint: "A short highlighted note shown beside the text.",
      },
    ],
    richText: ["body"],
  },

  timeline: {
    label: "Timeline",
    description: "Milestones by year.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: t(140),
      items: z
        .array(
          z.strictObject({
            year: req(12, "Enter the year."),
            title: req(80, "Enter a title."),
            text: t(260),
          }),
        )
        .min(1)
        .max(20),
    }),
    defaults: { eyebrow: "", title: "", items: [{ year: "2002", title: "Started", text: "" }] },
    fields: [
      ...headingFields,
      {
        name: "items",
        label: "Milestones",
        type: "repeater",
        itemLabel: "milestone",
        max: 20,
        fields: [
          { name: "year", label: "Year" },
          { name: "title", label: "Title" },
          { name: "text", label: "Text", type: "textarea", rows: 2 },
        ],
      },
    ],
  },

  factsTable: {
    label: "Key facts table",
    description:
      "Company facts. 'Business details' rows are filled from Settings > Business details automatically.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: t(140),
      useBusiness: z.boolean(),
      rows: z
        .array(z.strictObject({ label: req(60, "Enter a label."), value: req(160, "Enter a value.") }))
        .max(15),
      note: t(240),
    }),
    defaults: { eyebrow: "", title: "Key facts", useBusiness: true, rows: [], note: "" },
    fields: [
      ...headingFields,
      {
        name: "useBusiness",
        label:
          "Include the facts from Business details (nature of business, proprietor, year, team, banker, GSTIN, market)",
        type: "checkbox",
      },
      {
        name: "rows",
        label: "Extra rows",
        type: "repeater",
        itemLabel: "row",
        max: 15,
        fields: [
          { name: "label", label: "Label" },
          { name: "value", label: "Value" },
        ],
      },
      { name: "note", label: "Note under the table", wide: true },
    ],
  },

  visionMission: {
    label: "Vision and mission",
    description: "Two side-by-side statements.",
    schema: z.strictObject({
      vision: req(400, "Enter the vision."),
      mission: req(400, "Enter the mission."),
    }),
    defaults: {
      vision:
        "To be the first call a North Indian manufacturer makes when they need a raw material quickly and correctly.",
      mission:
        "Keep dependable stock, pack it in practical sizes, describe it honestly and deliver it on the day we promise.",
    },
    fields: [
      { name: "vision", label: "Vision", type: "textarea", rows: 3, required: true },
      { name: "mission", label: "Mission", type: "textarea", rows: 3, required: true },
    ],
  },

  valuesList: {
    label: "Values list",
    description: "Short statements with a bold lead-in.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: t(140),
      items: z
        .array(z.strictObject({ lead: req(60, "Enter the lead-in."), text: t(300) }))
        .min(1)
        .max(10),
    }),
    defaults: { eyebrow: "", title: "", items: [{ lead: "Value", text: "" }] },
    fields: [
      ...headingFields,
      {
        name: "items",
        label: "Values",
        type: "repeater",
        itemLabel: "value",
        max: 10,
        fields: [
          { name: "lead", label: "Bold lead-in" },
          { name: "text", label: "Text", type: "textarea", rows: 2 },
        ],
      },
    ],
  },

  proprietorMessage: {
    label: "Message from the proprietor",
    description: "A personal note with name, role and an optional photo.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: t(140),
      message: req(2000, "Write the message."),
      name: req(80, "Enter the name."),
      role: t(80),
      imageId: mediaId,
    }),
    defaults: {
      eyebrow: "A note from the proprietor",
      title: "Why we still answer the phone ourselves.",
      message: [
        "When I started on Burari Road in 2002, most of our buyers were small soap and detergent makers who could not get a straight answer from bigger suppliers: which grade, how much, and by when. That is still the job.",
        "We do not try to stock everything. We stock what our customers use every month, in pack sizes they can actually buy, and we tell them plainly when something is short or when a price is about to move.",
        "If you are buying from us for the first time, call me or my team. We would rather spend ten minutes understanding what you make than sell you the wrong grade.",
      ].join("\n"),
      name: "Akash Rathod",
      role: "Proprietor, Global India",
      imageId: null,
    },
    fields: [
      ...headingFields,
      {
        name: "message",
        label: "Message (one paragraph per line)",
        type: "textarea",
        rows: 8,
        required: true,
      },
      { name: "name", label: "Name", required: true },
      { name: "role", label: "Role" },
      {
        name: "imageId",
        label: "Photo",
        type: "media",
        folder: "pages",
        hint: "A real portrait, at least 800 px wide.",
      },
    ],
  },

  splitFeature: {
    label: "Image and text",
    description: "Text with bullet points beside a photo. Use for the warehouse, logistics, plant.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: req(140, "Enter a title."),
      text: t(1200),
      bullets: z.array(t(160)).max(10),
      imageId: mediaId,
      reverse: z.boolean(),
      cta,
    }),
    defaults: {
      eyebrow: "",
      title: "Title",
      text: "",
      bullets: [],
      imageId: null,
      reverse: false,
      cta: { text: "", href: "" },
    },
    fields: [
      ...headingFields,
      { name: "text", label: "Text", type: "textarea", rows: 5 },
      { name: "bullets", label: "Bullet points", type: "tags", hint: "Press Enter after each point." },
      {
        name: "imageId",
        label: "Photo",
        type: "media",
        folder: "pages",
        hint: "Without a photo the bullet points are shown as a fact panel.",
      },
      { name: "reverse", label: "Photo on the left", type: "checkbox" },
      ctaFields("cta", "Button"),
    ],
  },

  brandList: {
    label: "Sourcing partners",
    description: "Brands you stock. Always worded as 'we supply' — never as your own manufacture.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: t(140),
      intro: t(400),
      brands: z
        .array(z.strictObject({ name: req(60, "Enter the brand."), note: t(140) }))
        .min(1)
        .max(24),
      disclaimer: t(300),
    }),
    defaults: { eyebrow: "", title: "", intro: "", brands: [{ name: "Brand", note: "" }], disclaimer: "" },
    fields: [
      ...headingFields,
      { name: "intro", label: "Intro", type: "textarea", rows: 2 },
      {
        name: "brands",
        label: "Brands",
        type: "repeater",
        itemLabel: "brand",
        max: 24,
        fields: [
          { name: "name", label: "Brand" },
          { name: "note", label: "What we supply" },
        ],
      },
      { name: "disclaimer", label: "Note", type: "textarea", rows: 2 },
    ],
  },

  packaging: {
    label: "Packaging options",
    description: "Pack sizes with what each suits.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: t(140),
      intro: t(400),
      items: z
        .array(z.strictObject({ name: req(40, "Enter the pack."), spec: t(80), use: t(200) }))
        .min(1)
        .max(10),
    }),
    defaults: { eyebrow: "", title: "", intro: "", items: [{ name: "25 kg bag", spec: "", use: "" }] },
    fields: [
      ...headingFields,
      { name: "intro", label: "Intro", type: "textarea", rows: 2 },
      {
        name: "items",
        label: "Packs",
        type: "repeater",
        itemLabel: "pack",
        max: 10,
        fields: [
          { name: "name", label: "Pack" },
          { name: "spec", label: "Material / size" },
          { name: "use", label: "Best for", type: "textarea", rows: 2 },
        ],
      },
    ],
  },

  iconCards: {
    label: "Icon cards",
    description: "Cards with an icon, title and text (2-8 cards).",
    schema: z.strictObject({
      eyebrow: t(80),
      title: t(140),
      intro: t(400),
      items: z
        .array(z.strictObject({ icon: z.enum(ICON_KEYS), title: req(70, "Enter a title."), text: t(300) }))
        .min(1)
        .max(8),
    }),
    defaults: { eyebrow: "", title: "", intro: "", items: [{ icon: "package", title: "Card", text: "" }] },
    fields: [
      ...headingFields,
      { name: "intro", label: "Intro", type: "textarea", rows: 2 },
      {
        name: "items",
        label: "Cards",
        type: "repeater",
        itemLabel: "card",
        max: 8,
        fields: [
          { name: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
          { name: "title", label: "Title" },
          { name: "text", label: "Text", type: "textarea", rows: 2 },
        ],
      },
    ],
  },

  contactBlock: {
    label: "Contact block",
    description: "Address, phone and email from Business details, with a button.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: req(140, "Enter a title."),
      text: t(400),
      showAddress: z.boolean(),
      showPhone: z.boolean(),
      showEmail: z.boolean(),
      cta,
    }),
    defaults: {
      eyebrow: "Talk to us",
      title: "Tell us what you need.",
      text: "",
      showAddress: true,
      showPhone: true,
      showEmail: true,
      cta: { text: "Request a quote", href: "/contact#quote" },
    },
    fields: [
      ...headingFields,
      { name: "text", label: "Text", type: "textarea", rows: 2 },
      { name: "showAddress", label: "Show address", type: "checkbox" },
      { name: "showPhone", label: "Show phone", type: "checkbox" },
      { name: "showEmail", label: "Show email", type: "checkbox" },
      ctaFields("cta", "Button"),
    ],
  },

  gallery: {
    label: "Photo gallery",
    description: "Photos from Admin > Gallery, with category filters.",
    schema: z.strictObject({ eyebrow: t(80), title: t(140), intro: t(400), showFilters: z.boolean() }),
    defaults: { eyebrow: "", title: "", intro: "", showFilters: true },
    fields: [
      ...headingFields,
      { name: "intro", label: "Intro", type: "textarea", rows: 2 },
      { name: "showFilters", label: "Show category filters", type: "checkbox" },
    ],
  },

  downloads: {
    label: "Downloads",
    description:
      "PDFs visitors can download: brochure, product list, company profile. Files come from the media library.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: t(140),
      intro: t(400),
      items: z
        .array(
          z.strictObject({
            title: req(100, "Enter a title."),
            text: t(240),
            mediaId: z.string().regex(/^c[a-z0-9]{20,32}$/, "Choose a PDF."),
          }),
        )
        .max(20),
      emptyText: t(300),
    }),
    defaults: {
      eyebrow: "Downloads",
      title: "Brochures and product lists.",
      intro: "",
      items: [],
      emptyText:
        "Our new brochure is being printed. Ask us and we will email the current product list and price sheet.",
    },
    fields: [
      ...headingFields,
      { name: "intro", label: "Introduction", type: "textarea", rows: 2 },
      {
        name: "items",
        label: "Files",
        type: "repeater",
        itemLabel: "file",
        max: 20,
        fields: [
          { name: "title", label: "Title" },
          { name: "text", label: "Short description" },
          { name: "mediaId", label: "PDF", type: "media", accept: "pdf", folder: "documents" },
        ],
      },
      { name: "emptyText", label: "Text when there are no files", type: "textarea", rows: 2 },
    ],
  },

  openings: {
    label: "Job openings",
    description: "Current vacancies. When the list is empty, the 'no openings' text is shown.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: t(140),
      jobs: z
        .array(
          z.strictObject({
            title: req(80, "Enter the job title."),
            location: t(60),
            type: t(40),
            text: t(800),
          }),
        )
        .max(20),
      emptyText: t(300),
      applyText: t(300),
    }),
    defaults: { eyebrow: "", title: "Open positions", jobs: [], emptyText: "", applyText: "" },
    fields: [
      ...headingFields,
      {
        name: "jobs",
        label: "Openings",
        type: "repeater",
        itemLabel: "opening",
        max: 20,
        fields: [
          { name: "title", label: "Job title" },
          { name: "location", label: "Location" },
          { name: "type", label: "Full-time / part-time" },
          { name: "text", label: "Description", type: "textarea", rows: 3 },
        ],
      },
      { name: "emptyText", label: "Text when there are no openings", type: "textarea", rows: 2 },
      {
        name: "applyText",
        label: "How to apply",
        type: "textarea",
        rows: 2,
        hint: "The email from Business details is added after this text.",
      },
    ],
  },
};
