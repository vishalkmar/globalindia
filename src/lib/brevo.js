import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { isProduction, isTest, optionalEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Transactional email via the Brevo REST API (no SDK: one dependency less).
 * - API key is server-only (BREVO_API_KEY).
 * - Header injection guard: CR/LF removed from subject, names and addresses.
 * - Development without a key: the message is written to ./.dev-mail/ (git-ignored) instead of sent.
 *   Nothing about the message body (which may hold a code) is ever logged.
 */

const API = "https://api.brevo.com/v3/smtp/email";
const clean = (s, max = 300) => String(s ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);

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
    await writeFile(file, `<!-- To: ${payload.to[0].email} | Subject: ${payload.subject} -->\n${html}`, "utf8");
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
