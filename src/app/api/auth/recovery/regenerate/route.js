import "server-only";

import { after } from "next/server";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { notifySecurityChange } from "@/lib/auth/notify";
import { regenerateRecoveryCodes } from "@/lib/auth/recovery";
import { requireStepUp } from "@/lib/auth/stepUp";
import { db } from "@/lib/db";
import { assertSameOrigin, json, route } from "@/lib/http";

/**
 * POST /api/auth/recovery/regenerate — a fresh set of 10 recovery codes for the signed-in admin
 * (Phase 25 todo 08). Needs a recent password confirmation; every old code stops working at once.
 * The codes are returned once and never stored or logged in plain text.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const me = await requireAdmin();
  await requireStepUp(me);
  const codes = await db.$transaction((tx) => regenerateRecoveryCodes(me.id, tx));
  await audit({ actorId: me.id, action: "auth.recovery.regenerated", entity: "AdminUser", entityId: me.id });
  after(() => notifySecurityChange(me.id, req.headers, "New recovery codes were created"));
  return json({ ok: true, recoveryCodes: codes });
});
