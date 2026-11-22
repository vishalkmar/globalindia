import { submitEnquiry } from "@/lib/enquiries/submit";
import { assertSameOrigin, json, readJson, route } from "@/lib/http";
import { clientIp } from "@/lib/security/ip";
import { enquirySchema } from "@/lib/validation/enquiry";

/**
 * POST /api/public/enquiry — quote, contact, sample and callback forms (Phase 14).
 * No login. Same-origin only, 32 KB body cap, strict schema, Turnstile, honeypot, timing check,
 * rate limits per IP and per email, spam score. The response never echoes what was stored.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const data = await readJson(req, enquirySchema, { maxBytes: 32 * 1024 });
  const result = await submitEnquiry(data, { ip: clientIp(req.headers) });
  return json({ ok: true, reference: result.reference }, { status: 201 });
});
