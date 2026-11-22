import { audit } from "@/lib/audit";
import { randomToken } from "@/lib/auth/crypto";
import { EMAIL_CHANGE_TTL_MS, hashEmailChangeToken } from "@/lib/auth/emailChange";
import { requireAdmin } from "@/lib/auth/guard";
import { maskEmail } from "@/lib/auth/mfa";
import { issueOtp, OtpError, otpErrorMessage } from "@/lib/auth/otp";
import { verifyPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/brevo";
import { db } from "@/lib/db";
import { otpEmail } from "@/lib/email/templates";
import { assertSameOrigin, errorResponse, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rateLimit";
import { emailChangeStartSchema } from "@/lib/validation/auth";

/**
 * POST /api/auth/email-change/start { newEmail, currentPassword }
 * Step 1 of 3: password check, then a code to the CURRENT (old) email.
 * Step 2 (/verify): code -> confirmation link sent to the NEW email.
 * Step 3 (/confirm): link clicked -> email changed, every session ended.
 * If the new address is already used by another account, the flow looks identical but never completes
 * (no way to discover which emails have admin accounts).
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const me = await requireAdmin();
  const limited = await rateLimit("sensitiveUser", me.id);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });

  const { newEmail, currentPassword } = await readJson(req, emailChangeStartSchema);
  const user = await db.adminUser.findUnique({ where: { id: me.id } });
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    await audit({ actorId: me.id, action: "auth.email_change.bad_password" });
    return errorResponse(400, "Current password is not correct.", {
      body: { fields: { currentPassword: "Not correct." } },
    });
  }
  if (newEmail === user.email)
    return errorResponse(400, "That is already your email address.", {
      body: { fields: { newEmail: "Same as current." } },
    });

  const request = await db.emailChangeRequest.create({
    data: {
      userId: me.id,
      newEmail,
      tokenHash: hashEmailChangeToken(randomToken(32)), // placeholder; real link token is issued after the OTP step
      expiresAt: new Date(Date.now() + EMAIL_CHANGE_TTL_MS),
    },
  });

  try {
    const { code } = await issueOtp(me.id, "EMAIL_CHANGE", { requestId: request.id });
    await sendEmail({
      to: user.email,
      toName: user.name,
      ...otpEmail({ code, purpose: "EMAIL_CHANGE", context: { "New email": newEmail } }),
      tags: ["otp-email-change"],
    });
  } catch (err) {
    if (err instanceof OtpError)
      return errorResponse(429, otpErrorMessage(err), { retryAfter: err.retryAfter });
    throw err;
  }

  await audit({
    actorId: me.id,
    action: "auth.email_change.started",
    entity: "EmailChangeRequest",
    entityId: request.id,
  });
  return json({ ok: true, next: "verify", requestId: request.id, sentTo: maskEmail(user.email) });
});
