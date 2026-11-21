/**
 * Theme presets and token model.
 * A theme is stored in the DB (Theme.tokens) with this exact shape; the server prints the active
 * theme as CSS variables on <html>. Pure data — safe to import on client and server.
 *
 * Colour roles (Design.md §2): only primary + accent + surface carry brand colour, the rest are neutrals.
 */

/** Ordered list of colour tokens with human labels (used by the admin theme editor). */
export const COLOR_TOKENS = [
  { key: "primary", label: "Primary", hint: "Buttons, headings, footer background" },
  { key: "primaryInk", label: "Text on primary", hint: "Text and icons placed on the primary colour" },
  { key: "accent", label: "Accent", hint: "Thin lines, active underline, focus ring. Keep under 5% of a screen" },
  { key: "accentText", label: "Accent text", hint: "Accent used as small text (eyebrows, stat numbers) — must pass AA" },
  { key: "band", label: "Dark band", hint: "Footer, CTA band and other dark full-width sections" },
  { key: "bandInk", label: "Text on dark band", hint: "Text placed on the dark band" },
  { key: "bg", label: "Page background", hint: "Main page background" },
  { key: "surface", label: "Surface", hint: "Alternating section background" },
  { key: "card", label: "Card", hint: "Cards, inputs, menus" },
  { key: "ink", label: "Body text", hint: "Main text colour" },
  { key: "muted", label: "Secondary text", hint: "Captions, helper text" },
  { key: "line", label: "Lines", hint: "1 px borders and dividers" },
  { key: "success", label: "Success", hint: "Form success messages" },
  { key: "error", label: "Error", hint: "Form errors" },
];

/** Fonts allowed in the theme editor. `id` maps to a CSS variable set by next/font in src/lib/fonts.js */
export const FONT_WHITELIST = {
  display: [
    { id: "fraunces", label: "Fraunces", cssVar: "--font-fraunces" },
    { id: "source-serif", label: "Source Serif 4", cssVar: "--font-source-serif" },
    { id: "newsreader", label: "Newsreader", cssVar: "--font-newsreader" },
  ],
  body: [
    { id: "manrope", label: "Manrope", cssVar: "--font-manrope" },
    { id: "inter-tight", label: "Inter Tight", cssVar: "--font-inter-tight" },
    { id: "ibm-plex-sans", label: "IBM Plex Sans", cssVar: "--font-ibm-plex-sans" },
    { id: "work-sans", label: "Work Sans", cssVar: "--font-work-sans" },
  ],
  data: [
    { id: "jetbrains-mono", label: "JetBrains Mono", cssVar: "--font-jetbrains-mono" },
    { id: "ibm-plex-mono", label: "IBM Plex Mono", cssVar: "--font-ibm-plex-mono" },
  ],
};

const pineBrass = {
  light: {
    primary: "#0F3B3A",
    primaryInk: "#FFFFFF",
    accent: "#B9852F",
    accentText: "#80591A",
    band: "#0F3B3A",
    bandInk: "#FFFFFF",
    bg: "#FFFFFF",
    surface: "#F6F4EF",
    card: "#FFFFFF",
    ink: "#16201F",
    muted: "#5B6766",
    line: "#DCD8CE",
    success: "#2F6B3F",
    error: "#A3352B",
  },
  dark: {
    primary: "#7FB5AE",
    primaryInk: "#0E1514",
    accent: "#D3A253",
    accentText: "#D9AE66",
    band: "#0A2726",
    bandInk: "#E8E6E0",
    bg: "#0E1514",
    surface: "#131D1C",
    card: "#182423",
    ink: "#E8E6E0",
    muted: "#9DA8A6",
    line: "#2A3836",
    success: "#7FBF8E",
    error: "#E58A80",
  },
};

