import { audit } from "@/lib/audit";
import { completeLogin, userFromMfaTicket } from "@/lib/auth/mfa";
import { OtpError, otpErrorMessage, verifyOtp } from "@/lib/auth/otp";
import { assertSameOrigin, errorResponse, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rateLimit";
import { verifyCodeSchema } from "@/lib/validation/auth";

/** POST /api/auth/verify-otp { code } — second factor by email code; creates the session on success. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { code } = await readJson(req, verifyCodeSchema);
  const user = await userFromMfaTicket();

  const limited = await rateLimit("otpVerifyUser", user.id);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });

  try {
    await verifyOtp(user.id, "LOGIN", code);
  } catch (err) {
    if (err instanceof OtpError) {
      await audit({ actorId: user.id, action: "auth.mfa.email_failed", diff: { reason: err.reason } });
      return errorResponse(400, otpErrorMessage(err));
    }
    throw err;
  }
  return completeLogin(user, req, "email");
});
