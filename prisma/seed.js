/**
 * Database seed — idempotent. Run: npm run db:seed
 * Steps are added phase by phase:
 *   Phase 3: themes + business settings (skeleton)
 *   Phase 5: super admin from env
 *   Phase 8+: menus, pages, sections, categories, products, content
 */
import { PrismaClient } from "@prisma/client";

import { HOME_LAYOUT, SECTIONS } from "../src/lib/sections/registry.js";
import { MENU_DEFAULTS } from "../src/lib/settings/menus.js";
import { SETTING_DEFAULTS } from "../src/lib/settings/schemas.js";
import { THEME_PRESETS } from "../src/lib/theme/presets.js";
import { categorySchema, productSchema } from "../src/lib/validation/catalogue.js";
import { seedAdmin } from "./seed-admin.js";
import { seedCatalogue } from "./seed-catalogue.js";
import { seedContent } from "./seed-content.js";
import { LEGAL_PAGES } from "./seed-legal.js";
import { COMPANY_PAGES } from "./seed-pages.js";
import { seedRedirects } from "./seed-redirects.js";
import { assertSeedAllowed, log, upsertSetting } from "./seed-utils.js";

const db = new PrismaClient();

async function seedThemes() {
  for (const [i, preset] of THEME_PRESETS.entries()) {
    await db.theme.upsert({
      where: { slug: preset.slug },
      update: {},
      create: {
        slug: preset.slug,
        name: preset.name,
        tokens: preset.tokens,
        isPreset: true,
        isActive: false,
      },
    });
    if (i === 0) {
      const active = await db.theme.count({ where: { isActive: true } });
      if (active === 0) await db.theme.update({ where: { slug: preset.slug }, data: { isActive: true } });
    }
  }
  log("themes", THEME_PRESETS.map((p) => p.name).join(", "));
}

async function seedSettings() {
  // Real defaults from docs/Content.md and Memory.md. Existing admin edits are never overwritten.
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) await upsertSetting(db, key, value);
  await upsertSetting(db, "security", {
    defaultAdminEmail: process.env.SEED_ADMIN_EMAIL?.toLowerCase() ?? "",
  });
  log("settings", Object.keys(SETTING_DEFAULTS).join(", "));
}

async function seedMenus() {
  for (const [location, items] of Object.entries(MENU_DEFAULTS)) {
    if ((await db.menuItem.count({ where: { location } })) > 0) continue;
    for (const [i, item] of items.entries()) {
      const parent = await db.menuItem.create({
        data: { location, label: item.label, href: item.href, order: i },
      });
      for (const [j, c] of (item.children ?? []).entries()) {
        await db.menuItem.create({
          data: { location, parentId: parent.id, label: c.label, href: c.href, order: j },
        });
      }
    }
  }
  log("menus", Object.keys(MENU_DEFAULTS).join(", "));
}

async function seedHomePage() {
  const existing = await db.page.findUnique({ where: { slug: "home" } });
  if (existing) return log("pages", "home already exists, left unchanged");
  await db.page.create({
    data: {
      slug: "home",
      title: "Home",
      status: "PUBLISHED",
      publishedAt: new Date(),
      seo: { title: "", description: "" },
      sections: {
        create: HOME_LAYOUT.map((type, order) => ({
          type,
          order,
          data: SECTIONS[type].defaults,
          isVisible: true,
        })),
      },
    },
  });
  log("pages", `home with ${HOME_LAYOUT.length} sections`);
}

const ALL_PAGES = [...COMPANY_PAGES, ...LEGAL_PAGES.map((p) => ({ status: "PUBLISHED", ...p }))];

async function seedCompanyPages() {
  for (const page of ALL_PAGES) {
    if (await db.page.findUnique({ where: { slug: page.slug } })) continue;
    for (const sec of page.sections) {
      const r = SECTIONS[sec.type].schema.safeParse(sec.data);
      if (!r.success)
        throw new Error(
          `Seed copy for ${page.slug}/${sec.type} is invalid: ${r.error.issues[0].path.join(".")} ${r.error.issues[0].message}`,
        );
    }
    await db.page.create({
      data: {
        slug: page.slug,
        title: page.title,
        status: page.status,
        publishedAt: page.status === "PUBLISHED" ? new Date() : null,
        seo: page.seo,
        sections: {
          create: page.sections.map((sec, order) => ({
            type: sec.type,
            order,
            data: sec.data,
            isVisible: true,
          })),
        },
      },
    });
  }
  log("pages", ALL_PAGES.map((p) => `${p.slug}${p.status === "DRAFT" ? " (draft)" : ""}`).join(", "));
}

async function main() {
  assertSeedAllowed();
  console.log("Seeding Global India database...");
  await seedThemes();
  await seedSettings();
  await seedMenus();
  await seedHomePage();
  await seedCompanyPages();
  await seedCatalogue(db, { categorySchema, productSchema }, log);
  await seedAdmin(db);
  await seedContent(db, log);
  await seedRedirects(db, log);
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
