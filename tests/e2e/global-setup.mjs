import { Prisma, PrismaClient } from "@prisma/client";

import { HOME_LAYOUT, SECTIONS } from "../../src/lib/sections/registry.js";

/**
 * Runs once before the E2E suite (local database only, see playwright.config.mjs).
 * A run that is stopped half-way skips its own clean-up, which then breaks the next run. Put back the
 * state the specs start from:
 * - maintenance mode off (otherwise every public page shows the maintenance notice);
 * - the home page exactly as seeded: published sections from the defaults, no draft
 *   (home.spec edits the hero and hides the FAQ, then restores them at the end).
 */
export default async function globalSetup() {
  const db = new PrismaClient();
  try {
    const row = await db.siteSetting.findUnique({ where: { key: "maintenance" } });
    if (row?.value?.enabled) {
      await db.siteSetting.update({ where: { key: "maintenance" }, data: { value: { ...row.value, enabled: false } } });
    }

    const home = await db.page.findUnique({ where: { slug: "home" } });
    if (home) {
      await db.$transaction([
        db.section.deleteMany({ where: { pageId: home.id } }),
        db.page.update({
          where: { id: home.id },
          data: {
            title: "Home",
            status: "PUBLISHED",
            draftData: Prisma.DbNull,
            draftAt: null,
            draftById: null,
            sections: {
              create: HOME_LAYOUT.map((type, order) => ({ type, order, data: SECTIONS[type].defaults, isVisible: true })),
            },
          },
        }),
      ]);
    }
  } finally {
    await db.$disconnect();
  }
}
