/**
 * Serialise structured data for <script type="application/ld+json">.
 * "<" is escaped so a value containing "</script>" can never close the tag (Phase 20 todo 08),
 * and the two JavaScript line terminators are escaped as well.
 */
const LINE_SEP = new RegExp("\\u2028", "g");
const PARA_SEP = new RegExp("\\u2029", "g");

export function jsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(LINE_SEP, "\\u2028")
    .replace(PARA_SEP, "\\u2029");
}
