#!/usr/bin/env node
/** Visual QA for the catalogue (Phase 12): hub, family filter, category page, desktop + mobile. */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "screenshots";
const PAGES = [
  ["hub", "/products"],
  ["family", "/products?family=personal-care"],
  ["category", "/products/light-liquid-paraffin"],
];
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const errors = [];
try {
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    // Later phases: product detail 13, contact 14, industries/insights 15, legal 26.
    page.on("response", (r) => r.status() >= 400 && !/\/products\/[^/]+\/[^/?]+|\/legal\/|\/(contact|insights|industries)(\?|$)/.test(r.url()) && errors.push(`${r.status()} ${r.url()}`));
    for (const [name, path] of PAGES) {
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      await page.addStyleTag({ content: ".cv-auto{content-visibility:visible!important}" });
      await page.locator('[data-testid="cookie-consent"]').evaluate((el) => el.remove()).catch(() => {});
      await page.screenshot({ path: join(out, `p12-${name}-${w}.png`), fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) errors.push(`${path} scrolls sideways at ${w}px`);
    }
    await page.close();
  }
  console.log(errors.length ? `problems:\n${errors.join("\n")}` : "catalogue pages OK, no console errors, no sideways scroll");
} finally {
  await browser.close();
}
