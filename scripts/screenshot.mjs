#!/usr/bin/env node
/**
 * Visual QA helper: full-page screenshots of a URL at several widths.
 * Usage: node scripts/screenshot.mjs <url> <outDir> [widths=1280,390]
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const [url, outDir = "screenshots", widthArg = "1280,390"] = process.argv.slice(2);
if (!url) {
  console.error("Usage: node scripts/screenshot.mjs <url> <outDir> [widths]");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  for (const width of widthArg.split(",").map(Number)) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(url, { waitUntil: "networkidle" });
    const file = join(outDir, `${new URL(url).pathname.replace(/\W+/g, "_") || "home"}-${width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`${file}${errors.length ? `  console errors: ${errors.join(" | ")}` : ""}`);
    await page.close();
  }
} finally {
  await browser.close();
}
