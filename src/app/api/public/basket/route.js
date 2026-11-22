import { z } from "zod";

import { assertSameOrigin, cookieValue, errorResponse, json, readJson, route } from "@/lib/http";
import { clientIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";
import { BASKET_COOKIE, BASKET_MAX, parseBasket } from "@/lib/validation/enquiry";

/**
 * "Add to quote" basket (Phase 14 todo 15). Product slugs only — nothing personal — in an httpOnly,
 * SameSite=Lax cookie for 30 days. Scripts never touch cookies directly (Phase 9 rule); the page asks here.
 */

const MAX_AGE = 30 * 24 * 60 * 60;
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+){0,9}$/);
const bodySchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("add"), slug }),
  z.strictObject({ action: z.literal("remove"), slug }),
  z.strictObject({ action: z.literal("clear") }),
]);

function respond(items, extra = {}) {
  const res = json({ ok: true, items, ...extra });
  res.cookies.set(BASKET_COOKIE, items.join("."), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: items.length ? MAX_AGE : 0,
  });
  return res;
}

/** GET /api/public/basket — the slugs in the visitor's basket. */
export const GET = route(async (req) =>
  json({ ok: true, items: parseBasket(cookieValue(req, BASKET_COOKIE)) }),
);

/** POST /api/public/basket { action: "add" | "remove" | "clear", slug? } */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const limited = await rateLimit("consent", clientIp(req.headers));
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });
  const body = await readJson(req, bodySchema, { maxBytes: 1024 });
  const items = parseBasket(cookieValue(req, BASKET_COOKIE));
  if (body.action === "clear") return respond([]);
  if (body.action === "remove") return respond(items.filter((s) => s !== body.slug));
  if (items.includes(body.slug)) return respond(items);
  if (items.length >= BASKET_MAX) return respond(items, { full: true });
  return respond([...items, body.slug]);
});
