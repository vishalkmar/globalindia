#!/usr/bin/env node
/** Visual QA for Phases 14-15: contact, thank-you, FAQ, industries, insights, legal, downloads. */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "screenshots";
const PAGES = [
  ["contact", "/contact"],
  ["thanks", "/contact/thank-you?type=quote&ref=GI-ABC123"],
  ["faq", "/faq"],
  ["industries", "/industries"],
  ["industry", "/industries/detergents-home-care"],
  ["insights", "/insights"],
  ["post", "/insights/labsa-90-vs-labsa-96"],
  ["privacy", "/legal/privacy"],
  ["cookies", "/legal/cookies"],
  ["downloads", "/downloads"],
];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  for (const [w, h] of [
    [1280, 900],
    [390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
    for (const [name, path] of PAGES) {
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      await page.addStyleTag({ content: ".cv-auto{content-visibility:visible!important}" });
      await page
        .locator('[data-testid="cookie-consent"]')
        .evaluate((el) => el.remove())
        .catch(() => {});
      await page.screenshot({ path: join(out, `p15-${name}-${w}.png`), fullPage: true });
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
        errors.push(`${path} scrolls sideways at ${w}px`);
    }
    await page.close();
  }
  console.log(errors.length ? `problems:\n${[...new Set(errors)].join("\n")}` : "all pages OK");
} finally {
  await browser.close();
}
