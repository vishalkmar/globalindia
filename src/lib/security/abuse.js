import "server-only";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normaliseSetting, SETTING_DEFAULTS } from "@/lib/settings/schemas";

import { ipInRanges, parseRange } from "./ipMatch";

/**
 * Abuse controls from Settings -> "Rate limits and blocked IPs" (Phase 22 todos 13, 16).
 * Read straight from the database with a 60-second in-memory copy per server instance, so the proxy
 * does not query on every request. Saving the setting clears the copy on that instance at once.
 * If the database cannot be read, the safe defaults apply (limits on, nobody blocked).
 */

const TTL_MS = 60_000;
let cached = null; // { at, value, ranges }

export async function abuseSettings() {
  if (cached && Date.now() - cached.at < TTL_MS) return cached;
  let value = SETTING_DEFAULTS.abuse;
  try {
    const row = await db.siteSetting.findUnique({ where: { key: "abuse" } });
    value = normaliseSetting("abuse", row?.value);
  } catch (err) {
    logger.error("abuse.settings_failed", { err });
  }
  cached = { at: Date.now(), value, ranges: value.blockedIps.map(parseRange).filter(Boolean) };
  return cached;
}

/** Forget the copy (after the setting is saved, and in tests). */
export function resetAbuseSettings() {
  cached = null;
}

export async function isBlockedIp(ip) {
  const { ranges } = await abuseSettings();
  return ranges.length > 0 && ipInRanges(ip, ranges);
}
