import { audit } from "@/lib/audit";
import { randomToken } from "@/lib/auth/crypto";
import { EMAIL_CHANGE_TTL_MS, hashEmailChangeToken } from "@/lib/auth/emailChange";
import { requireAdmin } from "@/lib/auth/guard";
import { maskEmail } from "@/lib/auth/mfa";
import { OtpError, otpErrorMessage, verifyOtp } from "@/lib/auth/otp";
import { sendEmail } from "@/lib/brevo";
import { db } from "@/lib/db";
import { emailChangeConfirmEmail } from "@/lib/email/templates";
import { assertSameOrigin, errorResponse, HttpError, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rateLimit";
import { emailChangeOtpSchema } from "@/lib/validation/auth";

/** POST /api/auth/email-change/verify { requestId, code } — step 2: code from the old inbox, link to the new one. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const me = await requireAdmin();
  const limited = await rateLimit("otpVerifyUser", me.id);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });

  const { requestId, code } = await readJson(req, emailChangeOtpSchema);
  const request = await db.emailChangeRequest.findFirst({ where: { id: requestId, userId: me.id, usedAt: null, otpVerifiedAt: null } });
  if (!request || request.expiresAt <= new Date()) throw new HttpError(400, "This request has expired. Start again.");

  try {
    const otp = await verifyOtp(me.id, "EMAIL_CHANGE", code);
    if (otp.meta?.requestId !== request.id) throw new OtpError("invalid");
  } catch (err) {
    if (err instanceof OtpError) return errorResponse(400, otpErrorMessage(err), { body: { fields: { code: otpErrorMessage(err) } } });
    throw err;
  }

  const token = randomToken(32);
  await db.emailChangeRequest.update({
    where: { id: request.id },
    data: { otpVerifiedAt: new Date(), tokenHash: hashEmailChangeToken(token), expiresAt: new Date(Date.now() + EMAIL_CHANGE_TTL_MS) },
  });

  // Only send the link when the address is free; otherwise behave the same and let the request expire.
  const taken = await db.adminUser.findUnique({ where: { email: request.newEmail }, select: { id: true } });
  if (!taken) await sendEmail({ to: request.newEmail, ...emailChangeConfirmEmail({ token }), tags: ["email-change-confirm"] });

  await audit({ actorId: me.id, action: "auth.email_change.otp_ok", entity: "EmailChangeRequest", entityId: request.id });
  return json({ ok: true, next: "check-new-inbox", sentTo: maskEmail(request.newEmail) });
});