const navyCopper = {
  light: {
    primary: "#14284B",
    primaryInk: "#FFFFFF",
    accent: "#B4683A",
    accentText: "#8F4E26",
    band: "#14284B",
    bandInk: "#FFFFFF",
    bg: "#FFFFFF",
    surface: "#F4F5F7",
    card: "#FFFFFF",
    ink: "#161B26",
    muted: "#5A6272",
    line: "#D9DDE4",
    success: "#2F6B3F",
    error: "#A3352B",
  },
  dark: {
    primary: "#9DB4DB",
    primaryInk: "#0C1220",
    accent: "#D58B5C",
    accentText: "#DE9B70",
    band: "#0F1D36",
    bandInk: "#E6E9EF",
    bg: "#0C1220",
    surface: "#111A2C",
    card: "#162136",
    ink: "#E6E9EF",
    muted: "#9AA3B5",
    line: "#26324A",
    success: "#7FBF8E",
    error: "#E58A80",
  },
};

const graphiteSaffron = {
  light: {
    primary: "#262A2E",
    primaryInk: "#FFFFFF",
    accent: "#B8780C",
    accentText: "#8A5A06",
    band: "#262A2E",
    bandInk: "#FFFFFF",
    bg: "#FFFFFF",
    surface: "#F5F4F1",
    card: "#FFFFFF",
    ink: "#1A1C1E",
    muted: "#5E6368",
    line: "#DDDBD6",
    success: "#2F6B3F",
    error: "#A3352B",
  },
  dark: {
    primary: "#C9CDD2",
    primaryInk: "#141618",
    accent: "#E3A43A",
    accentText: "#E8B04F",
    band: "#202326",
    bandInk: "#ECEAE6",
    bg: "#141618",
    surface: "#1A1D20",
    card: "#202428",
    ink: "#ECEAE6",
    muted: "#A2A7AD",
    line: "#30353A",
    success: "#7FBF8E",
    error: "#E58A80",
  },
};

const baseTokens = {
  fonts: { display: "fraunces", body: "manrope", data: "jetbrains-mono" },
  radius: { button: 6, card: 10 },
  density: "comfortable", // comfortable | compact
  buttonStyle: "solid", // solid | outline
};

export const THEME_PRESETS = [
  { slug: "pine-brass", name: "Pine & Brass", tokens: { ...baseTokens, colors: pineBrass } },
  { slug: "navy-copper", name: "Navy & Copper", tokens: { ...baseTokens, colors: navyCopper } },
  {
    slug: "graphite-saffron",
    name: "Graphite & Saffron",
    tokens: { ...baseTokens, fonts: { display: "source-serif", body: "ibm-plex-sans", data: "ibm-plex-mono" }, colors: graphiteSaffron },
  },
];

export const DEFAULT_THEME = THEME_PRESETS[0];

/** Pairs that must meet WCAG AA. `min` = required contrast ratio. */
export const CONTRAST_PAIRS = [
  { fg: "ink", bg: "bg", min: 4.5, use: "Body text on page" },
  { fg: "ink", bg: "surface", min: 4.5, use: "Body text on surface" },
  { fg: "ink", bg: "card", min: 4.5, use: "Body text on card" },
  { fg: "muted", bg: "bg", min: 4.5, use: "Secondary text on page" },
  { fg: "muted", bg: "surface", min: 4.5, use: "Secondary text on surface" },
  { fg: "primary", bg: "bg", min: 4.5, use: "Headings / links on page" },
  { fg: "primary", bg: "surface", min: 4.5, use: "Headings / links on surface" },
  { fg: "primaryInk", bg: "primary", min: 4.5, use: "Button and footer text" },
  { fg: "accentText", bg: "bg", min: 4.5, use: "Eyebrow / stat text on page" },
  { fg: "accentText", bg: "surface", min: 4.5, use: "Eyebrow / stat text on surface" },
  { fg: "accent", bg: "bg", min: 3, use: "Accent lines and focus ring (non-text)" },
  { fg: "accent", bg: "band", min: 3, use: "Accent line on dark band" },
  { fg: "bandInk", bg: "band", min: 4.5, use: "Text on dark band (footer, CTA)" },
  { fg: "line", bg: "bg", min: 1.2, use: "Divider visible (decorative)" },
  { fg: "error", bg: "card", min: 4.5, use: "Error text in forms" },
  { fg: "success", bg: "card", min: 4.5, use: "Success text in forms" },
];
