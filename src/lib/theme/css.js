import { isHexColor } from "./contrast.js";
import { COLOR_TOKENS, DEFAULT_THEME, FONT_WHITELIST } from "./presets.js";

/**
 * Turns a theme's tokens (from DB or preset) into a CSS string of custom properties.
 * Every value is validated against a strict allow-list before it is printed, so a tampered
 * Theme row can never inject CSS or markup (values are hex colours, whitelisted font ids, bounded numbers).
 */

const toKebab = (key) => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

function safeColor(value, fallback) {
  return isHexColor(value) ? value.trim() : fallback;
}

function fontVar(kind, id) {
  const list = FONT_WHITELIST[kind];
  const found = list.find((f) => f.id === id) ?? list[0];
  return `var(${found.cssVar})`;
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function colorBlock(colors, fallbackColors) {
  return COLOR_TOKENS.map(
    ({ key }) => `--c-${toKebab(key)}:${safeColor(colors?.[key], fallbackColors[key])};`,
  ).join("");
}

/**
 * @param {object} tokens Theme.tokens JSON
 * @param {string} [scope] CSS selector the variables apply to (":root" for the site, a class for live previews).
 *   Only simple class/root selectors are accepted.
 * @returns {string} CSS text for a <style> element
 */
export function themeToCss(tokens, scope = ":root") {
  if (!/^(:root|\.[a-z][a-z0-9-]{0,40})$/.test(scope)) scope = ":root";
  const fallback = DEFAULT_THEME.tokens;
  const t = tokens && typeof tokens === "object" ? tokens : fallback;
  const light = colorBlock(t.colors?.light, fallback.colors.light);
  const dark = colorBlock(t.colors?.dark, fallback.colors.dark);
  const fonts = t.fonts ?? fallback.fonts;
  const radiusBtn = clampInt(t.radius?.button, 0, 24, 10);
  const radiusCard = clampInt(t.radius?.card, 0, 32, 16);
  const compact = t.density === "compact";

  const shared =
    `--ff-display:${fontVar("display", fonts.display)};` +
    `--ff-body:${fontVar("body", fonts.body)};` +
    // No monospace anywhere: "data" text (CAS numbers, specs, figures) uses the body font with tabular numbers.
    `--ff-data:var(--ff-body);` +
    `--r-btn:${radiusBtn}px;--r-card:${radiusCard}px;` +
    `--sy:${compact ? "60px" : "76px"};--sy-sm:${compact ? "44px" : "52px"};`;

  const darkSel = scope === ":root" ? ':root[data-theme="dark"]' : `${scope}[data-theme="dark"]`;
  const outline =
    t.buttonStyle === "outline"
      ? `${scope} [data-btn="primary"]{background-color:transparent;color:var(--c-primary);}` +
        `${scope} [data-btn="primary"]:hover{background-color:color-mix(in oklab,var(--c-primary) 8%,transparent);}`
      : "";
  return `${scope}{${shared}${light}}${darkSel}{${dark}color-scheme:dark;}${outline}`;
}

/** Theme mode attribute for <html data-theme>. */
export function themeMode(theme) {
  return theme?.mode === "DARK" ? "dark" : "light";
}
