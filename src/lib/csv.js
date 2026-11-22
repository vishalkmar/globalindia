/**
 * Small RFC 4180 CSV reader/writer (Phase 12 todo 14). Pure, no dependencies.
 *
 * Writing guards against spreadsheet formula injection (CSV injection): a cell that starts with
 * = + - @ or a tab/carriage return is prefixed with an apostrophe, so Excel shows it as text instead
 * of running it. Reading strips that apostrophe again, so an export can be re-imported unchanged.
 */

const DANGEROUS = /^[=+\-@\t\r]/;

function cell(value) {
  let s = value === null || value === undefined ? "" : String(value);
  if (DANGEROUS.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** @param {string[]} header @param {Array<Record<string, unknown>>} rows */
export function toCsv(header, rows) {
  const lines = [header.map(cell).join(",")];
  for (const r of rows) lines.push(header.map((h) => cell(r[h])).join(","));
  // BOM so Excel opens UTF-8 (degree signs, en dashes) correctly
  return `﻿${lines.join("\r\n")}\r\n`;
}

/**
 * Parse CSV text into rows of strings. Handles quoted fields, escaped quotes, CRLF/LF and a BOM.
 * @returns {string[][]}
 */
export function parseCsv(text) {
  const src = text.replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === "") quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (quoted) throw new Error("A quoted field is not closed.");
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Parse with a header row into objects; the export's protective apostrophe is removed. */
export function parseCsvObjects(text) {
  const [header, ...body] = parseCsv(text);
  if (!header) return { header: [], rows: [] };
  const keys = header.map((h) => h.trim().toLowerCase());
  const unquote = (v) => (/^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v);
  return {
    header: keys,
    rows: body.map((r) => Object.fromEntries(keys.map((k, i) => [k, unquote((r[i] ?? "").trim())]))),
  };
}
