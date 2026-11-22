import { after } from "next/server";

import { audit } from "@/lib/audit";
import { hmac, randomToken } from "@/lib/auth/crypto";
import { sendEmail } from "@/lib/brevo";
import { db } from "@/lib/db";
import { passwordResetEmail } from "@/lib/email/templates";
import { authEnv } from "@/lib/env";
import { assertSameOrigin, errorResponse, json, readJson, route } from "@/lib/http";
import { clientIp, hashIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";
import { resetRequestSchema } from "@/lib/validation/auth";

const RESET_TTL_MS = 15 * 60 * 1000;
const SAME_ANSWER =
  "If an account exists for that email, a reset link is on its way. It works for 15 minutes.";

/**
 * POST /api/auth/reset/request { email }
 * Always the same answer and the same timing whether the account exists or not:
 * all the real work (lookup, token, email) runs after the response is sent.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req.headers);
  const { email } = await readJson(req, resetRequestSchema);

  const byIp = await rateLimit("resetRequest", `ip:${ip}`);
  const byEmail = await rateLimit("resetRequest", `em:${hmac(email, authEnv.ipHashSalt)}`);
  if (!byIp.success || !byEmail.success)
    return errorResponse(429, undefined, { retryAfter: Math.max(byIp.retryAfter, byEmail.retryAfter) });

  const ipHash = hashIp(ip);
  after(async () => {
    const user = await db.adminUser.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      await audit({ action: "auth.reset.requested_unknown", ipHash });
      return;
    }
    const token = randomToken(32);
    await db.$transaction([
      db.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hmac(token, authEnv.refreshPepper),
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      }),
    ]);
    await sendEmail({
      to: user.email,
      toName: user.name,
      ...passwordResetEmail({ token }),
      tags: ["password-reset"],
    });
    await audit({ actorId: user.id, action: "auth.reset.requested", ipHash });
  });

  return json({ ok: true, message: SAME_ANSWER });
});
