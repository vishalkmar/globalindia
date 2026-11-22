import "server-only";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Site-wide redirects for the proxy (Phase 16 todo 03). The whole table is small, so each server
 * instance keeps it in memory and reloads it at most once a minute (admin changes show up within a
 * minute everywhere, immediately on the instance that saved them). A DB problem never blocks a page.
 */
const TTL = 60_000;
let cache = { map: new Map(), at: 0, loading: null };

async function load() {
  try {
    const rows = await db.redirect.findMany({ select: { fromPath: true, toPath: true, statusCode: true } });
    cache = {
      map: new Map(rows.map((r) => [r.fromPath, { to: r.toPath, status: r.statusCode === 302 ? 302 : 301 }])),
      at: Date.now(),
      loading: null,
    };
  } catch (err) {
    logger.warn("redirects.load_failed", { message: err.message });
    cache = { ...cache, at: Date.now(), loading: null };
  }
}

/** @returns {Promise<{ to: string, status: 301|302 } | null>} */
export async function lookupRedirect(pathname) {
  if (Date.now() - cache.at > TTL) {
    cache.loading ??= load();
    await cache.loading;
  }
  const key = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return cache.map.get(key) ?? null;
}

/** Call after an admin change so this instance serves the new table straight away. */
export function resetRedirectMap() {
  cache = { map: cache.map, at: 0, loading: null };
}

/** Count a hit without slowing the response (best effort). */
export function countRedirectHit(fromPath) {
  db.redirect.update({ where: { fromPath }, data: { hits: { increment: 1 } } }).catch(() => {});
}
