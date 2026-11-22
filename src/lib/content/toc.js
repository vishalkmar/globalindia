/**
 * Table of contents for an article (Phase 15 todo 06). Input is ALREADY sanitised HTML, in which
 * <h2>/<h3> carry no attributes; this adds a unique id to each and returns the list for the TOC.
 * Pure: no DOM, used on the server and in tests.
 */

const decode = (s) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();

const slug = (text) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";

/** @returns {{ html: string, toc: { id: string, text: string, level: 2|3 }[] }} */
export function withHeadingIds(html) {
  const toc = [];
  const used = new Map();
  const out = String(html ?? "").replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level, inner) => {
    const text = decode(inner);
    const base = `s-${slug(text)}`;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    toc.push({ id, text, level: Number(level) });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, toc };
}

/** Rough reading time at 200 words a minute (at least 1 minute). */
export function readingMinutes(html) {
  const words = decode(String(html ?? ""))
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
