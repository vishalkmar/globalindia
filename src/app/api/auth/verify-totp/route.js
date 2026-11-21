import { audit } from "@/lib/audit";
import { completeLogin, userFromMfaTicket } from "@/lib/auth/mfa";
import { open } from "@/lib/auth/secretBox";
import { verifyTotp } from "@/lib/auth/totp";
import { db } from "@/lib/db";
import { assertSameOrigin, errorResponse, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rateLimit";
import { verifyCodeSchema } from "@/lib/validation/auth";

/**
 * POST /api/auth/verify-totp { code } — second factor by authenticator app.
 * Accepts ±1 time-step (30 s drift). A code (time-step) can be used only once (replay protection).
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { code } = await readJson(req, verifyCodeSchema);
  const user = await userFromMfaTicket();

  const limited = await rateLimit("otpVerifyUser", user.id);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });

  if (!user.totpEnabled || !user.totpSecretEnc) return errorResponse(400, "That code is not correct.");

  const secret = open(user.totpSecretEnc, user.id);
  const step = verifyTotp(secret, code, { window: 1, lastStep: user.totpLastStep });
  if (step === null) {
    await audit({ actorId: user.id, action: "auth.mfa.totp_failed" });
    return errorResponse(400, "That code is not correct.");
  }
  // Store the step atomically; a parallel request with the same code loses.
  const claimed = await db.adminUser.updateMany({
    where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
    data: { totpLastStep: step },
  });
  if (claimed.count !== 1) return errorResponse(400, "That code is not correct.");

  return completeLogin(user, req, "totp");
});
