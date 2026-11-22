#!/usr/bin/env node
/**
 * Performance budget (Phase 16 todo 17): JavaScript downloaded per route, compressed, on a production
 * build: the scripts in each page's HTML, gzip-compressed (what the browser downloads). Budget: 170 KB per route. Usage: node scripts/js-budget.mjs http://localhost:3200
 */
import { gzipSync } from "node:zlib";

const base = process.argv[2] ?? "http://localhost:3000";
const BUDGET = 170 * 1024;
const ROUTES = [
  "/",
  "/about",
  "/products",
  "/products/light-liquid-paraffin",
  "/products/anionic-surfactants/sles-70",
  "/contact",
  "/faq",
  "/industries/food-beverage",
  "/insights",
  "/insights/how-to-read-a-coa",
  "/legal/privacy",
];

const rows = [];
try {
  for (const route of ROUTES) {
    // Scripts the page itself loads (its HTML <script src>). Chunks Next prefetches for links on the
    // page are background work for the NEXT page, so they do not count against this route.
    const html = await (await fetch(`${base}${route}`)).text();
    // <script noModule> (legacy polyfills) is never downloaded by modern browsers, so it is skipped.
    const tags = [...html.matchAll(/<script([^>]+)>/g)]
      .map((m) => m[1])
      .filter((attrs) => !/nomodule/i.test(attrs));
    const srcs = [
      ...new Set(
        tags
          .map((attrs) => attrs.match(/src="([^"]+)"/)?.[1])
          .filter(Boolean)
          .map((src) => new URL(src, base).href),
      ),
    ];
    let total = 0;
    for (const src of srcs) {
      const res = await fetch(src, { headers: { "accept-encoding": "gzip" } });
      total += (await res.arrayBuffer()).byteLength; // fetch decodes; measure gzip below instead
    }
    let gz = 0;
    for (const src of srcs) {
      const raw = await fetch(src, { headers: { "accept-encoding": "identity" } }).then((r) =>
        r.arrayBuffer(),
      );
      gz += gzipSync(Buffer.from(raw)).length;
    }
    rows.push({
      route,
      files: srcs.length,
      kb: Math.round(gz / 1024),
      rawKb: Math.round(total / 1024),
      ok: gz <= BUDGET,
    });
  }
} finally {
  /* nothing to close */
}
console.table(rows);
const over = rows.filter((r) => !r.ok);
console.log(
  over.length
    ? `OVER BUDGET: ${over.map((r) => r.route).join(", ")}`
    : `All routes within ${BUDGET / 1024} KB of JavaScript.`,
);
process.exitCode = over.length ? 1 : 0;
