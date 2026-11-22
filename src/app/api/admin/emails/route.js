import { z } from "zod";

import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { sendEmail } from "@/lib/brevo";
import { EMAIL_KEYS, EMAIL_SAMPLES } from "@/lib/email/samples";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rateLimit";

/** GET /api/admin/emails?template= — subject and HTML of one email, with sample data (preview). */
export const GET = route(async (req) => {
  await requirePermission("read", "siteSettings");
  const key = new URL(req.url).searchParams.get("template");
  if (!EMAIL_KEYS.includes(key ?? ""))
    return json({ ok: true, templates: EMAIL_KEYS.map((k) => ({ key: k, label: EMAIL_SAMPLES[k].label })) });
  const mail = EMAIL_SAMPLES[key].render();
  return json({ ok: true, subject: mail.subject, html: mail.html, text: mail.text });
});

/** POST /api/admin/emails { template } — send the sample to the signed-in admin only (never elsewhere). */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "siteSettings");
  const { template } = await readJson(req, z.strictObject({ template: z.enum(EMAIL_KEYS) }), {
    maxBytes: 512,
  });
  const limited = await rateLimit("sensitiveUser", `email-test:${user.id}`);
  if (!limited.success)
    throw new HttpError(429, "Too many test emails. Try again later.", { retryAfter: limited.retryAfter });
  const mail = EMAIL_SAMPLES[template].render();
  const ok = await sendEmail({
    to: user.email,
    subject: `[Test] ${mail.subject}`,
    html: mail.html,
    text: mail.text,
    tags: ["email-test"],
  });
  await audit({ actorId: user.id, action: "email.test_send", entity: "Email", entityId: template });
  if (!ok)
    throw new HttpError(502, "The email service did not accept the message. Check the Brevo settings.");
  return json({ ok: true, to: user.email });
});
