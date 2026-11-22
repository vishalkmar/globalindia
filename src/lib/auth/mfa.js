import "server-only";

import { cookies } from "next/headers";
import { after } from "next/server";

import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/brevo";
import { db } from "@/lib/db";
import { otpEmail } from "@/lib/email/templates";
import { HttpError, json } from "@/lib/http";
import { clientIp, hashIp } from "@/lib/security/ip";

import { COOKIE, setSessionCookies } from "./cookies";
import { verifyMfaTicket } from "./mfaPending";
import { notifyNewLogin } from "./notify";
import { issueOtp } from "./otp";
import { createSession } from "./session";

/**
 * Second-factor orchestration (Phase 5).
 */

export const MFA_TICKET_EXPIRED = "Your sign-in step expired. Please enter your email and password again.";

/** User behind the MFA-pending cookie, or HttpError 401. The ticket never grants admin access by itself. */
export async function userFromMfaTicket() {
  const store = await cookies();
  const ticket = await verifyMfaTicket(store.get(COOKIE.mfaPending)?.value);
  if (!ticket) throw new HttpError(401, MFA_TICKET_EXPIRED);
  const user = await db.adminUser.findUnique({ where: { id: ticket.userId } });
  if (!user || user.status !== "ACTIVE" || user.tokenVersion !== ticket.tv)
    throw new HttpError(401, MFA_TICKET_EXPIRED);
  if (user.lockedUntil && user.lockedUntil > new Date()) throw new HttpError(401, MFA_TICKET_EXPIRED);
  return user;
}

/** Where to go after sign-in: unfinished accounts go to setup first. */
export function nextPathFor(user) {
  return user.mustChangePassword || !user.mfaSetupAt ? "/admin/setup" : "/admin";
}

/** Both factors passed: create the session, set cookies, audit, alert. */
export async function completeLogin(user, req, method) {
  const ip = clientIp(req.headers);
  const ipHash = hashIp(ip);
  const { accessToken, refreshToken } = await createSession(user, {
    userAgent: req.headers.get("user-agent") ?? "",
    ipHash,
  });
  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ actorId: user.id, action: "auth.login.success", diff: { method }, ipHash });
  const headers = req.headers;
  after(() => notifyNewLogin(user.id, headers));
  return setSessionCookies(json({ ok: true, next: nextPathFor(user) }), { accessToken, refreshToken });
}

/** Email a sign-in code. Throws OtpError on cooldown/limit. */
export async function sendLoginOtp(user) {
  const { code } = await issueOtp(user.id, "LOGIN");
  const mail = otpEmail({ code, purpose: "LOGIN" });
  await sendEmail({ to: user.email, toName: user.name, ...mail, tags: ["otp-login"] });
}

/**
 * The fixed default super-admin email (Security.md §2.3). MFA changes for ANY account are approved
 * by a code sent here. Falls back to the oldest active SUPER_ADMIN.
 * @returns {Promise<{ email: string, userId: string|null }>}
 */
export async function defaultAdminContact() {
  const setting = await db.siteSetting.findUnique({ where: { key: "security" } });
  const email =
    typeof setting?.value?.defaultAdminEmail === "string"
      ? setting.value.defaultAdminEmail.toLowerCase()
      : "";
  if (email) {
    const owner = await db.adminUser.findUnique({ where: { email }, select: { id: true } });
    return { email, userId: owner?.id ?? null };
  }
  const first = await db.adminUser.findFirst({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!first) throw new Error("No default admin email configured");
  return { email: first.email, userId: first.id };
}

/** "a****@g****.in" — enough for the user to recognise the inbox, not enough to harvest it. */
export function maskEmail(email) {
  const [local, domain = ""] = String(email).split("@");
  const [host, ...rest] = domain.split(".");
  const m = (s) => (s.length <= 1 ? "*" : `${s[0]}${"*".repeat(Math.min(4, s.length - 1))}`);
  return `${m(local)}@${m(host)}${rest.length ? `.${rest.join(".")}` : ""}`;
}

const METHOD_LABEL = { totp: "Authenticator app", email: "Email code" };

/**
 * Start an MFA on/off change. The approval code goes to the DEFAULT admin email, not the requester,
 * so someone holding a stolen password (or session) cannot switch MFA off.
 * The OtpCode row belongs to the requesting user; meta records exactly what will change.
 */
export async function requestMfaChange({ actor, target, method, enable }) {
  const contact = await defaultAdminContact();
  const { code, otp } = await issueOtp(actor.id, "MFA_TOGGLE", { targetUserId: target.id, method, enable });
  const mail = otpEmail({
    code,
    purpose: "MFA_TOGGLE",
    context: {
      Change: `${enable ? "Turn ON" : "Turn OFF"} ${METHOD_LABEL[method]}`,
      Account: target.email,
      "Requested by": actor.email,
    },
  });
  await sendEmail({ to: contact.email, ...mail, tags: ["otp-mfa-toggle"] });
  await audit({
    actorId: actor.id,
    action: "mfa.change.requested",
    entity: "AdminUser",
    entityId: target.id,
    diff: { method, enable },
  });
  return { requestId: otp.id, sentTo: maskEmail(contact.email) };
}
