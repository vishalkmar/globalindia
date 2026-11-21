import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";

let n = 0;

/** Creates an admin user with a unique email. */
export async function makeUser(overrides = {}) {
  n += 1;
  const password = overrides.password ?? "Test-Password-1234";
  const user = await db.adminUser.create({
    data: {
      email: overrides.email ?? `user${n}-${Date.now()}@test.local`,
      name: "Test User",
      passwordHash: await hashPassword(password),
      role: overrides.role ?? "EDITOR",
      status: overrides.status ?? "ACTIVE",
      emailOtpEnabled: overrides.emailOtpEnabled ?? true,
      totpEnabled: overrides.totpEnabled ?? false,
      mustChangePassword: overrides.mustChangePassword ?? false,
    },
  });
  return { user, password };
}

export function sentMail() {
  return globalThis.__giSentMail ?? [];
}

export function clearMail() {
  globalThis.__giSentMail = [];
}
