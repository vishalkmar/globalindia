import "server-only";

import { sendEmail } from "@/lib/brevo";
import { db } from "@/lib/db";
import { securityAlertEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import { deviceLabel } from "@/lib/security/ip";

/**
 * Security alert emails (Phase 5 todo 13, Phase 25 todo 13). Never throw — alerts are best effort.
 */

function when() {
  return (
    new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date()) + " IST"
  );
}

async function alert(userId, { title, message, details }) {
  const user = await db.adminUser.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (!user) return;
  const mail = securityAlertEmail({ title, message, details });
  await sendEmail({ to: user.email, toName: user.name, ...mail, tags: ["security-alert"] }).catch(
    () => false,
  );
}

export function notifyNewLogin(userId, headers) {
  return alert(userId, {
    title: "New sign-in to the admin panel",
    message: "Your account was just used to sign in.",
    details: { Device: deviceLabel(headers.get("user-agent") ?? ""), Time: when() },
  });
}

export function notifyRefreshReuse(userId, headers) {
  return alert(userId, {
    title: "Session ended for your safety",
    message:
      "An old sign-in token for your account was used again. This can mean the token was copied. We signed out that login on every device.",
    details: { Device: deviceLabel(headers.get("user-agent") ?? ""), Time: when() },
  });
}

export function notifySecurityChange(userId, headers, change) {
  return alert(userId, {
    title: change,
    message: `This change was made to your admin account: ${change}.`,
    details: { Device: deviceLabel(headers?.get?.("user-agent") ?? ""), Time: when() },
  });
}

const duration = (m) => (m >= 120 && m % 60 === 0 ? `${m / 60} hours` : `${m} minutes`);

export function notifyLockout(userId, minutes = 15) {
  return alert(userId, {
    title: "Sign-in paused after failed attempts",
    message: `There were 5 wrong password attempts on your account, so sign-in is paused for ${duration(minutes)}. Each new pause within a day is twice as long.`,
    details: { Time: when() },
  });
}

/** Phase 21 todo 18: this many permission denials by one admin within the window raises an alert. */
export const DENIAL_ALERT_AT = 10;
const DENIAL_WINDOW_MS = 15 * 60 * 1000;

/**
 * Call after an "authz.denied" audit row is written. When one admin reaches DENIAL_ALERT_AT denials in
 * 15 minutes (someone probing what they can reach, or a stolen session), every active super admin is
 * emailed once for that burst and a warning is logged. Never throws.
 */
export async function checkDenialBurst(actor) {
  try {
    const count = await db.auditLog.count({
      where: { actorId: actor.id, action: "authz.denied", at: { gte: new Date(Date.now() - DENIAL_WINDOW_MS) } },
    });
    if (count !== DENIAL_ALERT_AT) return false;
    logger.warn("security.authz_denial_burst", { actorId: actor.id, role: actor.role, count });
    const admins = await db.adminUser.findMany({ where: { role: "SUPER_ADMIN", status: "ACTIVE" }, select: { id: true } });
    await Promise.all(
      admins.map((a) =>
        alert(a.id, {
          title: "Repeated blocked actions in the admin panel",
          message: `${actor.name || actor.email} tried ${count} actions their role does not allow in the last 15 minutes. If this was not expected, check the audit log and consider disabling the account.`,
          details: { Account: actor.email, Role: actor.role, Time: when() },
        }),
      ),
    );
    return true;
  } catch {
    return false;
  }
}
