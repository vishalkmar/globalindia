#!/usr/bin/env node
/** Visual QA for the company pages (Phase 11): desktop + mobile full-page shots, console errors, careers 404. */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "screenshots";
const PAGES = ["about", "why-us", "quality", "gallery"];
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
    // Prefetches of pages that later phases build (catalogue Phase 12, legal pages Phase 26) are expected 404s for now.
    page.on(
      "response",
      (r) =>
        r.status() >= 400 &&
        !/\/(legal|products)\//.test(r.url()) &&
        !r.url().endsWith("/careers") &&
        errors.push(`${r.status()} ${r.url()}`),
    );
    page.on(
      "console",
      (m) => m.type() === "error" && !m.text().includes("404") && errors.push(`${page.url()}: ${m.text()}`),
    );
    for (const slug of PAGES) {
      const res = await page.goto(`${base}/${slug}`, { waitUntil: "networkidle" });
      if (res.status() !== 200) errors.push(`/${slug} returned ${res.status()}`);
      // Sections below the fold use content-visibility:auto, which a full-page capture would leave unpainted.
      await page.addStyleTag({ content: ".cv-auto{content-visibility:visible!important}" });
      await page
        .locator('[data-testid="cookie-consent"]')
        .evaluate((el) => el.remove())
        .catch(() => {});
      await page.screenshot({ path: join(out, `p11-${slug}-${w}.png`), fullPage: true });
    }
    const careers = await page.goto(`${base}/careers`, { waitUntil: "networkidle" });
    if (careers.status() !== 404) errors.push(`/careers (draft) returned ${careers.status()}, expected 404`);
    await page.close();
  }
  console.log(
    errors.length ? `problems:\n${errors.join("\n")}` : "all pages 200, careers 404, no console errors",
  );
} finally {
  await browser.close();
}
