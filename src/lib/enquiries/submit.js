import "server-only";

import { after } from "next/server";

import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/brevo";
import { db } from "@/lib/db";
import { enquiryAckEmail, enquiryAdminEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { logger } from "@/lib/logger";
import { hashIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { getSetting } from "@/lib/site-data";

import { spamScore } from "./spam";

/** Short reference shown to the customer and in emails, e.g. GI-7K2Q9C. */
export const enquiryRef = (id) => `GI-${id.slice(-6).toUpperCase()}`;

async function notifyRecipients(settings) {
  if (settings.notifyEmails.length) return settings.notifyEmails;
  const security = await db.siteSetting.findUnique({ where: { key: "security" } });
  const fallback = security?.value?.defaultAdminEmail;
  return typeof fallback === "string" && fallback ? [fallback.toLowerCase()] : [];
}

/** Published products for the slugs in the form, in the same order (unknown slugs are dropped). */
async function resolveItems(items = []) {
  if (!items.length) return [];
  const rows = await db.product.findMany({
    where: { slug: { in: items.map((i) => i.slug) }, status: "PUBLISHED", deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return items
    .filter((i) => bySlug.has(i.slug))
    .map((i) => ({ ...i, id: bySlug.get(i.slug).id, name: bySlug.get(i.slug).name }));
}

/**
 * Handles one validated public enquiry (Phase 14 todos 07-11, 17-18).
 * Order: Turnstile -> rate limits -> spam score -> save -> emails after the response is sent.
 * @param {object} data   output of enquirySchema
 * @param {{ ip: string }} req
 * @returns {Promise<{ ok: true, reference: string|null }>}
 */
export async function submitEnquiry(data, { ip }) {
  const turnstile = await verifyTurnstile(data.turnstileToken, ip);
  if (!turnstile.ok) throw new HttpError(400, "Please complete the security check and send the form again.");

  const ipKey = hashIp(ip || "unknown");
  const byIp = await rateLimit("enquiryIp", ipKey);
  if (!byIp.success)
    throw new HttpError(429, "Too many messages from this connection. Please call us or try again later.", {
      retryAfter: byIp.retryAfter,
    });
  if (data.email) {
    const byEmail = await rateLimit("enquiryEmail", hashIp(data.email));
    if (!byEmail.success)
      throw new HttpError(429, "We already have several messages from this email. We will reply soon.", {
        retryAfter: byEmail.retryAfter,
      });
  }

  const settings = await getSetting("enquiries");
  const spam = spamScore(data, settings);
  if (spam.honeypot) {
    // A bot filled the hidden field: answer like a success so it learns nothing, store nothing.
    logger.info("enquiry.honeypot");
    return { ok: true, reference: null };
  }

  const items = await resolveItems(data.items);
  if (data.type === "QUOTE" && !items.length) {
    throw new HttpError(400, "Please check the highlighted fields.", {
      body: { fields: { items: "Choose products from our catalogue." } },
    });
  }
  if (data.type === "SAMPLE" && !items.length) {
    throw new HttpError(400, "Please check the highlighted fields.", {
      body: { fields: { items: "Choose the product you want a sample of." } },
    });
  }

  const enquiry = await db.enquiry.create({
    data: {
      type: data.type,
      status: spam.isSpam ? "SPAM" : "NEW",
      name: data.name,
      company: data.company ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      city: data.city ?? "",
      productIds: items.map((i) => i.id),
      productNames: items.map((i) => i.name),
      quantity: items
        .map((i) => i.quantity)
        .filter(Boolean)
        .join("; ")
        .slice(0, 300),
      packSize: items
        .map((i) => i.packSize)
        .filter(Boolean)
        .join("; ")
        .slice(0, 300),
      message: [
        data.message ?? "",
        ...items
          .filter((item) => item.grade)
          .map((item) => `Requested grade for ${item.name}: ${item.grade}`),
      ]
        .filter(Boolean)
        .join("\n"),
      source: data.source ?? "",
      spamScore: spam.score,
      ipHash: ipKey,
    },
  });

  await audit({
    actorId: null,
    action: spam.isSpam ? "enquiry.spam" : "enquiry.received",
    entity: "Enquiry",
    entityId: enquiry.id,
    diff: { type: enquiry.type, score: spam.score, reasons: spam.reasons.slice(0, 5) },
  });

  if (!spam.isSpam) {
    after(async () => {
      try {
        const adminUrl = `${siteUrl()}/admin/enquiries/${enquiry.id}`;
        const to = await notifyRecipients(settings);
        const adminMail = enquiryAdminEmail({ enquiry, items, adminUrl });
        for (const addr of to) await sendEmail({ to: addr, ...adminMail, tags: ["enquiry-admin"] });
        if (settings.acknowledge && enquiry.email) {
          const business = await getSetting("business");
          const phone = business.phones?.[0]?.number;
          await sendEmail({
            to: enquiry.email,
            toName: enquiry.name,
            ...enquiryAckEmail({ enquiry, items, phone }),
            tags: ["enquiry-ack"],
          });
        }
      } catch (err) {
        logger.error("enquiry.notify_failed", { err });
      }
    });
  }

  return { ok: true, reference: enquiryRef(enquiry.id) };
}
