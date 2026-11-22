import "server-only";

import sanitizeHtmlLib from "sanitize-html";

/**
 * Rich-text sanitiser (Phase 6 todo 10, Phase 20). Runs on the SERVER on every save, so even a
 * hand-crafted API request cannot store script. Allow-list only: anything not listed is removed.
 * - No script/style/iframe/object/svg/form, no event handlers, no style attributes.
 * - Links: http, https, mailto, tel only; external links get rel="noopener noreferrer nofollow".
 * - Images are not allowed inside rich text (images go through the media library with alt text).
 */
const OPTIONS = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "code",
    "hr",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    th: ["scope", "colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: true,
  parseStyleAttributes: false,
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href);
      return {
        tagName: "a",
        attribs: external ? { href, target: "_blank", rel: "noopener noreferrer nofollow" } : { href },
      };
    },
    h1: "h2", // only one H1 per page (the page title)
  },
  exclusiveFilter: (frame) => frame.tag === "a" && !frame.attribs.href,
};

const MAX_HTML = 200_000;

/** @param {string} html */
export function sanitizeRichText(html) {
  if (typeof html !== "string") return "";
  return sanitizeHtmlLib(html.slice(0, MAX_HTML), OPTIONS).trim();
}

/** Plain text only (titles, alt text, meta descriptions). */
export function stripTags(text, max = 5000) {
  if (typeof text !== "string") return "";
  return sanitizeHtmlLib(text.slice(0, max), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
