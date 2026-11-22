import { z } from "zod";

import { safeHref } from "./schemas.js";

/** Menu locations and their rules (Phase 8 todo 04). Pure module. */
export const MENU_LOCATIONS = {
  HEADER: {
    label: "Header navigation",
    hint: "Main links across the top. Second-level links appear as a dropdown.",
    nested: true,
    maxItems: 9,
  },
  MEGA: {
    label: "Products mega menu",
    hint: "Product families with their categories. Filled from the catalogue in Phase 12; editable here.",
    nested: true,
    maxItems: 8,
  },
  FOOTER_QUICK: {
    label: "Footer: quick links",
    hint: "Company pages in the footer.",
    nested: false,
    maxItems: 10,
  },
  FOOTER_PRODUCTS: {
    label: "Footer: products",
    hint: "Product families or categories in the footer.",
    nested: false,
    maxItems: 10,
  },
  FOOTER_LEGAL: {
    label: "Footer: legal",
    hint: "Privacy, terms and similar links in the bottom bar.",
    nested: false,
    maxItems: 6,
  },
};
export const LOCATION_KEYS = Object.keys(MENU_LOCATIONS);

const label = z
  .string()
  .trim()
  .min(1, "Enter a label.")
  .max(60, "Keep labels short.")
  .refine((v) => !/[<>]/.test(v), "Cannot contain < or >.");
const href = safeHref.refine((v) => v !== "", "Enter a link.");

const child = z.strictObject({
  label,
  href,
  newTab: z.boolean().default(false),
  isVisible: z.boolean().default(true),
});
const parent = child.extend({ children: z.array(child).max(20).default([]) });

export function menuSchemaFor(location) {
  const cfg = MENU_LOCATIONS[location];
  const item = cfg.nested
    ? parent
    : child.extend({ children: z.array(child).max(0, "This menu has one level only.").default([]) });
  return z.strictObject({ items: z.array(item).max(cfg.maxItems, `At most ${cfg.maxItems} items here.`) });
}

/** Seed defaults. Pages that do not exist yet are created in Phases 10-15 (no dead links at launch). */
export const MENU_DEFAULTS = {
  HEADER: [
    {
      label: "About",
      href: "/about",
      children: [
        { label: "Company profile", href: "/about" },
        { label: "Why Global India", href: "/why-us" },
        { label: "Quality and documents", href: "/quality" },
        { label: "Gallery", href: "/gallery" },
      ],
    },
    { label: "Products", href: "/products", children: [] },
    { label: "Industries", href: "/industries", children: [] },
    { label: "Insights", href: "/insights", children: [] },
    { label: "Contact", href: "/contact", children: [] },
  ],
  MEGA: [
    { label: "Food Ingredients & Additives", href: "/products?family=food", children: [] },
    { label: "Personal Care & Cosmetic Bases", href: "/products?family=personal-care", children: [] },
    { label: "Detergent & Surfactant Raw Materials", href: "/products?family=detergent", children: [] },
    { label: "Paraffins, Oils & Glycols", href: "/products?family=paraffins-oils-glycols", children: [] },
    { label: "Industrial & Laboratory Chemicals", href: "/products?family=industrial-lab", children: [] },
    { label: "Finished Home & Auto Care", href: "/products?family=home-auto-care", children: [] },
  ],
  FOOTER_QUICK: [
    { label: "About us", href: "/about" },
    { label: "Why Global India", href: "/why-us" },
    { label: "Quality and documents", href: "/quality" },
    { label: "Industries we serve", href: "/industries" },
    { label: "Insights", href: "/insights" },
    { label: "FAQ", href: "/faq" },
    { label: "Downloads", href: "/downloads" },
    { label: "Supplier in Delhi", href: "/chemical-supplier-delhi" },
    { label: "Supplier for Delhi NCR", href: "/chemical-supplier-delhi-ncr" },
    { label: "Contact", href: "/contact" },
  ],
  FOOTER_PRODUCTS: [
    { label: "Light Liquid Paraffin", href: "/products/light-liquid-paraffin" },
    { label: "Refined Glycerine", href: "/products/refined-glycerine" },
    { label: "Detergent raw materials", href: "/products/detergent-raw-material" },
    { label: "Food additives", href: "/products/food-additive" },
    { label: "All products", href: "/products" },
  ],
  FOOTER_LEGAL: [
    { label: "Privacy policy", href: "/legal/privacy" },
    { label: "Terms of use", href: "/legal/terms" },
    { label: "Cookie policy", href: "/legal/cookies" },
    { label: "Shipping and returns", href: "/legal/shipping" },
    { label: "Disclaimer", href: "/legal/disclaimer" },
  ],
};
