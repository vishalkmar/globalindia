import { NextResponse } from "next/server";
import { z } from "zod";

import { assertSameOrigin, json, readJson, route } from "@/lib/http";
import { confirmSubscription } from "@/lib/newsletter";

/**
 * Newsletter double opt-in (Phase 15 todo 17, Phase 18 todo 07: no state change on GET).
 *
 * The email links to /newsletter/confirm#t=<token>. That page asks the person to press "Confirm",
 * which POSTs here. Opening a link therefore never confirms anything, so mail scanners that open
 * links on their own cannot subscribe someone, and the token (in the #fragment) never reaches logs.
 */

const bodySchema = z.strictObject({ token: z.string().min(20).max(200).regex(/^[A-Za-z0-9_-]+$/) });

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { token } = await readJson(req, bodySchema, { maxBytes: 1024 });
  const result = await confirmSubscription(token);
  return json({ ok: true, status: result === "confirmed" ? "ok" : "invalid" });
});

/** Links sent before this change pointed here: move the token into the page's fragment, change nothing. */
export const GET = route(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const target = /^[A-Za-z0-9_-]{20,200}$/.test(token) ? `/newsletter/confirm#t=${token}` : "/newsletter/confirmed?status=invalid";
  const res = NextResponse.redirect(new URL(target, url.origin), 303);
  res.headers.set("cache-control", "private, no-store");
  res.headers.set("referrer-policy", "no-referrer");
  return res;
});
