import { z } from "zod";

/**
 * Site settings (SiteSetting key -> JSON). One strict Zod schema per key, used by the admin form
 * (instant feedback) AND the API (the real check). Pure module: safe on client and server.
 *
 * Every link field only accepts internal paths ("/contact"), https URLs, tel: or mailto:
 * — never javascript: or protocol-relative "//host" (Phase 20 todo 03).
 */

const text = (max, msg = "Too long.") => z.string().trim().max(max, msg);
const required = (max, msg) => z.string().trim().min(1, msg).max(max, "Too long.");
const noTags = (s) => s.refine((v) => !/[<>]/.test(v), "Cannot contain < or >.");

export const safeHref = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^\/(?!\/)[\w\-./?=&#%~+]*$/.test(v) || /^https:\/\/[^\s/]+\.[^\s]+$/i.test(v) || /^(tel:\+?[\d\s-]{6,20}|mailto:[^\s@]+@[^\s@]+\.[^\s@]+)$/i.test(v), {
    message: "Use a page path like /contact, an https:// link, tel: or mailto:.",
  });

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/[^\s/]+\.[^\s]+$/i.test(v), "Use a full https:// link.");

const mediaId = z.string().regex(/^c[a-z0-9]{20,32}$/).nullable().default(null);
const phone = z.string().trim().regex(/^\+?[\d\s-]{6,20}$/, "Use digits, spaces, + and - only, e.g. +91 80717 79152.");

/* ---------- business ---------- */
export const businessSchema = z.strictObject({
  name: noTags(required(80, "Enter the trading name.")),
  legalName: noTags(text(120)),
  tagline: noTags(text(160)),
  established: z.coerce.number().int().min(1900).max(2100),
  proprietor: noTags(text(80)),
  natureOfBusiness: noTags(text(120)),
  teamSize: z.coerce.number().int().min(1).max(100000),
  banker: noTags(text(80)),
  gst: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^$|^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "GSTIN has 15 characters, e.g. 07BMMPA5592C1Z4."),
  address: z.strictObject({
    line1: noTags(required(120, "Enter the address.")),
    line2: noTags(text(120)),
    city: noTags(required(60, "Enter the city.")),
    pin: z.string().trim().regex(/^\d{6}$/, "PIN code has 6 digits."),
    state: noTags(text(60)),
    country: noTags(text(60)),
  }),
  phones: z.array(z.strictObject({ label: noTags(text(40)), number: phone })).max(6),
  emails: z.array(z.strictObject({ label: noTags(text(40)), email: z.string().trim().toLowerCase().email("Enter a valid email.") })).max(6),
  whatsapp: z.string().trim().regex(/^$|^\+?\d{10,15}$/, "Digits only with country code, e.g. 918071779152."),
  hours: noTags(text(120)),
  market: noTags(text(160)),
  mapUrl: httpsUrl.refine((v) => v === "" || /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed|^https:\/\/maps\.google\.[a-z.]+\//i.test(v), "Use the Google Maps embed link (Share > Embed a map)."),
});

/* ---------- top bar ---------- */
export const topbarSchema = z.strictObject({
  enabled: z.boolean(),
  showPhone: z.boolean(),
  showEmail: z.boolean(),
  showGst: z.boolean(),
  showHours: z.boolean(),
  message: noTags(text(90)),
});

/* ---------- header ---------- */
export const headerSchema = z.strictObject({
  logoLightId: mediaId,
  logoDarkId: mediaId,
  logoText: noTags(required(60, "Enter the text shown when no logo is uploaded.")),
  ctaText: noTags(required(32, "Enter the button text.")),
  ctaHref: safeHref.refine((v) => v !== "", "Enter where the button goes."),
  showCall: z.boolean(),
  sticky: z.boolean(),
  showSearch: z.boolean(),
});

/* ---------- footer ---------- */
export const footerSchema = z.strictObject({
  aboutText: noTags(text(400)),
  showNewsletter: z.boolean(),
  newsletterText: noTags(text(160)),
  bottomText: noTags(text(160)),
  showGst: z.boolean(),
});

/* ---------- social ---------- */
export const socialSchema = z.strictObject({
  linkedin: httpsUrl,
  facebook: httpsUrl,
  instagram: httpsUrl,
  youtube: httpsUrl,
  x: httpsUrl,
  indiamart: httpsUrl,
  tradeindia: httpsUrl,
});

/* ---------- SEO defaults ---------- */
export const seoSchema = z.strictObject({
  siteName: noTags(required(60, "Enter the site name.")),
  titleTemplate: noTags(required(80, "Enter a template.")).refine((v) => v.includes("%s"), "Keep %s where the page title goes."),
  defaultTitle: noTags(required(70, "Enter a default title.")),
  defaultDescription: noTags(text(170, "Keep it under 170 characters.")),
  ogImageId: mediaId,
  faviconId: mediaId,
  googleVerification: z.string().trim().regex(/^[A-Za-z0-9_-]{0,100}$/, "Paste only the content value of the meta tag."),
  bingVerification: z.string().trim().regex(/^[A-Za-z0-9_-]{0,100}$/, "Paste only the content value of the meta tag."),
});

