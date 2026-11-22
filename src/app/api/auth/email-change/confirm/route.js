import { after } from "next/server";

import { audit } from "@/lib/audit";
import { clearSessionCookies } from "@/lib/auth/cookies";
import { applyEmailChange, hashEmailChangeToken } from "@/lib/auth/emailChange";
import { sendEmail } from "@/lib/brevo";
import { db } from "@/lib/db";
import { securityAlertEmail } from "@/lib/email/templates";
import { assertSameOrigin, errorResponse, json, readJson, route } from "@/lib/http";
import { clientIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";
import { emailChangeConfirmSchema } from "@/lib/validation/auth";

const BAD_LINK = "This confirmation link is not valid or has expired.";

/**
 * POST /api/auth/email-change/confirm { token } — step 3, from the link in the NEW inbox.
 * Works only after the old-inbox OTP step, once, within 30 minutes. Ends every session.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const limited = await rateLimit("resetRequest", `email-confirm:${clientIp(req.headers)}`);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });

  const { token } = await readJson(req, emailChangeConfirmSchema);
  const request = await db.emailChangeRequest.findUnique({
    where: { tokenHash: hashEmailChangeToken(token) },
    include: { user: true },
  });
  if (!request || request.usedAt || !request.otpVerifiedAt || request.expiresAt <= new Date())
    return errorResponse(400, BAD_LINK);

  const oldEmail = request.user.email;
  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.emailChangeRequest.updateMany({
        where: { id: request.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("used");
      const taken = await tx.adminUser.findUnique({
        where: { email: request.newEmail },
        select: { id: true },
      });
      if (taken) throw new Error("taken");
      await applyEmailChange(tx, { userId: request.userId, oldEmail, newEmail: request.newEmail });
    });
  } catch {
    return errorResponse(400, BAD_LINK);
  }

  await audit({
    actorId: request.userId,
    action: "auth.email_change.completed",
    diff: { from: oldEmail, to: request.newEmail },
  });
  after(() =>
    sendEmail({
      to: oldEmail,
      ...securityAlertEmail({
        title: "Admin email address changed",
        message: `The sign-in email for this admin account was changed to ${request.newEmail}. All sessions were signed out.`,
      }),
      tags: ["security-alert"],
    }),
  );
  return clearSessionCookies(json({ ok: true, next: "/admin/login" }));
});
