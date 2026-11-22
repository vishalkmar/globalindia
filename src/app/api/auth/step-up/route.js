import "server-only";

import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { verifyPassword } from "@/lib/auth/password";
import { stepUpCookie } from "@/lib/auth/stepUp";
import { db } from "@/lib/db";
import { assertSameOrigin, errorResponse, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rateLimit";

/** POST /api/auth/step-up { password } — confirm the password before a sensitive action (Phase 25 todo 10). */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const me = await requireAdmin();
  const limited = await rateLimit("sensitiveUser", me.id);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });
  const { password } = await readJson(req, z.strictObject({ password: z.string().min(1).max(128) }));
  const user = await db.adminUser.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(user.passwordHash, password))) {
    await audit({ actorId: me.id, action: "auth.step_up.failed" });
    return errorResponse(400, "That password is not correct.", { body: { fields: { password: "Not correct." } } });
  }
  await audit({ actorId: me.id, action: "auth.step_up.ok" });
  const c = stepUpCookie(me.sessionId);
  const res = json({ ok: true, validForSeconds: c.options.maxAge });
  res.cookies.set(c.name, c.value, c.options);
  return res;
});
