import { NextResponse } from "next/server";

import { route } from "@/lib/http";
import { confirmSubscription } from "@/lib/newsletter";

/**
 * GET /api/public/newsletter/confirm?token= — the link in the confirmation email. Redirects to a page
 * that says what happened; the token never appears on that page or in logs.
 */
export const GET = route(async (req) => {
  const url = new URL(req.url);
  const result = await confirmSubscription(url.searchParams.get("token"));
  const res = NextResponse.redirect(
    new URL(`/newsletter/confirmed?status=${result === "confirmed" ? "ok" : "invalid"}`, url.origin),
    303,
  );
  res.headers.set("cache-control", "private, no-store");
  res.headers.set("referrer-policy", "no-referrer");
  return res;
});
