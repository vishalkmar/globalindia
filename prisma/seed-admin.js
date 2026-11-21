import { hash } from "@node-rs/argon2";

import { ARGON2_OPTIONS, PASSWORD_MIN_LENGTH } from "../src/lib/auth/argon-params.js";
import { log } from "./seed-utils.js";

/**
 * Creates the first SUPER_ADMIN from SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD.
 * - Never overwrites an existing account (re-running the seed cannot reset a real password).
 * - mustChangePassword = true and no MFA yet: first login forces a new password and MFA setup.
 * - The password is never printed.
 */
export async function seedAdmin(db) {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    log("admin", "skipped (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set)");
    return;
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`SEED_ADMIN_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  const existing = await db.adminUser.findUnique({ where: { email } });
  if (existing) {
    log("admin", "already exists, left unchanged");
    return;
  }

  await db.adminUser.create({
    data: {
      email,
      name: "Site owner",
      passwordHash: await hash(password, ARGON2_OPTIONS),
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      mustChangePassword: true,
      emailOtpEnabled: true,
      totpEnabled: false,
    },
  });
  await db.auditLog.create({ data: { action: "seed.admin.create", entity: "AdminUser", diff: { email } } });
  log("admin", `super admin created (${email}); password change + MFA required on first login`);
}
