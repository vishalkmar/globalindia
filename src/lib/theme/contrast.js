/**
 * WCAG 2.x contrast helpers. Used by the contrast check script, unit tests and the admin theme editor
 * (live warning next to each colour picker).
 */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value) {
  return typeof value === "string" && HEX.test(value.trim());
}

export function hexToRgb(hex) {
  const m = String(hex).trim().match(HEX);
  if (!m) throw new Error("Invalid hex colour");
  let h = m[1];
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two hex colours, 1..21, rounded to 2 decimals. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/**
 * Check a colour set against required pairs.
 * @param {Record<string,string>} colors
 * @param {{fg:string,bg:string,min:number,use:string}[]} pairs
 */
export function checkPairs(colors, pairs) {
  return pairs.map((p) => {
    const ratio = contrastRatio(colors[p.fg], colors[p.bg]);
    return { ...p, ratio, pass: ratio >= p.min };
  });
}
