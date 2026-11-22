import "server-only";

import { z } from "zod";

import { hmac, randomToken } from "@/lib/auth/crypto";
import { hashPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/brevo";
import { db } from "@/lib/db";
import { inviteEmail } from "@/lib/email/templates";
import { authEnv } from "@/lib/env";
import { emailSchema } from "@/lib/validation/auth";

export const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

export const inviteSchema = z.strictObject({
  email: emailSchema,
  name: z.string().trim().min(2, "Enter a name.").max(80, "Name is too long."),
  role: z.enum(["SUPER_ADMIN", "EDITOR", "VIEWER"], { message: "Choose a role." }),
});

export const userUpdateSchema = z
  .strictObject({
    name: z.string().trim().min(2, "Enter a name.").max(80).optional(),
    role: z.enum(["SUPER_ADMIN", "EDITOR", "VIEWER"]).optional(),
    status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

/** Safe fields for admin lists (no hashes, no secrets). */
export const USER_LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  totpEnabled: true,
  emailOtpEnabled: true,
  mfaSetupAt: true,
  lastLoginAt: true,
  lockedUntil: true,
  createdAt: true,
};

/** Create (or re-issue) an invite token and email it. */
export async function sendInvite(user, invitedBy) {
  const token = randomToken(32);
  await db.$transaction([
    db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hmac(token, authEnv.refreshPepper),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    }),
  ]);
  await sendEmail({
    to: user.email,
    toName: user.name,
    ...inviteEmail({ token, role: user.role, invitedBy }),
    tags: ["invite"],
  });
}

/** Unusable random password hash for invited accounts until they set their own. */
export async function placeholderPasswordHash() {
  return hashPassword(randomToken(48));
}

export async function activeSuperAdminCount(excludeId) {
  return db.adminUser.count({
    where: { role: "SUPER_ADMIN", status: "ACTIVE", ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
}
