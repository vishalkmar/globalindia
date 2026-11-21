import { isProduction } from "@/lib/env";
import { localRead } from "@/lib/media/localDriver";

const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", pdf: "application/pdf" };

/**
 * GET /api/dev-media/<id>.<ext> — serves local development uploads. 404 in production.
 * nosniff + a sandbox CSP so a file can never run script even if opened directly (Phase 29 todo 09).
 */
export async function GET(_req, ctx) {
  if (isProduction) return new Response("Not found", { status: 404 });
  const { file } = await ctx.params;
  const m = /^(gi_[a-f0-9]{32})\.(jpg|png|webp|avif|pdf)$/.exec(file ?? "");
  if (!m) return new Response("Not found", { status: 404 });
  const buf = await localRead(m[1], m[2]);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(buf, {
    headers: {
      "content-type": TYPES[m[2]],
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "cache-control": "private, max-age=60",
      "content-disposition": m[2] === "pdf" ? "inline" : "inline",
    },
  });
}
