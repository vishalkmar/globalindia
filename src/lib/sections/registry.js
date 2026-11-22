import { z } from "zod";

import { FAMILIES, FAMILY_KEYS } from "../catalogue/families.js";
import { safeHref } from "../settings/schemas.js";
import { ICON_KEYS, ICON_OPTIONS } from "./icons.js";
import { COMPANY_SECTIONS } from "./registry-company.js";

/**
 * Section registry (Phase 10 todo 01): type -> label, strict Zod schema, real default copy (docs/Content.md)
 * and the admin form layout. Pure module — used by the admin editor, the API and the public renderer.
 * Rendering components live in src/components/sections (server components), keyed by the same type.
 */

const t = (max, msg = "Too long.") =>
  z
    .string()
    .trim()
    .max(max, msg)
    .refine((v) => !/[<>]/.test(v), "Cannot contain < or >.");
const req = (max, msg) => t(max).refine((v) => v.length > 0, msg);
const cta = z.strictObject({ text: t(40), href: safeHref });
const mediaId = z
  .string()
  .regex(/^c[a-z0-9]{20,32}$/)
  .nullable()
  .default(null);
const icon = z.enum(ICON_KEYS);

const heading = { eyebrow: t(80), title: t(140), intro: t(400) };
const headingFields = [
  { name: "eyebrow", label: "Eyebrow (small label above the title)" },
  { name: "title", label: "Title", wide: true },
  { name: "intro", label: "Intro text", type: "textarea", rows: 2 },
];
const ctaFields = (name, label) => ({
  name,
  label,
  type: "group",
  fields: [
    { name: "text", label: "Button text" },
    {
      name: "href",
      label: "Link",
      hint: "Page path like /contact or https:// link. Leave both empty to hide.",
    },
  ],
});

