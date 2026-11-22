import { z } from "zod";

/**
 * Redirect rules (Phase 16 todo 03). Sources are paths on this site; targets are paths on this site
 * or https URLs. Admin, API and Next internals can never be redirected (no hijacking of /admin).
 */
const RESERVED = /^\/(admin|api|_next)(\/|$)/;
const PATH = /^\/(?!\/)[A-Za-z0-9\-._~/%]*$/;

const normalise = (p) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

export const sourcePath = z
  .string()
  .trim()
  .max(300)
  .transform(normalise)
  .refine((p) => PATH.test(p), "Use a path on this site, e.g. /old-page (no domain, no ?query).")
  .refine((p) => p !== "/" && !RESERVED.test(p), "Home, /admin and /api cannot be redirected.");

export const targetPath = z
  .string()
  .trim()
  .max(500)
  .refine(
    (p) => (p.startsWith("/") ? PATH.test(p) && !RESERVED.test(p) : /^https:\/\/[^\s<>"]+$/i.test(p)),
    "Use a path on this site (/new-page) or a full https:// link.",
  )
  .transform((p) => (p.startsWith("/") ? normalise(p) : p));

export const redirectSchema = z
  .strictObject({
    fromPath: sourcePath,
    toPath: targetPath,
    statusCode: z.union([z.literal(301), z.literal(302)]).default(301),
  })
  .refine((r) => r.fromPath !== r.toPath, { path: ["toPath"], message: "A page cannot redirect to itself." });
