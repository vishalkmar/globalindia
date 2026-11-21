/**
 * Database seed — idempotent. Run: npm run db:seed
 * Steps are added phase by phase:
 *   Phase 3: themes + business settings (skeleton)
 *   Phase 5: super admin from env
 *   Phase 8+: menus, pages, sections, categories, products, content
 */
import { PrismaClient } from "@prisma/client";

import { THEME_PRESETS } from "../src/lib/theme/presets.js";
import { seedAdmin } from "./seed-admin.js";
import { assertSeedAllowed, log, upsertSetting } from "./seed-utils.js";

const db = new PrismaClient();

async function seedThemes() {
  for (const [i, preset] of THEME_PRESETS.entries()) {
    await db.theme.upsert({
      where: { slug: preset.slug },
      update: {},
      create: { slug: preset.slug, name: preset.name, tokens: preset.tokens, isPreset: true, isActive: false },
    });
    if (i === 0) {
      const active = await db.theme.count({ where: { isActive: true } });
      if (active === 0) await db.theme.update({ where: { slug: preset.slug }, data: { isActive: true } });
    }
  }
  log("themes", THEME_PRESETS.map((p) => p.name).join(", "));
}

async function seedBusinessSettings() {
  // Source: globalindiachem.com (docs/Memory.md §2). Email intentionally empty until the owner adds it.
  await upsertSetting(db, "business", {
    name: "Global India",
    legalName: "Global INDIA",
    tagline: "Chemical raw materials supplier, Delhi",
    established: 2002,
    proprietor: "Akash Rathod",
    natureOfBusiness: "Manufacturer, Supplier and Trader",
    teamSize: 35,
    banker: "Kotak Mahindra Bank",
    gst: "07BMMPA5592C1Z4",
    address: {
      line1: "419, Khasra No-300, Ground Floor",
      line2: "Burari Road",
      city: "Delhi",
      pin: "110084",
      state: "Delhi",
      country: "India",
    },
    phones: [{ label: "Sales", number: "+91 80717 79152" }],
    emails: [],
    whatsapp: "",
    hours: "Monday to Saturday, 10:00 am to 7:00 pm",
    market: "All India; export enquiries accepted (FOB)",
    mapUrl: "",
  });
  await upsertSetting(db, "security", {
    defaultAdminEmail: process.env.SEED_ADMIN_EMAIL?.toLowerCase() ?? "",
  });
  log("settings", "business, security");
}

async function main() {
  assertSeedAllowed();
  console.log("Seeding Global India database...");
  await seedThemes();
  await seedBusinessSettings();
  await seedAdmin(db);
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
