import { after } from "next/server";

import { audit } from "@/lib/audit";
import { clearSessionCookies } from "@/lib/auth/cookies";
import { hmac } from "@/lib/auth/crypto";
import { notifySecurityChange } from "@/lib/auth/notify";
import { hashPassword, passwordPolicyError } from "@/lib/auth/password";
import { revokeAllForUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { authEnv } from "@/lib/env";
import { assertSameOrigin, errorResponse, json, readJson, route } from "@/lib/http";
import { clientIp, hashIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";
import { resetConfirmSchema } from "@/lib/validation/auth";

const BAD_LINK = "This reset link is not valid or has expired. Ask for a new one.";

/**
 * POST /api/auth/reset/confirm { token, newPassword }
 * - Token is single use (atomically marked used), 15 minutes, stored hashed.
 * - After reset: tokenVersion++ and every session revoked (no old session stays alive),
 *   lockout cleared, all other reset links burnt, alert email sent.
 * - The user then signs in normally — a reset never skips the second factor.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req.headers);
  const limited = await rateLimit("resetRequest", `confirm:${ip}`);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });

  const { token, newPassword } = await readJson(req, resetConfirmSchema);
  const tokenHash = hmac(token, authEnv.refreshPepper);
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!row || row.usedAt || row.expiresAt <= new Date() || row.user.status !== "ACTIVE") return errorResponse(400, BAD_LINK);

  const policy = passwordPolicyError(newPassword, { email: row.user.email });
  if (policy) return errorResponse(400, policy, { body: { fields: { newPassword: policy } } });

  const claimed = await db.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) return errorResponse(400, BAD_LINK);

  await db.$transaction([
    db.adminUser.update({
      where: { id: row.userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        failedLogins: 0,
        lockedUntil: null,
      },
    }),
    db.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  await revokeAllForUser(row.userId, "password_reset");

  await audit({ actorId: row.userId, action: "auth.reset.completed", ipHash: hashIp(ip) });
  const headers = req.headers;
  after(() => notifySecurityChange(row.userId, headers, "Your admin password was reset"));
  return clearSessionCookies(json({ ok: true, next: "/admin/login" }));
});
