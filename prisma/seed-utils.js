/**
 * Seed helpers — idempotent upserts so `npm run db:seed` can run any number of times.
 */

/** URL-safe slug from a product or page name. */
export function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/%/g, " percent ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Refuse to seed production unless explicitly allowed (Architecture.md §5). */
export function assertSeedAllowed() {
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (isProd && process.env.ALLOW_PROD_SEED !== "true") {
    throw new Error(
      "Refusing to seed a production database. Set ALLOW_PROD_SEED=true for the one-time launch seed.",
    );
  }
}

export async function upsertSetting(db, key, value) {
  return db.siteSetting.upsert({ where: { key }, update: {}, create: { key, value } });
}

/** Upsert by unique slug. `create` is used only the first time; existing admin edits are kept. */
export async function upsertBySlug(model, slug, create, update = {}) {
  return model.upsert({ where: { slug }, update, create: { slug, ...create } });
}

export function log(step, detail = "") {
  console.log(`  - ${step}${detail ? `: ${detail}` : ""}`);
}
