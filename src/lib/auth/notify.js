import "server-only";

import { sendEmail } from "@/lib/brevo";
import { db } from "@/lib/db";
import { securityAlertEmail } from "@/lib/email/templates";
import { deviceLabel } from "@/lib/security/ip";

/**
 * Security alert emails (Phase 5 todo 13, Phase 25 todo 13). Never throw — alerts are best effort.
 */

function when() {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date()) + " IST";
}

async function alert(userId, { title, message, details }) {
  const user = await db.adminUser.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (!user) return;
  const mail = securityAlertEmail({ title, message, details });
  await sendEmail({ to: user.email, toName: user.name, ...mail, tags: ["security-alert"] }).catch(() => false);
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

export function notifyLockout(userId) {
  return alert(userId, {
    title: "Sign-in paused after failed attempts",
    message: "There were 5 wrong password attempts on your account, so sign-in is paused for 15 minutes.",
    details: { Time: when() },
  });
}
