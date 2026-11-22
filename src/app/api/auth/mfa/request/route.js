import { denyAccess, requireAdmin } from "@/lib/auth/guard";
import { requestMfaChange } from "@/lib/auth/mfa";
import { OtpError, otpErrorMessage } from "@/lib/auth/otp";
import { requireStepUp } from "@/lib/auth/stepUp";
import { db } from "@/lib/db";
import { assertSameOrigin, errorResponse, HttpError, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rateLimit";
import { mfaToggleRequestSchema } from "@/lib/validation/auth";

/**
 * POST /api/auth/mfa/request { method: "totp"|"email", enable: boolean, userId? }
 * Step 1 of an MFA on/off change. Sends an approval code to the DEFAULT admin email.
 * Rules:
 * - Anyone may request a change to their own account; only SUPER_ADMIN may target another account.
 * - Turning the authenticator ON is only possible for your own account (you must hold the phone)
 *   and needs a pending secret from POST /api/auth/totp/setup.
 * - At least one factor must stay on.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const actor = await requireAdmin({ allowSetup: true });
  if (actor.mustChangePassword) throw new HttpError(403, "Change your password first.");

  const limited = await rateLimit("sensitiveUser", actor.id);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });

  const { method, enable, userId } = await readJson(req, mfaToggleRequestSchema);
  const targetId = userId ?? actor.id;
  if (targetId !== actor.id && actor.role !== "SUPER_ADMIN")
    await denyAccess(actor, { action: "mfa", resource: "users", detail: { target: targetId } });
  if (targetId !== actor.id) await requireStepUp(actor); // changing someone else's sign-in protection

  const target = await db.adminUser.findUnique({ where: { id: targetId } });
  if (!target) throw new HttpError(404);

  if (method === "totp" && enable) {
    if (target.id !== actor.id)
      await denyAccess(actor, { action: "mfa", resource: "users", message: "Only the account owner can add an authenticator app.", detail: { target: target.id } });
    if (!target.totpPendingEnc) throw new HttpError(400, "Scan the QR code first.");
  }
  if (!enable) {
    // Turning the authenticator off always leaves email codes on (forced on in /confirm).
    // Turning email codes off is only allowed while the authenticator is on.
    if (method === "email" && !target.totpEnabled)
      throw new HttpError(400, "Keep at least one sign-in method switched on.");
    if (method === "totp" && !target.totpEnabled)
      throw new HttpError(400, "The authenticator app is already off.");
    if (method === "email" && !target.emailOtpEnabled)
      throw new HttpError(400, "Email codes are already off.");
  }
  if (enable && method === "email" && target.emailOtpEnabled)
    throw new HttpError(400, "Email codes are already on.");

  try {
    const { requestId, sentTo } = await requestMfaChange({ actor, target, method, enable });
    return json({ ok: true, next: "confirm", requestId, sentTo });
  } catch (err) {
    if (err instanceof OtpError)
      return errorResponse(429, otpErrorMessage(err), { retryAfter: err.retryAfter });
    throw err;
  }
});