export const SECTIONS = {
  hero: {
    label: "Hero",
    description: "Top of the page: title, short text, two buttons and three trust facts.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: req(160, "Enter the main title."),
      subtitle: t(420),
      primaryCta: cta,
      secondaryCta: cta,
      trustFacts: z.array(z.strictObject({ value: t(24), label: t(60) })).max(4),
      imageId: mediaId,
      highlights: z.array(z.strictObject({ name: t(60), detail: t(80) })).max(5),
    }),
    defaults: {
      eyebrow: "Chemical raw materials · Delhi · Since 2002",
      title: "Raw materials for food, cosmetics and cleaning products, supplied without the run-around.",
      subtitle:
        "Global India stocks more than 120 chemicals, from Light Liquid Paraffin and Propylene Glycol to SLES, Xanthan Gum and soap bases. We pack in 25 kg and 50 kg bags, 50 L cans and 200 L drums, and dispatch across India within about a week.",
      primaryCta: { text: "Request a quote", href: "/contact#quote" },
      secondaryCta: { text: "See all products", href: "/products" },
      trustFacts: [
        { value: "2002", label: "Supplying since" },
        { value: "120+", label: "Products in stock" },
        { value: "50 kg", label: "Minimum order, most items" },
      ],
      imageId: null,
      highlights: [
        { name: "Light Liquid Paraffin", detail: "IP / cosmetic · 50 L, 210 L" },
        { name: "Propylene Glycol 99%", detail: "IP / USP · 200 L drums" },
        { name: "SLES 70%", detail: "Detergent grade · 50 kg, 220 kg" },
        { name: "Food Grade Xanthan Gum", detail: "FCC / USP · 25 kg bags" },
        { name: "Refined Glycerine 99.5%", detail: "USP / CP · 50 kg, 250 kg" },
      ],
    },
    fields: [
      { name: "eyebrow", label: "Eyebrow", wide: true },
      { name: "title", label: "Main title (H1)", type: "textarea", rows: 2, required: true },
      { name: "subtitle", label: "Text under the title", type: "textarea", rows: 3 },
      ctaFields("primaryCta", "Main button"),
      ctaFields("secondaryCta", "Second button"),
      {
        name: "trustFacts",
        label: "Trust facts",
        type: "repeater",
        itemLabel: "fact",
        max: 4,
        fields: [
          { name: "value", label: "Value", placeholder: "2002" },
          { name: "label", label: "Label", placeholder: "Supplying since" },
        ],
      },
      {
        name: "imageId",
        label: "Hero photo",
        type: "media",
        folder: "pages",
        hint: "A real photo of the warehouse, drums or bags, at least 1600 px wide. Without a photo the product list below is shown.",
      },
      {
        name: "highlights",
        label: "Product list shown next to the title (when there is no photo)",
        type: "repeater",
        itemLabel: "product",
        max: 5,
        fields: [
          { name: "name", label: "Product" },
          { name: "detail", label: "Grade and packs" },
        ],
      },
    ],
  },

  featureTriad: {
    label: "Three reasons",
    description: "Three short cards with an icon each.",
    schema: z.strictObject({
      ...heading,
      items: z
        .array(z.strictObject({ icon, title: req(70, "Enter a title."), text: t(260) }))
        .min(1)
        .max(4),
    }),
    defaults: {
      eyebrow: "",
      title: "",
      intro: "",
      items: [
        {
          icon: "boxes",
          title: "One supplier, many raw materials",
          text: "Buy your surfactants, glycols, paraffins and food additives from one desk. Fewer vendors, one invoice, one person to call.",
        },
        {
          icon: "package-check",
          title: "Pack sizes that match real orders",
          text: "Not every buyer needs a tanker. Most of our range ships in 25 kg or 50 kg packs, so small and mid-size plants can buy what they use.",
        },
        {
          icon: "truck",
          title: "Delhi stock, India-wide dispatch",
          text: "Our Burari Road warehouse sits close to North India's main transport routes. Orders usually leave within seven working days.",
        },
      ],
    },
    fields: [
      ...headingFields,
      {
        name: "items",
        label: "Cards",
        type: "repeater",
        itemLabel: "card",
        max: 4,
        fields: [
          { name: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
          { name: "title", label: "Title" },
          { name: "text", label: "Text", type: "textarea", rows: 2 },
        ],
      },
    ],
  },

  aboutTeaser: {
    label: "About teaser",
    description: "Short company story with a quote from the proprietor.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: req(140, "Enter a title."),
      text: t(900),
      quote: t(300),
      quoteAuthor: t(80),
      quoteRole: t(80),
      imageId: mediaId,
      cta,
    }),
    defaults: {
      eyebrow: "About Global India",
      title: "Twenty-four years of supplying the people who make things.",
      text: "We started in 2002 as a small trading business in North Delhi. Today a team of 35 handles sourcing, storage, packing and dispatch for manufacturers of soaps, detergents, cosmetics, food products and industrial goods. The idea has not changed: give the buyer the right grade, the right paperwork and a straight answer on price and timing.",
      quote:
        "Most of our customers found us for one product and stayed for ten. That only happens when the material is the same every time.",
      quoteAuthor: "Akash Rathod",
      quoteRole: "Proprietor",
      imageId: null,
      cta: { text: "Read our story", href: "/about" },
    },
    fields: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "title", label: "Title", wide: true, required: true },
      { name: "text", label: "Text", type: "textarea", rows: 5 },
      { name: "quote", label: "Pull quote", type: "textarea", rows: 2 },
      { name: "quoteAuthor", label: "Quote by" },
      { name: "quoteRole", label: "Role" },
      { name: "imageId", label: "Photo (optional)", type: "media", folder: "pages" },
      ctaFields("cta", "Link button"),
    ],
  },

  productFamilies: {
    label: "Product families",
    description: "Six family cards with live product counts from the catalogue.",
    schema: z.strictObject({
      ...heading,
      showCounts: z.boolean(),
      items: z
        .array(
          z.strictObject({ family: z.enum(FAMILY_KEYS), title: req(70, "Enter a title."), text: t(220) }),
        )
        .min(1)
        .max(6),
    }),
    defaults: {
      eyebrow: "What we supply",
      title: "Six families of raw materials, one order desk.",
      intro:
        "Most buyers come to us for two or three of these. Pick a family to see the grades, pack sizes and minimum quantities.",
      showCounts: true,
      items: FAMILIES.map((f) => ({ family: f.key, title: f.name, text: f.text })),
    },
    fields: [
      ...headingFields,
      { name: "showCounts", label: "Show the number of products on each card", type: "checkbox" },
      {
        name: "items",
        label: "Family cards",
        type: "repeater",
        itemLabel: "card",
        max: 6,
        fields: [
          {
            name: "family",
            label: "Family",
            type: "select",
            options: FAMILIES.map((f) => ({ value: f.key, label: f.name })),
          },
          { name: "title", label: "Card title" },
          { name: "text", label: "Card text", type: "textarea", rows: 2 },
        ],
      },
    ],
  },

  featuredProducts: {
    label: "Featured products",
    description: "Products marked 'featured' in the catalogue. Hidden while none are featured.",
    schema: z.strictObject({ ...heading, limit: z.coerce.number().int().min(3).max(9), cta }),
    defaults: {
      eyebrow: "Most asked for",
      title: "Products buyers order from us every month.",
      intro:
        "Each one is kept in stock all year. Specifications are indicative; the COA with your batch is the final word.",
      limit: 6,
      cta: { text: "See all products", href: "/products" },
    },
    fields: [
      ...headingFields,
      { name: "limit", label: "How many products", type: "number" },
      ctaFields("cta", "Link button"),
    ],
  },

  industries: {
    label: "Industries we serve",
    description: "Icon cards for the industries you supply.",
    schema: z.strictObject({
      ...heading,
      items: z
        .array(z.strictObject({ icon, title: req(60, "Enter a title."), text: t(200), href: safeHref }))
        .min(1)
        .max(12),
    }),
    defaults: {
      eyebrow: "Industries",
      title: "Who buys from us.",
      intro: "From one-person soap units to large detergent plants. These are the trades we supply most.",
      items: [
        {
          icon: "utensils",
          title: "Food & Beverage",
          text: "Xanthan gum, malic acid, citric acid, sodium citrate, MSG, maltodextrin, sorbitol and preservatives.",
          href: "/industries/food-beverage",
        },
        {
          icon: "droplet",
          title: "Cosmetics & Personal Care",
          text: "Light liquid paraffin, glycerine, CAPB, shampoo bases, soap bases and silicone oils.",
          href: "/industries/cosmetics-personal-care",
        },
        {
          icon: "pill",
          title: "Pharmaceuticals",
          text: "IP and USP grades of paraffin, glycerine, propylene glycol and sorbitol.",
          href: "/industries/pharmaceuticals",
        },
        {
          icon: "washing-machine",
          title: "Detergents & Home Care",
          text: "SLES, LABSA, AOS, SLS, acid thickeners, foam boosters and phenyl concentrates.",
          href: "/industries/detergents-home-care",
        },
        {
          icon: "sparkles",
          title: "Soap Making",
          text: "Natural, goat milk and shea butter soap bases, soap noodles, stearic and lauric acids.",
          href: "/industries/soap-making",
        },
        {
          icon: "factory",
          title: "Textile & Industrial",
          text: "Caustic soda, soda ash, sodium silicate, guar gum, pine oil and solvents.",
          href: "/industries/textile-industrial",
        },
        {
          icon: "car",
          title: "Automotive Care",
          text: "Tyre polish, dashboard polish, car shampoo and silicone emulsions.",
          href: "/industries/automotive-care",
        },
        {
          icon: "flask",
          title: "Laboratories",
          text: "Lauric and myristic acids, denatured ethanol, hydrogen peroxide and reagent-grade surfactants.",
          href: "/industries/laboratories",
        },
      ],
    },
    fields: [
      ...headingFields,
      {
        name: "items",
        label: "Industries",
        type: "repeater",
        itemLabel: "industry",
        max: 12,
        fields: [
          { name: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
          { name: "title", label: "Name" },
          { name: "text", label: "Text", type: "textarea", rows: 2 },
          { name: "href", label: "Link (optional)" },
        ],
      },
    ],
  },

  numberedValues: {
    label: "Numbered values",
    description: "Four short promises, numbered 01 to 04.",
    schema: z.strictObject({
      ...heading,
      items: z
        .array(z.strictObject({ title: req(60, "Enter a title."), text: t(240) }))
        .min(1)
        .max(6),
    }),
    defaults: {
      eyebrow: "How we work",
      title: "Four things we hold to on every order.",
      intro: "",
      items: [
        {
          title: "Honest specifications",
          text: "We tell you the grade, purity and pack exactly as it is. If we do not have it, we say so.",
        },
        {
          title: "Consistent stock",
          text: "Our core lines are kept in stock all year so your production does not wait on us.",
        },
        {
          title: "Clear paperwork",
          text: "GST invoice, COA and safety data sheets travel with the material where applicable.",
        },
        { title: "Fair dealing", text: "Rates are quoted in writing and held for the period we commit to." },
      ],
    },
    fields: [
      ...headingFields,
      {
        name: "items",
        label: "Values",
        type: "repeater",
        itemLabel: "value",
        max: 6,
        fields: [
          { name: "title", label: "Title" },
          { name: "text", label: "Text", type: "textarea", rows: 2 },
        ],
      },
    ],
  },

  stats: {
    label: "Numbers strip",
    description:
      "Key numbers. 'Automatic' values are counted from the website data; the typed value is used until there is data.",
    schema: z.strictObject({
      items: z
        .array(
          z.strictObject({
            source: z.enum(["manual", "years", "products", "categories", "team"]),
            value: z.coerce.number().int().min(0).max(1_000_000),
            suffix: t(6),
            label: req(60, "Enter a label."),
          }),
        )
        .min(1)
        .max(4),
    }),
    defaults: {
      items: [
        { source: "years", value: 24, suffix: "", label: "Years in the trade" },
        { source: "products", value: 120, suffix: "+", label: "Products in stock" },
        { source: "team", value: 35, suffix: "", label: "People on our team" },
        { source: "manual", value: 25, suffix: "+", label: "States we dispatch to" },
      ],
    },
    fields: [
      {
        name: "items",
        label: "Numbers",
        type: "repeater",
        itemLabel: "number",
        max: 4,
        fields: [
          {
            name: "source",
            label: "Where the number comes from",
            type: "select",
            options: [
              { value: "manual", label: "Typed below" },
              { value: "years", label: "Automatic: years since established" },
              { value: "products", label: "Automatic: published products" },
              { value: "categories", label: "Automatic: product categories" },
              { value: "team", label: "Automatic: team size (Business details)" },
            ],
          },
          { name: "value", label: "Number (used when typed, or until data exists)", type: "number" },
          { name: "suffix", label: "After the number", placeholder: "+" },
          { name: "label", label: "Label" },
        ],
      },
    ],
  },

  process: {
    label: "How ordering works",
    description: "Numbered steps from enquiry to delivery.",
    schema: z.strictObject({
      ...heading,
      steps: z
        .array(z.strictObject({ title: req(60, "Enter a title."), text: t(240) }))
        .min(2)
        .max(6),
      cta,
    }),
    defaults: {
      eyebrow: "Ordering",
      title: "How an order works.",
      intro: "Most first orders are confirmed within two working days of the enquiry.",
      steps: [
        {
          title: "Send your enquiry",
          text: "Product, grade, quantity, pack size and delivery city. A phone call works just as well.",
        },
        {
          title: "Get a written quote",
          text: "Usually the same working day, with a sample if you need one.",
        },
        { title: "Confirm and pay", text: "The material is packed, labelled and dispatched by road." },
        {
          title: "Receive with documents",
          text: "GST invoice, COA and SDS where applicable, with every consignment.",
        },
      ],
      cta: { text: "Start an enquiry", href: "/contact#quote" },
    },
    fields: [
      ...headingFields,
      {
        name: "steps",
        label: "Steps",
        type: "repeater",
        itemLabel: "step",
        max: 6,
        fields: [
          { name: "title", label: "Title" },
          { name: "text", label: "Text", type: "textarea", rows: 2 },
        ],
      },
      ctaFields("cta", "Button"),
    ],
  },

  clientLogos: {
    label: "Client logos",
    description: "Logos from Admin > Client logos (grey, colour on hover). Hidden while there are none.",
    schema: z.strictObject({ eyebrow: t(80), title: t(140) }),
    defaults: { eyebrow: "Trusted by", title: "Some of the manufacturers we supply." },
    fields: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "title", label: "Title", wide: true },
    ],
  },

  testimonials: {
    label: "Testimonials",
    description: "Customer quotes from Admin > Testimonials. Hidden while there are none.",
    schema: z.strictObject({ eyebrow: t(80), title: t(140) }),
    defaults: { eyebrow: "From our customers", title: "What buyers say after the first order." },
    fields: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "title", label: "Title", wide: true },
    ],
  },

  insights: {
    label: "Latest insights",
    description: "The newest published articles. Hidden while there are none.",
    schema: z.strictObject({ ...heading, limit: z.coerce.number().int().min(1).max(6), cta }),
    defaults: {
      eyebrow: "Insights",
      title: "Notes from the trading desk.",
      intro: "Grades, pack sizes, prices and paperwork, explained for buyers.",
      limit: 3,
      cta: { text: "All insights", href: "/insights" },
    },
    fields: [
      ...headingFields,
      { name: "limit", label: "How many articles", type: "number" },
      ctaFields("cta", "Link button"),
    ],
  },

  faq: {
    label: "FAQ",
    description: "Questions and answers. Also sent to Google as FAQ structured data.",
    schema: z.strictObject({
      ...heading,
      items: z
        .array(z.strictObject({ q: req(160, "Enter the question."), a: req(800, "Enter the answer.") }))
        .min(1)
        .max(12),
    }),
    defaults: {
      eyebrow: "Questions",
      title: "Asked before almost every first order.",
      intro: "",
      items: [
        {
          q: "What is your minimum order?",
          a: "For most products 50 kg or 50 L. A few items such as soap bases start at 25 kg.",
        },
        {
          q: "Do you supply outside Delhi?",
          a: "Yes. We dispatch across India by road transport and can arrange FOB for export enquiries.",
        },
        {
          q: "Can I get a sample first?",
          a: "Samples are available for most products. Mention it in your enquiry.",
        },
        {
          q: "Do you provide COA and SDS?",
          a: "Yes, where the producer issues them. Ask for them with your quote.",
        },
        {
          q: "Do you manufacture everything you sell?",
          a: "No. We manufacture and blend some products and supply others from established producers. Each product page states its source.",
        },
        {
          q: "How do I get today's price?",
          a: "Prices move with raw material markets, so we quote on request. Use the quote form or call us.",
        },
      ],
    },
    fields: [
      ...headingFields,
      {
        name: "items",
        label: "Questions",
        type: "repeater",
        itemLabel: "question",
        max: 12,
        fields: [
          { name: "q", label: "Question" },
          { name: "a", label: "Answer", type: "textarea", rows: 3 },
        ],
      },
    ],
  },

  ctaBand: {
    label: "Call to action band",
    description: "Dark band with a quote button and the phone number.",
    schema: z.strictObject({
      eyebrow: t(80),
      title: req(140, "Enter a title."),
      text: t(300),
      cta,
      showPhone: z.boolean(),
    }),
    defaults: {
      eyebrow: "Ready to order",
      title: "Tell us the product, grade and quantity. We will reply with a written quote.",
      text: "Usually the same working day. Samples on request.",
      cta: { text: "Request a quote", href: "/contact#quote" },
      showPhone: true,
    },
    fields: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "title", label: "Title", type: "textarea", rows: 2, required: true },
      { name: "text", label: "Text", wide: true },
      ctaFields("cta", "Button"),
      { name: "showPhone", label: "Show the phone number button", type: "checkbox" },
    ],
  },
};

// Company page sections (Phase 11)
Object.assign(SECTIONS, COMPANY_SECTIONS);

export const SECTION_TYPES = Object.keys(SECTIONS);

/** Order and set used for a brand-new home page (Design.md §7). */
export const HOME_LAYOUT = [
  "hero",
  "featureTriad",
  "aboutTeaser",
  "productFamilies",
  "featuredProducts",
  "industries",
  "numberedValues",
  "stats",
  "process",
  "clientLogos",
  "testimonials",
  "insights",
  "faq",
  "ctaBand",
];

/** Validate one section's data; unknown types are refused. */
export function parseSection(type, data) {
  if (!Object.hasOwn(SECTIONS, type))
    return { success: false, error: { issues: [{ path: ["type"], message: "Unknown section type." }] } };
  return SECTIONS[type].schema.safeParse(data);
}

/** Stored data merged over defaults, validated; broken data falls back to the defaults. */
export function normaliseSection(type, data) {
  const def = SECTIONS[type]?.defaults;
  if (!def) return null;
  const r = SECTIONS[type].schema.safeParse(data && typeof data === "object" ? { ...def, ...data } : def);
  return r.success ? r.data : def;
}
