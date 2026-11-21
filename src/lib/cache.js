import "server-only";

import { cacheLife, cacheTag, revalidateTag } from "next/cache";

import { logger } from "@/lib/logger";

/**
 * Cache tags for everything the public site reads (Architecture.md §9).
 * Admin saves call invalidate(...) so the next visitor gets fresh data — no redeploy needed.
 */
export const TAGS = {
  settings: "settings",
  setting: (key) => `setting:${key}`,
  theme: "theme",
  menu: "menu",
  menuAt: (location) => `menu:${location}`,
  media: "media",
  mediaItem: (id) => `media:${id}`,
};

/** Tag the current 'use cache' scope. Outside Next (unit tests) this is a no-op. */
export function tag(...tags) {
  try {
    cacheTag(...tags);
    cacheLife("max");
  } catch {
    /* not inside a cache scope (tests) */
  }
}

/** Expire tags immediately (`expire: 0`): the next request rebuilds instead of serving stale data. */
export function invalidate(...tags) {
  for (const t of tags) {
    try {
      revalidateTag(t, { expire: 0 });
    } catch (err) {
      if (process.env.NODE_ENV !== "test") logger.warn("cache.invalidate_failed", { tag: t, err });
    }
  }
}
