import { inflateSync } from "node:zlib";

/**
 * File-type detection from the actual bytes ("magic bytes"), never from the file name or the
 * Content-Type the browser claims (Phase 7 todo 07, Phase 19 todo 09). Pure functions, no network.
 */

export const IMAGE_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};
export const PDF_TYPE = "application/pdf";
export const ALLOWED_MIME = [...Object.values(IMAGE_TYPES), PDF_TYPE];

const startsWith = (buf, bytes, offset = 0) => bytes.every((b, i) => buf[offset + i] === b);
const ascii = (buf, start, end) => Buffer.from(buf.subarray(start, end)).toString("latin1");

/**
 * @param {Uint8Array} buf first bytes of the file (at least 32)
 * @returns {{ ext: string, mime: string, kind: 'image'|'pdf' } | null}
 */
export function detectFileType(buf) {
  if (!buf || buf.length < 12) return null;
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { ext: "jpg", mime: IMAGE_TYPES.jpg, kind: "image" };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { ext: "png", mime: IMAGE_TYPES.png, kind: "image" };
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP")
    return { ext: "webp", mime: IMAGE_TYPES.webp, kind: "image" };
  if (ascii(buf, 4, 8) === "ftyp") {
    const brand = ascii(buf, 8, 12);
    if (brand === "avif" || brand === "avis") return { ext: "avif", mime: IMAGE_TYPES.avif, kind: "image" };
  }
  // "%PDF-" must appear within the first 8 bytes (a few leading junk bytes are common in real files).
  const at = ascii(buf, 0, Math.min(buf.length, 13)).indexOf("%PDF-");
  if (at >= 0 && at <= 8) return { ext: "pdf", mime: PDF_TYPE, kind: "pdf" };
  return null;
}

/** True when the bytes look like SVG/HTML/XML (always refused: scripts can hide in them). */
export function looksLikeMarkup(buf) {
  const text = ascii(buf, 0, Math.min(buf.length, 512)).replace(/^﻿/, "").trimStart().toLowerCase();
  return text.startsWith("<") || text.includes("<svg") || text.includes("<script") || text.includes("<html");
}

const STREAM_START = new RegExp("stream\\r?\\n", "g");

/**
 * Refuse PDFs that can run code or open things on their own (Phase 19 todo 12):
 * JavaScript, launch actions, embedded files, rich media, XFA forms, remote go-to.
 * - Scans raw tokens AND the inflated content of compressed streams (attackers hide /JavaScript
 *   inside compressed object streams).
 * - Normalises "#xx" name escapes (/J#61vaScript).
 * - /OpenAction and /AA alone are normal ("open at page 1, fit width") and are allowed; a JavaScript
 *   or Launch action behind them is caught by the rules below.
 * @param {Uint8Array} buf the whole file
 * @returns {string|null} reason or null when clean
 */
export function pdfActiveContent(buf) {
  const raw = Buffer.from(buf).toString("latin1");
  if (/\/Encrypt\b/.test(raw))
    return "is password-protected, so it cannot be checked. Save it as an unprotected PDF";

  let text = raw;
  let budget = 40 * 1024 * 1024;
  let count = 0;
  STREAM_START.lastIndex = 0;
  let m;
  while ((m = STREAM_START.exec(raw)) && count < 2000 && budget > 0) {
    count++;
    const start = m.index + m[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    try {
      const out = inflateSync(Buffer.from(raw.slice(start, end), "latin1"), {
        maxOutputLength: 8 * 1024 * 1024,
      });
      budget -= out.length;
      text += "\n" + out.toString("latin1");
    } catch {
      // not a Flate stream (image data etc.)
    }
    STREAM_START.lastIndex = end;
  }

  const normalised = text.replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const rules = [
    [/\/JavaScript\b/, "contains JavaScript"],
    [/\/JS\s*[(<[\d]/, "contains JavaScript"],
    [/\/Launch\b/, "tries to launch a program"],
    [/\/EmbeddedFile\b/, "has embedded files"],
    [/\/RichMedia\b/, "has embedded media"],
    [/\/XFA\b/, "uses an XFA form"],
    [/\/SubmitForm\b/, "submits form data"],
    [/\/ImportData\b/, "imports external data"],
    [/\/GoToR\b|\/GoToE\b/, "opens other files"],
  ];
  for (const [re, reason] of rules) if (re.test(normalised)) return reason;
  return null;
}
