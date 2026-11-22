import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { ARGON2_OPTIONS } from "../../src/lib/auth/argon-params.js";
import { signInWithOtp, waitForMail } from "./helpers.mjs";

/** Phase 15: industries, insights, FAQ, legal pages, downloads, newsletter, admin FAQ and articles. */

const db = new PrismaClient();
const stamp = Date.now().toString(36);
const editor = { email: `e2e-content-${stamp}@test.local`, password: `Content-Editor-${stamp}` };
let savedFaqs = [];

test.beforeAll(async () => {
  savedFaqs = await db.faq.findMany({ orderBy: { order: "asc" } });
  await db.adminUser.create({
    data: {
      email: editor.email,
      name: `Writer ${stamp}`,
      role: "EDITOR",
      passwordHash: await hash(editor.password, ARGON2_OPTIONS),
      mfaSetupAt: new Date(),
    },
  });
});
test.afterAll(async () => {
  await db.faq.deleteMany({});
  if (savedFaqs.length) await db.faq.createMany({ data: savedFaqs });
  await db.post.deleteMany({ where: { slug: { contains: stamp } } });
  await db.newsletterSubscriber.deleteMany({ where: { email: { contains: stamp } } });
  await db.$disconnect();
});

test("industries link to products and products link back", async ({ page }) => {
  await page.goto("/industries");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Raw materials for the way your industry works/,
  );
  await page.getByRole("link", { name: /Detergents & Home Care/ }).click();
  await expect(page).toHaveURL(/\/industries\/detergents-home-care$/);
  await expect(
    page.getByRole("heading", { name: /What detergents & home care buyers ask us for/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "SLES 70%" }).click();
  await expect(page).toHaveURL(/\/products\/anionic-surfactants\/sles-70$/);
  await expect(
    page.getByRole("list", { name: "Industries" }).getByRole("link", { name: "Detergents & Home Care" }),
  ).toHaveAttribute("href", "/industries/detergents-home-care");
});

test("insights: topics, article with table of contents and article data", async ({ page }) => {
  await page.goto("/insights");
  await expect(page.getByRole("link", { name: /How to read a COA/ })).toBeVisible();
  await page.getByRole("group", { name: "Topics" }).getByRole("link", { name: "Quality" }).click();
  await expect(page).toHaveURL(/category=Quality/);
  await expect(page.getByRole("link", { name: /LABSA 90 or LABSA 96/ })).toHaveCount(0);
  await page.getByRole("link", { name: /How to read a COA/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "How to read a COA before you accept a delivery",
  );
  const toc = page.getByRole("navigation", { name: /In this article/ }).first();
  await toc.getByRole("link", { name: /Is it the grade you ordered/ }).click();
  await expect(page).toHaveURL(/#s-2-is-it-the-grade-you-ordered$/);
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents())
    .map((t) => JSON.parse(t))
    .find((d) => d["@type"] === "Article");
  expect(ld.headline).toBe("How to read a COA before you accept a delivery");
  await expect(page.getByText("By the Global India sales desk")).toBeVisible();
});

test("FAQ, legal pages and downloads", async ({ page, request }) => {
  await page.goto("/faq");
  await page.getByText("What is the minimum order?").click();
  await expect(page.getByText(/For most products 50 kg/)).toBeVisible();
  for (const [path, h1] of [
    ["/legal/privacy", "Privacy policy"],
    ["/legal/terms", "Terms of use"],
    ["/legal/cookies", "Cookie policy"],
    ["/legal/shipping", "Shipping, dispatch and returns"],
    ["/legal/disclaimer", "Specification disclaimer"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
  }
  expect((await request.get("/legal-privacy")).status()).toBe(404);
  await page.goto("/downloads");
  await expect(page.getByRole("link", { name: "Ask for the product list" })).toBeVisible();
});

test("newsletter: double opt-in from the footer", async ({ page }) => {
  const email = `news-${stamp}@example.in`;
  await page.goto("/about");
  const form = page.getByRole("form", { name: "Newsletter" });
  await form.getByLabel(/Monthly price and stock notes/).fill(email);
  const since = Date.now() - 1000;
  await form.getByRole("button", { name: "Subscribe" }).click();
  await expect(form.getByText("Check your inbox and click the link to confirm.")).toBeVisible();
  const html = await waitForMail({ to: email, tag: "newsletter-confirm", since });
  const token = html.match(/\/newsletter\/confirm#t=([A-Za-z0-9_-]+)/)[1];
  // Opening the link only shows a button; the token leaves the address bar at once.
  await page.goto(`/newsletter/confirm#t=${token}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Confirm your subscription");
  await expect(page).toHaveURL(/\/newsletter\/confirm$/);
  await page.getByRole("button", { name: "Confirm subscription" }).click();
  await expect(page).toHaveURL(/\/newsletter\/confirmed\?status=ok$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You are subscribed.");
  // An old-style link redirects to the same page; the used token is refused.
  await page.goto(`/api/public/newsletter/confirm?token=${token}`);
  await page.getByRole("button", { name: "Confirm subscription" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/expired or was already used/);
});

test("admin: FAQ edits reach the FAQ page; a new article is published", async ({ page }) => {
  test.setTimeout(150_000);
  await signInWithOtp(page, editor.email, editor.password);
  await page.goto("/admin/faqs");
  await page.getByRole("button", { name: "Add question" }).click();
  const last = (await page.getByLabel("Question", { exact: true }).count()) - 1;
  await page.getByLabel("Question", { exact: true }).nth(last).fill(`Do you deliver on Sundays (${stamp})?`);
  await page.getByLabel("Answer", { exact: true }).nth(last).fill("No. Dispatch runs Monday to Saturday.");
  await page.getByLabel("Topic", { exact: true }).nth(last).selectOption("Delivery");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("FAQ saved.")).toBeVisible();
  await page.goto("/faq");
  await expect(page.getByText(`Do you deliver on Sundays (${stamp})?`)).toBeVisible();

  await page.goto("/admin/insights/new");
  await page.getByRole("textbox", { name: /^Title/ }).fill(`Soda ash light vs dense ${stamp}`);
  await page
    .getByLabel("Summary", { exact: true })
    .fill("When light soda ash is enough and when dense pays for itself.");
  await page.getByLabel("Status", { exact: true }).selectOption("PUBLISHED");
  const editorBox = page.locator(".ProseMirror").first();
  await editorBox.click();
  await page.keyboard.type(
    "Light soda ash is the usual choice for detergent powder because it blends evenly and dissolves fast in the slurry.",
  );
  await page.getByRole("button", { name: "Create article" }).click();
  await expect(page.getByText("Article created.")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: `Soda ash light vs dense ${stamp}` }),
  ).toBeVisible();
  await page.goto(`/insights/soda-ash-light-vs-dense-${stamp}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Soda ash light vs dense ${stamp}`);
});
