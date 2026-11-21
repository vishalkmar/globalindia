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
  return COLOR_TOKENS.map(({ key }) => `--c-${toKebab(key)}:${safeColor(colors?.[key], fallbackColors[key])};`).join("");
}

/**
 * @param {object} tokens Theme.tokens JSON
 * @returns {string} CSS text for a <style> element
 */
export function themeToCss(tokens) {
  const fallback = DEFAULT_THEME.tokens;
  const t = tokens && typeof tokens === "object" ? tokens : fallback;
  const light = colorBlock(t.colors?.light, fallback.colors.light);
  const dark = colorBlock(t.colors?.dark, fallback.colors.dark);
  const fonts = t.fonts ?? fallback.fonts;
  const radiusBtn = clampInt(t.radius?.button, 0, 24, 6);
  const radiusCard = clampInt(t.radius?.card, 0, 32, 10);
  const compact = t.density === "compact";

  const shared =
    `--ff-display:${fontVar("display", fonts.display)};` +
    `--ff-body:${fontVar("body", fonts.body)};` +
    `--ff-data:${fontVar("data", fonts.data)};` +
    `--r-btn:${radiusBtn}px;--r-card:${radiusCard}px;` +
    `--sy:${compact ? "64px" : "96px"};--sy-sm:${compact ? "48px" : "64px"};`;

  return `:root{${shared}${light}}:root[data-theme="dark"]{${dark}color-scheme:dark;}`;
}

/** Theme mode attribute for <html data-theme>. */
export function themeMode(theme) {
  return theme?.mode === "DARK" ? "dark" : "light";
}
