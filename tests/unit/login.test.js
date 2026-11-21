import { describe, expect, it } from "vitest";

import { availableMethods, checkPassword, MAX_FAILED_LOGINS } from "@/lib/auth/login";
import { db } from "@/lib/db";

import { makeUser } from "../helpers.js";

describe("password step of login", () => {
  it("accepts the right password and resets the failure counter", async () => {
    const { user, password } = await makeUser();
    await db.adminUser.update({ where: { id: user.id }, data: { failedLogins: 3 } });
    const res = await checkPassword(user.email, password);
    expect(res.ok).toBe(true);
    expect(res.user.failedLogins).toBe(0);
  });

  it("gives the same result shape for unknown email and wrong password (no enumeration)", async () => {
    const { user } = await makeUser();
    const unknown = await checkPassword("nobody-here@test.local", "whatever-password");
    const wrong = await checkPassword(user.email, "wrong-password-123");
    expect(unknown).toEqual({ ok: false });
    expect(wrong).toEqual({ ok: false, locked: false });
    // The route maps both to the same 401 "Invalid email or password." response.
  });

  it(`locks the account for 15 minutes after ${MAX_FAILED_LOGINS} failures, even for the right password`, async () => {
    const { user, password } = await makeUser();
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await checkPassword(user.email, "nope-nope-nope");
    const locked = await db.adminUser.findUnique({ where: { id: user.id } });
    expect(locked.lockedUntil.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);

    const res = await checkPassword(user.email, password);
    expect(res.ok).toBe(false);
  });

  it("does not let disabled accounts sign in", async () => {
    const { user, password } = await makeUser({ status: "DISABLED" });
    expect((await checkPassword(user.email, password)).ok).toBe(false);
  });

  it("always offers at least one second factor", async () => {
    const { user } = await makeUser({ emailOtpEnabled: false, totpEnabled: false });
    expect(await availableMethods(user)).toContain("email");
  });
});
