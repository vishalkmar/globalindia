import "server-only";

import { after } from "next/server";

import { hmac, randomToken } from "@/lib/auth/crypto";
import { addContactToList, sendEmail } from "@/lib/brevo";
import { db } from "@/lib/db";
import { newsletterConfirmEmail } from "@/lib/email/templates";
import { authEnv, siteUrl } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { logger } from "@/lib/logger";
import { hashIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";
import { verifyTurnstile } from "@/lib/security/turnstile";

const TOKEN_DAYS = 7;
const tokenHash = (token) => hmac(`newsletter:${token}`, authEnv.otpPepper);

/**
 * Newsletter signup with double opt-in (Phase 15 todo 17). The answer is always the same ("check your
 * inbox"), so the form never reveals whether an address is already subscribed. Nothing reaches the
 * Brevo list until the emailed link is opened.
 */
export async function subscribe({ email, website, turnstileToken }, { ip }) {
  if (website?.trim()) return; // honeypot: pretend success
  if (!(await verifyTurnstile(turnstileToken, ip)).ok)
    throw new HttpError(400, "Please complete the security check and try again.");
  const limited = await rateLimit("newsletterIp", hashIp(ip || "unknown"));
  if (!limited.success)
    throw new HttpError(429, "Too many sign-ups from this connection. Please try later.", {
      retryAfter: limited.retryAfter,
    });

  const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
  if (existing?.status === "CONFIRMED") return; // already in: say nothing different

  const token = randomToken();
  const data = {
    confirmTokenHash: tokenHash(token),
    tokenExpiresAt: new Date(Date.now() + TOKEN_DAYS * 86_400_000),
    status: "PENDING",
    ipHash: hashIp(ip || "unknown"),
  };
  await db.newsletterSubscriber.upsert({ where: { email }, update: data, create: { email, ...data } });

  after(async () => {
    try {
      const confirmUrl = `${siteUrl()}/newsletter/confirm#t=${token}`;
      await sendEmail({ to: email, ...newsletterConfirmEmail({ confirmUrl }), tags: ["newsletter-confirm"] });
    } catch (err) {
      logger.error("newsletter.confirm_mail_failed", { err });
    }
  });
}

/**
 * Opens a confirmation link: single use, expires after 7 days.
 * @returns {Promise<"confirmed" | "invalid">}
 */
export async function confirmSubscription(token) {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return "invalid";
  const sub = await db.newsletterSubscriber.findUnique({ where: { confirmTokenHash: tokenHash(token) } });
  if (!sub || !sub.tokenExpiresAt || sub.tokenExpiresAt < new Date()) return "invalid";
  // Burn the token first so a second click (or a link scanner) cannot confirm twice.
  const burned = await db.newsletterSubscriber.updateMany({
    where: { id: sub.id, confirmTokenHash: sub.confirmTokenHash },
    data: { confirmTokenHash: null, tokenExpiresAt: null, status: "CONFIRMED", confirmedAt: new Date() },
  });
  if (burned.count !== 1) return "invalid";
  after(() => addContactToList(sub.email));
  return "confirmed";
}
