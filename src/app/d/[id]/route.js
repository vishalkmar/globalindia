import "server-only";

import { NextResponse } from "next/server";

import { signedDownloadUrl } from "@/lib/cloudinary";
import { publicDocument } from "@/lib/documents";
import { errorResponse, route } from "@/lib/http";
import { clientIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * GET /d/:mediaId — download a public PDF (Phase 28 todo 08). Pages link here (static links, so page
 * caching is unaffected); this answers with a 302 to a Cloudinary download link that expires in
 * 10 minutes. Rate limited per IP; links placed on other websites (hotlinking) are refused.
 */
export const GET = route(async (req, ctx) => {
  if (req.headers.get("sec-fetch-site") === "cross-site") return errorResponse(403, "Open this document from our website.");
  const limited = await rateLimit("document", clientIp(req.headers));
  if (!limited.success) return errorResponse(429, "Too many downloads. Please wait a few minutes.", { retryAfter: limited.retryAfter });
  const { id } = await ctx.params;
  const media = await publicDocument(id);
  if (!media) return errorResponse(404);
  const target = media.driver === "cloudinary" ? signedDownloadUrl(media.publicId, "pdf") : media.url;
  if (!target) return errorResponse(404);
  const res = NextResponse.redirect(new URL(target, req.url), 302);
  res.headers.set("cache-control", "private, no-store");
  res.headers.set("referrer-policy", "no-referrer");
  res.headers.set("x-robots-tag", "noindex");
  return res;
});
