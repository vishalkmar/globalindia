import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { codeFrom, png, waitForMail } from "./helpers.mjs";

/** Phase 7: media library in a real browser (dev storage driver). */

const db = new PrismaClient();
const stamp = Date.now();
const email = `e2e-media-${stamp}@test.local`;
const PASSWORD = `Media-Test-${stamp}`;
const SHOTS = process.env.SHOT_DIR;

test.beforeAll(async () => {
  await db.adminUser.create({
    data: { email, name: "Media Editor", role: "EDITOR", passwordHash: await hash(PASSWORD, ARGON2_OPTIONS), mfaSetupAt: new Date() },
  });
});
test.afterAll(async () => {
  await db.mediaAsset.updateMany({ where: { uploadedBy: { email } }, data: { deletedAt: new Date() } });
  await db.$disconnect();
});

async function signIn(page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  const since = Date.now() - 1000;
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/admin\/verify/);
  await page.getByLabel("6-digit code").fill(codeFrom(await waitForMail({ to: email, tag: "otp-login", since })));
  await page.waitForURL((u) => u.pathname === "/admin");
}

test("upload by picker and drag-drop, add alt text and focal point, link guard", async ({ page }) => {
  await signIn(page);
  await page.getByRole("navigation", { name: "Admin" }).first().getByRole("link", { name: "Media" }).click();
  await expect(page.getByRole("heading", { name: "Media", level: 1 })).toBeVisible();

  // 1. File picker
  await page.getByTestId("media-file-input").setInputFiles({ name: "warehouse-drums.png", mimeType: "image/png", buffer: png(1600, 900) });
  await expect(page.getByText(/1 file uploaded/)).toBeVisible();
  const drawer = page.getByRole("dialog", { name: "File details" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Alt text needed")).toBeVisible();
  await drawer.getByLabel("Alt text").fill("Blue 200 L drums stacked in the Burari Road warehouse");
  await drawer.getByRole("slider", { name: /Focal point/ }).click({ position: { x: 60, y: 40 } });
  await drawer.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("File details saved.")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/media-detail-1280.png` });
  await drawer.getByRole("button", { name: "Close" }).click();

  // 2. Drag and drop (a real drop event with a File inside a DataTransfer)
  const zone = page.getByTestId("media-dropzone");
  const bytes = [...png(800, 800, [185, 133, 47])];
  const dt = await page.evaluateHandle((data) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(data)], "soap-noodles.png", { type: "image/png" }));
    return transfer;
  }, bytes);
  await zone.dispatchEvent("dragenter", { dataTransfer: dt });
  await zone.dispatchEvent("drop", { dataTransfer: dt });
  await expect(page.getByText(/1 file uploaded/).last()).toBeVisible();
  await page.getByRole("dialog", { name: "File details" }).getByRole("button", { name: "Close" }).click();

  // 3. A fake "image" that is really SVG is refused
  await page.getByTestId("media-file-input").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>') });
  await expect(page.getByText(/SVG, HTML and XML files are not accepted/)).toBeVisible();

  // 4. Link upload to an internal address is refused by the server
  await page.getByRole("tab", { name: "From a link" }).click();
  await page.getByLabel("Link to an image or PDF").fill("https://169.254.169.254/latest/meta-data/");
  await page.getByRole("button", { name: "Fetch and upload" }).click();
  await expect(page.getByText("That address is not allowed.")).toBeVisible();

  // Library shows both uploads; the second still needs alt text
  await expect(page.getByRole("list", { name: "Files" }).getByText("warehouse-drums.png")).toBeVisible();
  await page.getByLabel("Missing alt text").check();
  await expect(page.getByRole("list", { name: "Files" }).getByText("soap-noodles.png")).toBeVisible();
  await expect(page.getByRole("list", { name: "Files" }).getByText("warehouse-drums.png")).toHaveCount(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/media-library-1280.png`, fullPage: true });
});
