import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { signInWithOtp } from "./helpers.mjs";

/** Phase 14: add to quote, the four public forms, thank-you page, admin inbox, enquiry detail, bell. */

const db = new PrismaClient();
const stamp = Date.now().toString(36);
const SHOTS = process.env.SHOT_DIR;
const editor = { email: `e2e-enq-editor-${stamp}@test.local`, password: `Enquiry-Editor-${stamp}` };

test.beforeAll(async () => {
  await db.adminUser.create({
    data: {
      email: editor.email,
      name: `Sales ${stamp}`,
      role: "EDITOR",
      passwordHash: await hash(editor.password, ARGON2_OPTIONS),
      mfaSetupAt: new Date(),
    },
  });
});
test.afterAll(async () => {
  await db.enquiry.deleteMany({ where: { email: { contains: stamp } } });
  await db.$disconnect();
});

test("add two products to a quote, then send the three-step quote form", async ({ page }) => {
  await page.goto("/products/anionic-surfactants/sles-70");
  await page.getByRole("button", { name: /Add to quote/ }).click();
  await expect(page.getByRole("link", { name: /In your quote \(1\)/ })).toBeVisible();
  await page.goto("/products/labsa/labsa-96");
  await page.getByRole("button", { name: /Add to quote/ }).click();
  await expect(page.getByRole("link", { name: /In your quote \(2\)/ })).toBeVisible();
  await page.getByRole("link", { name: /In your quote \(2\)/ }).click();

  await expect(page).toHaveURL(/\/contact#quote$/);
  const form = page.getByRole("form", { name: "Request a quote" });
  await expect(form.getByTestId("quote-item")).toHaveCount(2);
  // Step 1 refuses to continue without quantities
  await form.getByRole("button", { name: /Next: Delivery/ }).click();
  await expect(form.getByText("Enter the quantity, e.g. 500 kg.").first()).toBeVisible();
  const items = form.getByTestId("quote-item");
  await items.nth(0).getByLabel("Quantity").fill("2 drums");
  await items.nth(0).getByLabel("Pack size").selectOption("220 kg drum");
  await items.nth(1).getByLabel("Quantity").fill("500 kg");
  await form.getByRole("button", { name: /Next: Delivery/ }).click();
  await expect(form.getByRole("heading", { name: "Step 2 of 3: Delivery" })).toBeFocused();
  await form.getByLabel("Delivery city").fill("Panipat");
  await form.getByLabel(/Anything else/).fill("Please send the COA with the quote.");
  await form.getByRole("button", { name: /Next: Your details/ }).click();
  await form.getByLabel("Your name").fill(`Rakesh ${stamp}`);
  await form.getByLabel("Company").fill("Gupta Detergents");
  await form.getByLabel("Email").fill(`rakesh-${stamp}@example.in`);
  await form.getByLabel("Phone").fill("98100 12345");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p14-quote-step3-1280.png`, fullPage: true });
  await form.getByRole("button", { name: "Send quote request" }).click();

  await expect(page).toHaveURL(/\/contact\/thank-you\?type=quote&ref=GI-[A-Z0-9]{6}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thank you. We have your quote request.");
  const e = await db.enquiry.findFirst({ where: { email: `rakesh-${stamp}@example.in` } });
  expect(e).toMatchObject({ type: "QUOTE", status: "NEW", city: "Panipat" });
  expect(e.productNames.sort()).toEqual(["LABSA 96%", "SLES 70%"]);
  expect(e.quantity).toContain("2 drums");
  // the basket is emptied after sending
  await page.goto("/products/anionic-surfactants/sles-70");
  await expect(page.getByRole("button", { name: /^Add to quote$/ })).toBeVisible();
});

test("sample, callback and message forms; a document request link fills the message", async ({ page }) => {
  await page.goto("/contact?product=sles-70&doc=COA#contact");
  const contact = page.getByRole("form", { name: "Send a message" });
  await expect(contact.getByLabel("Message")).toHaveValue(
    "Please send the COA (certificate of analysis) for SLES 70%.",
  );
  await contact.getByLabel("Your name").fill(`Message ${stamp}`);
  await contact.getByLabel("Email").fill(`msg-${stamp}@example.in`);
  await contact.getByRole("button", { name: "Send message" }).click();
  await expect(page).toHaveURL(/thank-you\?type=contact/);

  await page.goto("/contact?product=xanthan-gum#sample");
  const sample = page.getByRole("form", { name: "Ask for a sample" });
  await expect(sample.getByLabel("Product")).toHaveValue("xanthan-gum");
  await sample.getByLabel(/What will you test it for/).fill("Trial batch of tomato ketchup, 50 kg.");
  await sample.getByLabel("Your name").fill(`Sample ${stamp}`);
  await sample.getByLabel("Email").fill(`sample-${stamp}@example.in`);
  await sample.getByLabel("Phone").fill("98100 12345");
  await sample.getByLabel("Delivery city").fill("Sonipat");
  await sample.getByRole("button", { name: "Ask for a sample" }).click();
  await expect(page).toHaveURL(/thank-you\?type=sample/);

  await page.goto("/contact#callback");
  const callback = page.getByRole("form", { name: "Request a callback" });
  await callback.getByRole("button", { name: "Call me back" }).click();
  await expect(callback.getByText("Enter the number we should call.")).toBeVisible();
  await callback.getByLabel("Your name").fill(`Callback ${stamp}`);
  await callback.getByLabel("Phone").fill("+91 98100 54321");
  await callback.getByRole("button", { name: "Call me back" }).click();
  await expect(page).toHaveURL(/thank-you\?type=callback/);

  const types = (
    await db.enquiry.findMany({ where: { name: { contains: stamp } }, select: { type: true } })
  ).map((r) => r.type);
  expect(types).toEqual(expect.arrayContaining(["CONTACT", "SAMPLE", "CALLBACK"]));
});

test("tabs follow the keyboard and the URL hash", async ({ page }) => {
  await page.goto("/contact");
  const tabs = page.getByRole("tablist", { name: "Type of enquiry" });
  await tabs.getByRole("tab", { name: "Request a quote" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "Ask for a sample" })).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/#sample$/);
});

test("admin: bell shows new enquiries, inbox filters, detail changes status and keeps a timeline", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await db.enquiry.create({
    data: { type: "CALLBACK", name: `Bell ${stamp}`, phone: "9810012345", email: `bell-${stamp}@example.in` },
  });
  await signInWithOtp(page, editor.email, editor.password);
  const bell = page.getByTestId("enquiry-bell");
  await expect(bell).toHaveAccessibleName(/\d+ new enquir/);
  await bell.click();
  await page.getByRole("link", { name: "Open the inbox" }).click();
  await expect(page.getByRole("heading", { name: "Enquiries", level: 1 })).toBeVisible();
  await page.getByLabel(/Search name, company/).fill(`Bell ${stamp}`);
  await expect(page.getByRole("row")).toHaveCount(2);
  await page
    .getByRole("row", { name: new RegExp(`Bell ${stamp}`) })
    .getByRole("link")
    .click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Callback from Bell ${stamp}`);
  await page.getByLabel("Status", { exact: true }).selectOption("IN_PROGRESS");
  await expect(page.getByText("Status updated.")).toBeVisible();
  await page.getByLabel("Assigned to").selectOption({ label: `Sales ${stamp}` });
  await expect(page.getByText("Assignment saved.")).toBeVisible();
  await page.getByLabel("Add an internal note").fill("Called back, wants price for 10 drums.");
  await page.getByRole("button", { name: "Add note" }).click();
  const timeline = page.getByTestId("timeline");
  await expect(timeline).toContainText("status New → In progress");
  await expect(timeline).toContainText(`assigned to Sales ${stamp}`);
  await expect(timeline).toContainText("Called back, wants price for 10 drums.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p14-admin-enquiry-1280.png`, fullPage: true });

  const csv = await page.request.get(`/api/admin/enquiries/export?q=${encodeURIComponent(`Bell ${stamp}`)}`);
  expect(await csv.text()).toContain(`Bell ${stamp}`);
});
