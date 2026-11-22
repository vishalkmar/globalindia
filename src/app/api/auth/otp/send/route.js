import { sendLoginOtp, userFromMfaTicket } from "@/lib/auth/mfa";
import { OtpError, otpErrorMessage } from "@/lib/auth/otp";
import { assertSameOrigin, errorResponse, json, readJson, route } from "@/lib/http";
import { sendOtpSchema } from "@/lib/validation/auth";

/**
 * POST /api/auth/otp/send { method: "email" }
 * Emails a 6-digit sign-in code to the account in the MFA-pending ticket.
 * The response NEVER contains the code — only { ok, next }.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  await readJson(req, sendOtpSchema);
  const user = await userFromMfaTicket();
  try {
    await sendLoginOtp(user);
  } catch (err) {
    if (err instanceof OtpError)
      return errorResponse(429, otpErrorMessage(err), { retryAfter: err.retryAfter });
    throw err;
  }
  return json({ ok: true, next: "verify", resendAfter: 60 });
});
