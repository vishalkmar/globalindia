import "server-only";

import { cookies } from "next/headers";

import { authEnv, isProduction, isTest } from "@/lib/env";
import { HttpError } from "@/lib/http";

import { COOKIE } from "./cookies";
import { hmac, safeEqual } from "./crypto";

/**
 * Step-up authentication (Phase 25 todo 10). Sensitive actions (users, MFA of other accounts, theme
 * publish, security settings, cache purge, permanent delete, new recovery codes) need the password
 * confirmed in the last 10 minutes, even inside a valid session. Proof: an httpOnly, SameSite=Strict
 * cookie holding "<time>.<HMAC(session id, time)>", so it is useless in any other session.
 */

export const STEP_UP_TTL_SECONDS = 10 * 60;

const sign = (sessionId, at) => hmac(`stepup:${sessionId}:${at}`, authEnv.mfaPendingSecret);

export function stepUpCookie(sessionId, now = Date.now()) {
  const at = Math.floor(now / 1000);
  return {
    name: COOKIE.stepUp,
    value: `${at}.${sign(sessionId, at)}`,
    options: { httpOnly: true, secure: isProduction, sameSite: "strict", path: "/", maxAge: STEP_UP_TTL_SECONDS, priority: "high" },
  };
}

export function isFreshStepUp(value, sessionId, now = Date.now()) {
  const m = /^(\d{9,11})\.([A-Za-z0-9_-]{20,})$/.exec(value ?? "");
  if (!m || !sessionId) return false;
  const at = Number(m[1]);
  const age = Math.floor(now / 1000) - at;
  if (age < 0 || age > STEP_UP_TTL_SECONDS) return false;
  return safeEqual(m[2], sign(sessionId, at));
}

/** Throws 403 { code: "step_up" } unless the password was confirmed recently in this session. */
export async function requireStepUp(user) {
  if (isTest && globalThis.__giSkipStepUp) return; // unit tests call handlers directly; stepup tests turn it off
  const value = (await cookies()).get(COOKIE.stepUp)?.value;
  if (isFreshStepUp(value, user.sessionId)) return;
  throw new HttpError(403, "Confirm your password to continue.", { body: { code: "step_up" } });
}
