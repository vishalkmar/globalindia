import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { hmac } from "@/lib/auth/crypto";
import { authEnv, isProduction, isTest, optionalEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * Transactional email via the Brevo REST API (no SDK: one dependency less).
 * - API key is server-only (BREVO_API_KEY).
 * - Header injection guard: CR/LF removed from subject, names and addresses.
 * - Development without a key: the message is written to ./.dev-mail/ (git-ignored) instead of sent.
 *   Nothing about the message body (which may hold a code) is ever logged.
 */

const API = "https://api.brevo.com/v3/smtp/email";
const clean = (s, max = 300) =>
  String(s ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, max);

/**
 * @param {{ to: string, toName?: string, subject: string, html: string, text: string, tags?: string[] }} msg
 * @returns {Promise<boolean>} true when accepted for delivery
 */
export async function sendEmail({ to, toName, subject, html, text, tags = [] }) {
  const apiKey = optionalEnv("BREVO_API_KEY");
  const senderEmail = optionalEnv("BREVO_SENDER_EMAIL");
  const senderName = optionalEnv("BREVO_SENDER_NAME", "Global India");
  const payload = {
    sender: { email: clean(senderEmail, 254), name: clean(senderName, 80) },
    to: [{ email: clean(to, 254), ...(toName ? { name: clean(toName, 80) } : {}) }],
    subject: clean(subject, 200),
    htmlContent: html,
    textContent: text,
    tags: tags.map((t) => clean(t, 40)),
  };

  // Email bombing guard (Phase 22 todo 15): at most a few emails per address per hour, whatever
  // asked for them (sign-in codes, resets, newsletter, enquiry receipts). Keyed by a hash, not the address.
  const perRecipient = await rateLimit("mailRecipient", hmac(payload.to[0].email.toLowerCase(), authEnv.ipHashSalt));
  if (!perRecipient.success) {
    logger.warn("email.recipient_limited", { tags });
    return false;
  }

  if (isTest) {
    (globalThis.__giSentMail ??= []).push({ to: payload.to[0].email, subject: payload.subject, text, tags });
    return true;
  }

  if (!apiKey || !senderEmail) {
    if (isProduction) {
      logger.error("email.not_configured", { tags });
      return false;
    }
    const dir = join(process.cwd(), ".dev-mail");
    await mkdir(dir, { recursive: true });
    const file = join(dir, `${Date.now()}-${tags[0] ?? "mail"}.html`);
    await writeFile(
      file,
      `<!-- To: ${payload.to[0].email} | Subject: ${payload.subject} -->\n${html}`,
      "utf8",
    );
    logger.info("email.dev_outbox", { tags, file: file.split(/[\\/]/).pop() });
    return true;
  }

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) {
      logger.error("email.send_failed", { status: res.status, tags });
      return false;
    }
    return true;
  } catch (err) {
    logger.error("email.send_error", { err, tags });
    return false;
  }
}

/**
 * Add a confirmed subscriber to the Brevo list (Phase 15 todo 17). Only after double opt-in.
 * Needs BREVO_API_KEY and BREVO_LIST_ID; without them (development) it is a logged no-op.
 * @returns {Promise<boolean>}
 */
export async function addContactToList(email) {
  const apiKey = optionalEnv("BREVO_API_KEY");
  const listId = Number(optionalEnv("BREVO_LIST_ID", "0"));
  if (isTest) return true;
  if (!apiKey || !listId) {
    logger.info("newsletter.brevo_not_configured");
    return !isProduction;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email: clean(email, 254), listIds: [listId], updateEnabled: true }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok && res.status !== 204) {
      logger.error("newsletter.brevo_failed", { status: res.status });
      return false;
    }
    return true;
  } catch (err) {
    logger.error("newsletter.brevo_error", { err });
    return false;
  }
}
