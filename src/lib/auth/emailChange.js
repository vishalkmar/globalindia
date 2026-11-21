import "server-only";

import { db } from "@/lib/db";
import { authEnv } from "@/lib/env";

import { hmac } from "./crypto";

export const EMAIL_CHANGE_TTL_MS = 30 * 60 * 1000;

export const hashEmailChangeToken = (token) => hmac(`email-change:${token}`, authEnv.refreshPepper);

/**
 * Apply a confirmed email change. If the old email was the default admin email (approval inbox),
 * the setting follows the change so MFA approvals keep reaching the owner.
 */
export async function applyEmailChange(tx, { userId, oldEmail, newEmail }) {
  await tx.adminUser.update({ where: { id: userId }, data: { email: newEmail, tokenVersion: { increment: 1 } } });
  await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: "email_changed" } });
  const setting = await tx.siteSetting.findUnique({ where: { key: "security" } });
  if (setting?.value?.defaultAdminEmail?.toLowerCase() === oldEmail.toLowerCase()) {
    await tx.siteSetting.update({ where: { key: "security" }, data: { value: { ...setting.value, defaultAdminEmail: newEmail } } });
  }
}

