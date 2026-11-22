import { z } from "zod";

/**
 * Public enquiry forms (Phase 14): quote, contact, sample and callback. Pure module shared by the
 * forms (client) and the API (server). Every free-text field refuses markup; lengths are capped.
 * Anti-spam fields: `website` is a honeypot (must stay empty), `startedAt` is when the form was opened,
 * `turnstileToken` is the Cloudflare Turnstile answer (checked on the server).
 */

const text = (max, label = "This field") =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long (max ${max} characters).`)
    .refine((v) => !/[<>]/.test(v), "Please remove < and > characters.");
const required = (max, msg) => text(max).refine((v) => v.length > 0, msg);

export const INDIAN_PHONE = /^(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/;
export const ANY_PHONE = /^\+?[0-9][0-9\s-]{6,18}$/;

const email = z.string().trim().toLowerCase().max(254).email("Enter a valid email address.");
const phone = (requiredMsg) =>
  z
    .string()
    .trim()
    .max(20)
    .refine((v) => (requiredMsg ? v.length > 0 : true), requiredMsg ?? "")
    .refine(
      (v) => v === "" || INDIAN_PHONE.test(v) || ANY_PHONE.test(v),
      "Enter a valid phone number, e.g. 98100 12345.",
    );
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+){0,9}$/, "Unknown product.");

const antiSpam = {
  website: z.string().max(200).default(""), // honeypot
  startedAt: z.number().int().nonnegative().default(0),
  turnstileToken: z.string().max(2048).default(""),
  source: z
    .string()
    .max(200)
    .default("")
    .transform((v) => (v.startsWith("/") && !v.startsWith("//") ? v : "")),
};

const person = {
  name: required(80, "Enter your name."),
  company: text(120, "Company"),
  email,
  phone: phone(),
  city: text(80, "City"),
};

export const QUOTE_ITEM = z.strictObject({
  slug,
  quantity: required(60, "Enter the quantity, e.g. 500 kg."),
  packSize: text(40, "Pack size").default(""),
});

export const ENQUIRY_TYPES = ["QUOTE", "CONTACT", "SAMPLE", "CALLBACK"];

export const quoteSchema = z.strictObject({
  type: z.literal("QUOTE"),
  items: z
    .array(QUOTE_ITEM)
    .min(1, "Add at least one product.")
    .max(10, "Up to 10 products in one quote request."),
  ...person,
  phone: phone("Enter a phone number so we can discuss the quote."),
  city: required(80, "Enter the delivery city."),
  message: text(2000, "Message").default(""),
  ...antiSpam,
});

export const contactSchema = z.strictObject({
  type: z.literal("CONTACT"),
  ...person,
  message: required(2000, "Write your message."),
  ...antiSpam,
});

export const sampleSchema = z.strictObject({
  type: z.literal("SAMPLE"),
  items: z
    .array(QUOTE_ITEM.extend({ quantity: text(60, "Quantity").default("") }))
    .min(1, "Choose the product.")
    .max(3, "Up to 3 samples at a time."),
  ...person,
  phone: phone("Enter a phone number for the courier."),
  city: required(80, "Enter the delivery city."),
  message: required(1000, "Tell us what you will test the sample for."),
  ...antiSpam,
});

export const callbackSchema = z.strictObject({
  type: z.literal("CALLBACK"),
  name: required(80, "Enter your name."),
  phone: phone("Enter the number we should call."),
  email: email.optional().or(z.literal("")).default(""),
  company: text(120, "Company").default(""),
  city: text(80, "City").default(""),
  message: text(300, "Topic").default(""),
  ...antiSpam,
});

export const enquirySchema = z.discriminatedUnion("type", [
  quoteSchema,
  contactSchema,
  sampleSchema,
  callbackSchema,
]);

/** Admin: status changes, assignment, notes. */
export const ENQUIRY_STATUSES = ["NEW", "IN_PROGRESS", "QUOTED", "WON", "LOST", "SPAM", "CLOSED"];
export const enquiryUpdateSchema = z.strictObject({
  status: z.enum(ENQUIRY_STATUSES).optional(),
  assignedToId: z
    .string()
    .regex(/^c[a-z0-9]{20,32}$/)
    .nullable()
    .optional(),
});
export const enquiryNoteSchema = z.strictObject({ text: required(2000, "Write the note.") });

/** "Add to quote" basket: product slugs only, no personal data (Phase 14 todo 15). */
export const BASKET_COOKIE = "gi_quote";
export const BASKET_MAX = 10;
export function parseBasket(raw) {
  return [
    ...new Set(
      String(raw ?? "")
        .split(".")
        .filter((s) => /^[a-z0-9]+(?:-[a-z0-9]+){0,9}$/.test(s)),
    ),
  ].slice(0, BASKET_MAX);
}
