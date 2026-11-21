#!/usr/bin/env node
/** Visual QA for the public layout: home (desktop + mobile + drawer), mega menu open, 404. */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "screenshots";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
try {
  const desk = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const errors = [];
  desk.on("pageerror", (e) => errors.push(e.message));
  desk.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await desk.goto(`${base}/`, { waitUntil: "networkidle" });
  await desk.screenshot({ path: join(out, "p9-home-1280.png"), fullPage: true });
  await desk.getByRole("button", { name: "Products", exact: true }).click();
  await desk.getByTestId("mega-menu").waitFor();
  await desk.screenshot({ path: join(out, "p9-mega-1280.png") });
  await desk.keyboard.press("Escape");
  await desk.getByRole("button", { name: "About", exact: true }).hover();
  await desk.waitForTimeout(300);
  await desk.screenshot({ path: join(out, "p9-dropdown-1280.png") });
  await desk.goto(`${base}/this-page-does-not-exist`, { waitUntil: "networkidle" });
  await desk.screenshot({ path: join(out, "p9-404-1280.png"), fullPage: true });
  await desk.keyboard.press("Control+k");
  await desk.waitForTimeout(300);
  await desk.screenshot({ path: join(out, "p9-search-1280.png") });

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await mob.goto(`${base}/`, { waitUntil: "networkidle" });
  await mob.screenshot({ path: join(out, "p9-home-390.png"), fullPage: true });
  await mob.getByRole("button", { name: "Open menu" }).click();
  await mob.waitForTimeout(400);
  await mob.screenshot({ path: join(out, "p9-drawer-390.png") });
  console.log(errors.length ? `console errors: ${errors.join(" | ")}` : "no console errors");
} finally {
  await browser.close();
}
