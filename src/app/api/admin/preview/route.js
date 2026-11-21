import { draftMode } from "next/headers";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin, requirePermission } from "@/lib/auth/guard";
import { assertSameOrigin, json, readJson, route } from "@/lib/http";

// Internal public paths only: no protocol, no "//host", no backslashes, never /admin or /api.
const pathSchema = z
  .string()
  .max(300)
  .regex(/^\/(?!\/)[A-Za-z0-9\-._~/?=&%]*$/, "Invalid path.")
  .refine((p) => !p.startsWith("/admin") && !p.startsWith("/api"), "Invalid path.");

/**
 * POST /api/admin/preview { path } — turn on Draft Mode for this browser so the public site shows
 * unpublished content (Phase 6 todo 11). POST, not GET: it changes state (sets a cookie).
 * Public pages also check the admin session before showing drafts (lib/preview.js).
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("read", "pages");
  const { path } = await readJson(req, z.strictObject({ path: pathSchema }));
  (await draftMode()).enable();
  await audit({ actorId: user.id, action: "preview.enable", diff: { path } });
  return json({ ok: true, url: path });
});

/** DELETE /api/admin/preview — leave preview mode. */
export const DELETE = route(async (req) => {
  assertSameOrigin(req);
  await requireAdmin({ allowSetup: true });
  (await draftMode()).disable();
  return json({ ok: true });
});
