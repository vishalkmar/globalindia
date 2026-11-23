import { after } from "next/server";

import { audit } from "@/lib/audit";
import { BREACHED_MESSAGE, isBreachedPassword } from "@/lib/auth/breached";
import { setSessionCookies } from "@/lib/auth/cookies";
import { requireAdmin, setupPending } from "@/lib/auth/guard";
import { notifySecurityChange } from "@/lib/auth/notify";
import { hashPassword, passwordPolicyError, verifyPassword } from "@/lib/auth/password";
import { createSession, revokeAllForUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assertSameOrigin, errorResponse, json, readJson, route } from "@/lib/http";
import { clientIp, hashIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";
import { passwordChangeSchema } from "@/lib/validation/auth";

/**
 * POST /api/auth/password/change { currentPassword, newPassword }
 * Also used for the forced change on first login. Afterwards every other session is ended
 * (tokenVersion++), and this device gets a fresh session.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const me = await requireAdmin({ allowSetup: true });
  const limited = await rateLimit("sensitiveUser", me.id);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });

  const { currentPassword, newPassword } = await readJson(req, passwordChangeSchema);
  const user = await db.adminUser.findUnique({ where: { id: me.id } });

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    await audit({ actorId: me.id, action: "auth.password.change_failed" });
    return errorResponse(400, "Current password is not correct.", {
      body: { fields: { currentPassword: "Current password is not correct." } },
    });
  }
  const policy = passwordPolicyError(newPassword, { email: user.email });
  if (policy) return errorResponse(400, policy, { body: { fields: { newPassword: policy } } });
  if (await isBreachedPassword(newPassword))
    return errorResponse(400, BREACHED_MESSAGE, { body: { fields: { newPassword: BREACHED_MESSAGE } } });
  if (await verifyPassword(user.passwordHash, newPassword)) {
    const msg = "Choose a password you have not used here before.";
    return errorResponse(400, msg, { body: { fields: { newPassword: msg } } });
  }

  await db.adminUser.update({
    where: { id: me.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });
  await revokeAllForUser(me.id, "password_changed");
  const fresh = await db.adminUser.findUnique({ where: { id: me.id } });
  const ipHash = hashIp(clientIp(req.headers));
  const { accessToken, refreshToken } = await createSession(fresh, {
    userAgent: req.headers.get("user-agent") ?? "",
    ipHash,
  });

  await audit({ actorId: me.id, action: "auth.password.changed", ipHash });
  const headers = req.headers;
  after(() => notifySecurityChange(me.id, headers, "Your admin password was changed"));
  return setSessionCookies(json({ ok: true, next: setupPending(fresh) ? "/admin/setup" : "/admin" }), {
    accessToken,
    refreshToken,
  });
});
