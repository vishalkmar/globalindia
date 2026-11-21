import "server-only";

import { after } from "next/server";

import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

import { notifyLockout } from "./notify";
import { hashPassword, needsRehash, verifyPassword } from "./password";

/**
 * Password step of the admin login (Phase 4 todo 08, 15, 16).
 * Returns the user only when the password is right AND the account may sign in.
 * Every failure path takes the same time (argon2 always runs) and the caller shows one generic message.
 */

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
export const GENERIC_LOGIN_ERROR = "Invalid email or password.";

/**
 * @returns {Promise<{ ok: true, user: object } | { ok: false, locked?: boolean }>}
 */
export async function checkPassword(email, password, { ipHash = "" } = {}) {
  const user = await db.adminUser.findUnique({ where: { email } });
  const now = new Date();
  const locked = Boolean(user?.lockedUntil && user.lockedUntil > now);

  // Always verify (against a dummy hash if the user is missing) to keep timing flat.
  const valid = await verifyPassword(user?.passwordHash ?? null, password);

  if (!user) {
    await audit({ action: "auth.login.failed", diff: { reason: "unknown_email" }, ipHash });
    return { ok: false };
  }

  if (locked) {
    await audit({ actorId: user.id, action: "auth.login.blocked_locked", ipHash });
    return { ok: false, locked: true };
  }

  if (!valid || user.status !== "ACTIVE") {
    const failed = user.failedLogins + 1;
    const lockNow = failed >= MAX_FAILED_LOGINS;
    await db.adminUser.update({
      where: { id: user.id },
      data: lockNow
        ? { failedLogins: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) }
        : { failedLogins: failed },
    });
    await audit({
      actorId: user.id,
      action: lockNow ? "auth.login.locked" : "auth.login.failed",
      diff: { reason: user.status !== "ACTIVE" ? "inactive" : "bad_password", attempt: failed },
      ipHash,
    });
    // Sent after the response so the 5th attempt is not slower (no account discovery by timing).
    if (lockNow) after(() => notifyLockout(user.id));
    return { ok: false, locked: lockNow };
  }

  const data = { failedLogins: 0, lockedUntil: null };
  if (needsRehash(user.passwordHash)) data.passwordHash = await hashPassword(password);
  const updated = await db.adminUser.update({ where: { id: user.id }, data });
  await audit({ actorId: user.id, action: "auth.login.password_ok", ipHash });
  return { ok: true, user: updated };
}

/** Second-factor methods available to this user. At least one is always returned. */
export async function availableMethods(user) {
  const methods = [];
  if (user.totpEnabled) methods.push("totp");
  if (user.emailOtpEnabled || !user.totpEnabled) methods.push("email");
  const codes = await db.recoveryCode.count({ where: { userId: user.id, usedAt: null } });
  if (codes > 0) methods.push("recovery");
  return methods;
}
