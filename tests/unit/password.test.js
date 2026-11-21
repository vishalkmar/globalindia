import { describe, expect, it } from "vitest";

import { hashPassword, needsRehash, passwordPolicyError, verifyPassword } from "@/lib/auth/password";

describe("password hashing (argon2id)", () => {
  it("hashes with argon2id and current params", async () => {
    const h = await hashPassword("correct horse battery staple");
    expect(h).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
    expect(needsRehash(h)).toBe(false);
  });

  it("verifies right and rejects wrong passwords", async () => {
    const h = await hashPassword("Delhi-Chem-2002!");
    expect(await verifyPassword(h, "Delhi-Chem-2002!")).toBe(true);
    expect(await verifyPassword(h, "delhi-chem-2002!")).toBe(false);
    expect(await verifyPassword(h, "")).toBe(false);
  });

  it("returns false (after doing the work) when the user does not exist", async () => {
    const t0 = performance.now();
    expect(await verifyPassword(null, "anything at all")).toBe(false);
    expect(performance.now() - t0).toBeGreaterThan(5); // a real argon2 verify ran
  });

  it("flags old parameters for rehash", () => {
    expect(needsRehash("$argon2id$v=19$m=19456,t=2,p=1$abc$def")).toBe(true);
    expect(needsRehash("$2b$10$bcrypthash")).toBe(true);
  });

  it("enforces the password policy", () => {
    expect(passwordPolicyError("short")).toMatch(/12/);
    expect(passwordPolicyError("aaaaaaaaaaaaaa")).toMatch(/repeat/);
    expect(passwordPolicyError("akash-secure-password", { email: "akash@x.in" })).toMatch(/email/);
    expect(passwordPolicyError("Burari-Road-419-Delhi")).toBeNull();
  });
});
