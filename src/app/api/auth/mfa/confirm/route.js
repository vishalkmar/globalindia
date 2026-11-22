import { after } from "next/server";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { defaultAdminContact } from "@/lib/auth/mfa";
import { notifySecurityChange } from "@/lib/auth/notify";
import { OtpError, otpErrorMessage, verifyOtp } from "@/lib/auth/otp";
import { regenerateRecoveryCodes } from "@/lib/auth/recovery";
import { open } from "@/lib/auth/secretBox";
import { verifyTotp } from "@/lib/auth/totp";
import { db } from "@/lib/db";
import { assertSameOrigin, errorResponse, HttpError, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rateLimit";
import { idSchema, otpCodeSchema } from "@/lib/validation/auth";

const schema = z.strictObject({
  requestId: idSchema,
  code: otpCodeSchema, // approval code from the default admin email
  totpCode: otpCodeSchema.optional(), // required when switching the authenticator ON
});

/**
 * POST /api/auth/mfa/confirm { requestId, code, totpCode? }
 * Step 2: applies the change recorded in the approval request. The change itself comes from the
 * server-side record (meta), never from this request body, so it cannot be swapped after approval.
 * Enabling the authenticator for the first time also returns 10 recovery codes — shown once.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const actor = await requireAdmin({ allowSetup: true });
  const limited = await rateLimit("otpVerifyUser", actor.id);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });

  const { requestId, code, totpCode } = await readJson(req, schema);
  const pending = await db.otpCode.findFirst({
    where: { id: requestId, userId: actor.id, purpose: "MFA_TOGGLE", consumedAt: null },
  });
  if (!pending?.meta) throw new HttpError(400, "This request has expired. Start again.");
  const { targetUserId, method, enable } = pending.meta;

  // Authorization is re-checked at apply time.
  if (targetUserId !== actor.id && actor.role !== "SUPER_ADMIN") throw new HttpError(403);
  const target = await db.adminUser.findUnique({ where: { id: targetUserId } });
  if (!target) throw new HttpError(404);

  // For enabling TOTP, check the app code first (no state change if it is wrong).
  let totpStep = null;
  let totpSecretEnc = null;
  if (method === "totp" && enable) {
    if (target.id !== actor.id || !target.totpPendingEnc) throw new HttpError(400, "Scan the QR code again.");
    if (!totpCode)
      throw new HttpError(400, "Enter the 6-digit code from your authenticator app.", {
        body: { fields: { totpCode: "Required." } },
      });
    totpStep = verifyTotp(open(target.totpPendingEnc, target.id), totpCode, { window: 1 });
    if (totpStep === null) {
      return errorResponse(400, "The authenticator code is not correct. Check the time on your phone.", {
        body: { fields: { totpCode: "Not correct." } },
      });
    }
    totpSecretEnc = target.totpPendingEnc;
  }

  try {
    await verifyOtp(actor.id, "MFA_TOGGLE", code, { otpId: requestId });
  } catch (err) {
    if (err instanceof OtpError)
      return errorResponse(400, otpErrorMessage(err), { body: { fields: { code: otpErrorMessage(err) } } });
    throw err;
  }

  let recoveryCodes = null;
  await db.$transaction(async (tx) => {
    if (method === "totp" && enable) {
      const firstSetup = !target.mfaSetupAt;
      await tx.adminUser.update({
        where: { id: target.id },
        data: {
          totpSecretEnc,
          totpPendingEnc: null,
          totpPendingAt: null,
          totpEnabled: true,
          totpLastStep: totpStep,
          ...(firstSetup ? { mfaSetupAt: new Date() } : {}),
        },
      });
      const haveCodes = await tx.recoveryCode.count({ where: { userId: target.id, usedAt: null } });
      if (firstSetup || haveCodes === 0) recoveryCodes = await regenerateRecoveryCodes(target.id, tx);
    } else if (method === "totp" && !enable) {
      await tx.adminUser.update({
        where: { id: target.id },
        data: {
          totpEnabled: false,
          totpSecretEnc: null,
          totpPendingEnc: null,
          totpPendingAt: null,
          totpLastStep: null,
          emailOtpEnabled: true,
        },
      });
    } else if (method === "email" && enable) {
      await tx.adminUser.update({ where: { id: target.id }, data: { emailOtpEnabled: true } });
    } else {
      const fresh = await tx.adminUser.findUnique({
        where: { id: target.id },
        select: { totpEnabled: true },
      });
      if (!fresh.totpEnabled) throw new HttpError(400, "Keep at least one sign-in method switched on.");
      await tx.adminUser.update({ where: { id: target.id }, data: { emailOtpEnabled: false } });
    }
  });

  const label = `${method === "totp" ? "Authenticator app" : "Email codes"} turned ${enable ? "on" : "off"}`;
  await audit({
    actorId: actor.id,
    action: `mfa.${method}.${enable ? "enabled" : "disabled"}`,
    entity: "AdminUser",
    entityId: target.id,
  });
  const headers = req.headers;
  const contact = await defaultAdminContact();
  after(async () => {
    await notifySecurityChange(target.id, headers, `${label} for ${target.email}`);
    if (contact.userId && contact.userId !== target.id)
      await notifySecurityChange(contact.userId, headers, `${label} for ${target.email}`);
  });

  return json({ ok: true, change: label, recoveryCodes, next: recoveryCodes ? "save-codes" : "done" });
});
