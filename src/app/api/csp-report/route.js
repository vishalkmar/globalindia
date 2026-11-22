import { errorResponse, route } from "@/lib/http";
import { logger } from "@/lib/logger";
import { clientIp, hashIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * POST /api/csp-report — browsers report CSP and Trusted Types violations here (Phase 20 todo 07).
 * Accepts the classic report (application/csp-report) and the Reporting API (application/reports+json).
 * Small body cap, rate limited per IP, only a few safe fields are logged (no query strings, no cookies).
 */
const TYPES = ["application/csp-report", "application/reports+json", "application/json"];
const MAX = 8 * 1024;
const clip = (v) => (typeof v === "string" ? v.replace(/[?#].*$/, "").slice(0, 300) : undefined);

export const POST = route(async (req) => {
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!TYPES.includes(type)) return errorResponse(415);
  const limited = await rateLimit("consent", `csp:${hashIp(clientIp(req.headers))}`);
  if (!limited.success) return new Response(null, { status: 204 });
  const text = await req.text();
  if (text.length > MAX) return errorResponse(413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return errorResponse(400);
  }
  const reports = Array.isArray(body) ? body.map((r) => r.body ?? r) : [body["csp-report"] ?? body];
  for (const r of reports.slice(0, 10)) {
    logger.warn("csp.violation", {
      directive: clip(r["effective-directive"] ?? r.effectiveDirective ?? r["violated-directive"]),
      blocked: clip(r["blocked-uri"] ?? r.blockedURL),
      page: clip(r["document-uri"] ?? r.documentURL),
      source: clip(r["source-file"] ?? r.sourceFile),
      line: Number(r["line-number"] ?? r.lineNumber) || undefined,
      disposition: clip(r.disposition),
    });
  }
  return new Response(null, { status: 204 });
});