/* ---------- analytics (IDs only — no scripts can be pasted) ---------- */
export const analyticsSchema = z.strictObject({
  ga4Id: z.string().trim().toUpperCase().regex(/^$|^G-[A-Z0-9]{4,12}$/, "GA4 IDs look like G-ABC123XYZ."),
  clarityId: z.string().trim().regex(/^$|^[a-z0-9]{6,16}$/, "Clarity IDs are 6-16 lowercase letters/numbers."),
});

/* ---------- maintenance ---------- */
export const maintenanceSchema = z.strictObject({
  enabled: z.boolean(),
  title: noTags(required(80, "Enter a title.")),
  message: noTags(text(300)),
});

/* ---------- uploads (within hard caps in code) ---------- */
export const uploadsSchema = z.strictObject({
  imageMaxMB: z.coerce.number().min(0.5).max(5),
  pdfMaxMB: z.coerce.number().min(1).max(10),
});

/** key -> { schema, resource (role matrix), label } */
export const SETTINGS = {
  business: { schema: businessSchema, resource: "business", label: "Business details" },
  topbar: { schema: topbarSchema, resource: "siteSettings", label: "Top bar" },
  header: { schema: headerSchema, resource: "siteSettings", label: "Header" },
  footer: { schema: footerSchema, resource: "siteSettings", label: "Footer" },
  social: { schema: socialSchema, resource: "siteSettings", label: "Social links" },
  seo: { schema: seoSchema, resource: "seo", label: "SEO defaults" },
  analytics: { schema: analyticsSchema, resource: "security", label: "Analytics" },
  maintenance: { schema: maintenanceSchema, resource: "security", label: "Maintenance mode" },
  uploads: { schema: uploadsSchema, resource: "security", label: "Upload limits" },
};

/** Real defaults (docs/Content.md, Memory.md). Used by the seed and whenever a key is missing. */
export const SETTING_DEFAULTS = {
  business: {
    name: "Global India",
    legalName: "Global INDIA",
    tagline: "Chemical raw materials supplier, Delhi",
    established: 2002,
    proprietor: "Akash Rathod",
    natureOfBusiness: "Manufacturer, Supplier and Trader",
    teamSize: 35,
    banker: "Kotak Mahindra Bank",
    gst: "07BMMPA5592C1Z4",
    address: { line1: "419, Khasra No-300, Ground Floor", line2: "Burari Road", city: "Delhi", pin: "110084", state: "Delhi", country: "India" },
    phones: [{ label: "Sales", number: "+91 80717 79152" }],
    emails: [],
    whatsapp: "",
    hours: "Monday to Saturday, 10:00 am to 7:00 pm",
    market: "All India; export enquiries accepted (FOB)",
    mapUrl: "",
  },
  topbar: { enabled: true, showPhone: true, showEmail: true, showGst: true, showHours: true, message: "Dispatch across India, usually within 7 working days" },
  header: { logoLightId: null, logoDarkId: null, logoText: "Global India", ctaText: "Request a quote", ctaHref: "/contact#quote", showCall: true, sticky: true, showSearch: true },
  footer: {
    aboutText:
      "Chemical raw materials from Burari Road, Delhi, since 2002. Surfactants, glycols, paraffins, food additives and soap bases in practical pack sizes, with the paperwork your buyers ask for.",
    showNewsletter: true,
    newsletterText: "A short note when prices move or new stock arrives. No more than twice a month.",
    bottomText: "Global India. All rights reserved.",
    showGst: true,
  },
  social: { linkedin: "", facebook: "", instagram: "", youtube: "", x: "", indiamart: "", tradeindia: "" },
  seo: {
    siteName: "Global India",
    titleTemplate: "%s | Global India, Delhi",
    defaultTitle: "Chemical Raw Material Supplier in Delhi | Global India",
    defaultDescription: "Global India supplies Light Liquid Paraffin, Propylene Glycol, SLES, Xanthan Gum, glycerine and 120+ chemicals from Delhi since 2002. MOQ from 50 kg.",
    ogImageId: null,
    faviconId: null,
    googleVerification: "",
    bingVerification: "",
  },
  analytics: { ga4Id: "", clarityId: "" },
  maintenance: {
    enabled: false,
    title: "We are updating the website",
    message: "The site will be back shortly. For orders and quotes, please call +91 80717 79152.",
  },
  uploads: { imageMaxMB: 5, pdfMaxMB: 10 },
};

/** Merge a stored value over defaults and validate; invalid stored data falls back to defaults. */
export function normaliseSetting(key, stored) {
  const def = SETTING_DEFAULTS[key];
  const merged = stored && typeof stored === "object" ? { ...def, ...stored } : def;
  const r = SETTINGS[key].schema.safeParse(merged);
  return r.success ? r.data : def;
}
