import "server-only";

import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

/**
 * Retention (Phase 24 todo 16), run daily by /api/cron/purge.
 * - Short-lived security records (sign-in codes, reset links, email-change requests, expired sessions)
 *   are deleted 30 days after they stopped being usable. They are kept that long only to explain an
 *   incident.
 * - The audit log is the security record of who did what; it is kept for 365 days.
 * Runtime logs (Vercel / log drain) are kept 30 days: set in the hosting dashboard (docs/security/24.md).
 */
export const SECURITY_RECORD_DAYS = 30;
export const AUDIT_DAYS = 365;

const daysAgo = (d, now) => new Date(now.getTime() - d * 86_400_000);

export async function purgeOldRecords(now = new Date()) {
  const cutoff = daysAgo(SECURITY_RECORD_DAYS, now);
  const [otp, resets, emailChanges, sessions, auditRows, webhooks] = await Promise.all([
    db.otpCode.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    db.emailChangeRequest.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    db.session.deleteMany({ where: { expiresAt: { lt: cutoff }, absoluteExpiresAt: { lt: cutoff } } }),
    db.auditLog.deleteMany({ where: { at: { lt: daysAgo(AUDIT_DAYS, now) } } }),
    // Webhook event ids only need to outlive the 5-minute replay window; 30 days is plenty.
    db.webhookEvent.deleteMany({ where: { receivedAt: { lt: cutoff } } }),
  ]);
  const result = {
    otpCodes: otp.count,
    resetTokens: resets.count,
    emailChanges: emailChanges.count,
    sessions: sessions.count,
    auditRows: auditRows.count,
    webhookEvents: webhooks.count,
  };
  await audit({ actorId: null, action: "retention.purge", entity: "Retention", entityId: "cron", diff: result });
  return result;
}
