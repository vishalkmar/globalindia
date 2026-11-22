import "server-only";

import { createHash } from "node:crypto";

import { isTest } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Breached-password check (Phase 25 todo 02) with the Have I Been Pwned range API (k-anonymity):
 * only the first 5 characters of the SHA-1 hash leave the server; the reply lists every known hash
 * suffix with that prefix, compared here. "Add-Padding" hides the real answer size.
 * If the service is slow or down, the check is skipped (logged) so nobody is locked out of a password
 * change; length and the other rules still apply.
 */

const COMMON = new Set([
  "password1234",
  "123456789012",
  "qwertyuiop12",
  "globalindia123",
  "global-india-123",
  "admin12345678",
  "welcome12345",
]);

/** @returns {Promise<boolean>} true when the password is known to be breached */
export async function isBreachedPassword(password) {
  if (COMMON.has(password.toLowerCase())) return true;
  if (isTest && !globalThis.__giPwnedFetch) return false; // tests opt in with a fake fetch
  const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const doFetch = globalThis.__giPwnedFetch ?? fetch;
    const res = await doFetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "user-agent": "global-india-admin" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = await res.text();
    for (const line of body.split("\n")) {
      const [hashSuffix, count] = line.trim().split(":");
      if (hashSuffix === suffix && Number(count) > 0) return true;
    }
    return false;
  } catch (err) {
    logger.warn("password.breach_check_skipped", { message: err.message });
    return false;
  }
}

export const BREACHED_MESSAGE =
  "This password has appeared in a known data breach. Choose a different one.";
