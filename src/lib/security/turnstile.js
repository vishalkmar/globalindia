import "server-only";

import { isProduction, optionalEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Cloudflare Turnstile check for public forms (Phase 14 todo 07).
 * - With TURNSTILE_SECRET set, the token must verify (single use, checked server side, 5 s timeout).
 * - Without the secret: allowed outside production so local work and tests run; in production the
 *   form is refused (fail closed) and an error is logged, so a missing key is noticed before launch.
 * @returns {Promise<{ ok: boolean, skipped?: boolean }>}
 */
export async function verifyTurnstile(token, ip) {
  const secret = optionalEnv("TURNSTILE_SECRET");
  if (!secret) {
    if (isProduction) {
      logger.error("turnstile.not_configured");
      return { ok: false };
    }
    return { ok: true, skipped: true };
  }
  if (!token || typeof token !== "string" || token.length > 2048) return { ok: false };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return { ok: data.success === true };
  } catch (err) {
    logger.warn("turnstile.verify_failed", { message: err.message });
    return { ok: false };
  }
}

/** Public site key for the widget ("" when not configured). */
export function turnstileSiteKey() {
  return optionalEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
}
