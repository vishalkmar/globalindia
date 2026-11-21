import { after } from "next/server";

import { audit } from "@/lib/audit";
import { completeLogin, userFromMfaTicket } from "@/lib/auth/mfa";
import { notifySecurityChange } from "@/lib/auth/notify";
import { remainingRecoveryCodes, useRecoveryCode } from "@/lib/auth/recovery";
import { assertSameOrigin, errorResponse, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rateLimit";
import { recoveryCodeSchema } from "@/lib/validation/auth";

/** POST /api/auth/verify-recovery { code } — one-time backup code when the phone is not available. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { code } = await readJson(req, recoveryCodeSchema);
  const user = await userFromMfaTicket();

  const limited = await rateLimit("otpVerifyUser", user.id);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });

  if (!(await useRecoveryCode(user.id, code))) {
    await audit({ actorId: user.id, action: "auth.mfa.recovery_failed" });
    return errorResponse(400, "That recovery code is not valid or was already used.");
  }
  const left = await remainingRecoveryCodes(user.id);
  await audit({ actorId: user.id, action: "auth.mfa.recovery_used", diff: { remaining: left } });
  const headers = req.headers;
  after(() => notifySecurityChange(user.id, headers, `A recovery code was used to sign in (${left} left)`));
  return completeLogin(user, req, "recovery");
});
