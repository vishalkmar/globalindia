import "server-only";

import { tag, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normaliseSetting, SETTING_DEFAULTS } from "@/lib/settings/schemas";
import { DEFAULT_THEME } from "@/lib/theme/presets";

/**
 * Cached reads for the public site. Each function is a 'use cache' scope tagged so that an admin save
 * expires exactly what changed. If the database is unreachable, safe defaults are returned
 * (the site keeps rendering with the default theme and business details).
 */

export async function getSetting(key) {
  "use cache";
  tag(TAGS.settings, TAGS.setting(key));
  try {
    const row = await db.siteSetting.findUnique({ where: { key } });
    return normaliseSetting(key, row?.value);
  } catch (err) {
    logger.error("site_data.setting_failed", { key, err });
    return SETTING_DEFAULTS[key];
  }
}

/** Active theme: { id, name, mode, tokens }. */
export async function getActiveTheme() {
  "use cache";
  tag(TAGS.theme);
  try {
    const t = await db.theme.findFirst({ where: { isActive: true }, select: { id: true, name: true, mode: true, tokens: true } });
    if (t) return t;
  } catch (err) {
    logger.error("site_data.theme_failed", { err });
  }
  return { id: null, name: DEFAULT_THEME.name, mode: "LIGHT", tokens: DEFAULT_THEME.tokens };
}

/** Visible menu items for a location as a 2-level tree. */
export async function getMenu(location) {
  "use cache";
  tag(TAGS.menu, TAGS.menuAt(location));
  try {
    const items = await db.menuItem.findMany({
      where: { location, isVisible: true },
      orderBy: [{ order: "asc" }],
      select: { id: true, parentId: true, label: true, href: true, newTab: true, meta: true },
    });
    const top = items.filter((i) => !i.parentId);
    return top.map((t) => ({ ...t, children: items.filter((c) => c.parentId === t.id) }));
  } catch (err) {
    logger.error("site_data.menu_failed", { location, err });
    return [];
  }
}

/** One media asset for rendering (url, alt, size, focal point), or null. */
export async function getMedia(id) {
  "use cache";
  tag(TAGS.media, TAGS.mediaItem(id ?? "none"));
  if (!id) return null;
  try {
    return await db.mediaAsset.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, url: true, alt: true, width: true, height: true, focalX: true, focalY: true, type: true, format: true },
    });
  } catch {
    return null;
  }
}
