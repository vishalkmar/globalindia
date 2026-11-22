import { describe, expect, it } from "vitest";

import { maskEmail } from "@/lib/auth/mfa";
import { issueOtp, OTP_MAX_ATTEMPTS, OtpError, verifyOtp } from "@/lib/auth/otp";
import { regenerateRecoveryCodes, remainingRecoveryCodes, useRecoveryCode } from "@/lib/auth/recovery";
import { open, seal } from "@/lib/auth/secretBox";
import { base32Decode, base32Encode, hotp, otpauthUri, totpCode, verifyTotp } from "@/lib/auth/totp";
import { db } from "@/lib/db";

import { makeUser } from "../helpers.js";

describe("TOTP (RFC 6238 / RFC 4226)", () => {
  // RFC 4226 Appendix D: secret "12345678901234567890"
  const rfcSecret = Buffer.from("12345678901234567890");
  it("matches the RFC 4226 HOTP vectors", () => {
    const expected = [
      "755224",
      "287082",
      "359152",
      "969429",
      "338314",
      "254676",
      "287922",
      "162583",
      "399871",
      "520489",
    ];
    expected.forEach((code, counter) => expect(hotp(rfcSecret, counter)).toBe(code));
  });

  it("matches RFC 6238 SHA-1 vectors (last 6 digits)", () => {
    const b32 = base32Encode(rfcSecret);
    expect(totpCode(b32, 59 * 1000)).toBe("287082");
    expect(totpCode(b32, 1111111109 * 1000)).toBe("081804");
    expect(totpCode(b32, 1234567890 * 1000)).toBe("005924");
    expect(totpCode(b32, 2000000000 * 1000)).toBe("279037");
  });

  it("round-trips base32", () => {
    const buf = Buffer.from("Global India 2002");
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });

  it("accepts ±1 step, rejects older codes and replays", () => {
    const secret = base32Encode(Buffer.from("abcdefghijabcdefghij"));
    const now = 1_800_000_000_000;
    const prev = totpCode(secret, now - 30_000);
    const step = verifyTotp(secret, prev, { nowMs: now });
    expect(step).not.toBeNull();
    expect(verifyTotp(secret, totpCode(secret, now - 90_000), { nowMs: now })).toBeNull();
    // Same code again after it was used -> refused
    expect(verifyTotp(secret, prev, { nowMs: now, lastStep: step })).toBeNull();
    expect(verifyTotp(secret, "12345", { nowMs: now })).toBeNull();
  });

  it("builds an otpauth URI for authenticator apps", () => {
    const uri = otpauthUri({ secret: "JBSWY3DPEHPK3PXP", account: "owner@globalindia.in" });
    expect(uri).toMatch(/^otpauth:\/\/totp\/Global%20India%3Aowner%40globalindia\.in\?/);
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
  });
});

describe("secret box (AES-256-GCM)", () => {
  it("encrypts with a fresh IV and decrypts with the right AAD only", () => {
    const a = seal("JBSWY3DPEHPK3PXP", "user-1");
    const b = seal("JBSWY3DPEHPK3PXP", "user-1");
    expect(a).not.toBe(b);
    expect(a).not.toContain("JBSWY3DPEHPK3PXP");
    expect(open(a, "user-1")).toBe("JBSWY3DPEHPK3PXP");
    expect(() => open(a, "user-2")).toThrow();
    const tampered = a.slice(0, -3) + (a.endsWith("A") ? "BBB" : "AAA");
    expect(() => open(tampered, "user-1")).toThrow();
  });
});

describe("email OTP", () => {
  it("stores only a hash, works once, then fails", async () => {
    const { user } = await makeUser();
    const { code, otp } = await issueOtp(user.id, "LOGIN");
    expect(code).toMatch(/^\d{6}$/);
    const row = await db.otpCode.findUnique({ where: { id: otp.id } });
    expect(row.codeHash).not.toContain(code);
    expect(row.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(5 * 60 * 1000);

    await verifyOtp(user.id, "LOGIN", code);
    await expect(verifyOtp(user.id, "LOGIN", code)).rejects.toBeInstanceOf(OtpError);
  });

  it("enforces the 60 s resend cooldown", async () => {
    const { user } = await makeUser();
    await issueOtp(user.id, "LOGIN");
    await expect(issueOtp(user.id, "LOGIN")).rejects.toMatchObject({ reason: "cooldown" });
  });

  it(`burns the code after ${OTP_MAX_ATTEMPTS} wrong attempts`, async () => {
    const { user } = await makeUser();
    const { code } = await issueOtp(user.id, "LOGIN");
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < OTP_MAX_ATTEMPTS - 1; i++)
      await expect(verifyOtp(user.id, "LOGIN", wrong)).rejects.toMatchObject({ reason: "invalid" });
    await expect(verifyOtp(user.id, "LOGIN", wrong)).rejects.toMatchObject({ reason: "burnt" });
    await expect(verifyOtp(user.id, "LOGIN", code)).rejects.toBeInstanceOf(OtpError); // even the right code is dead now
  });

  it("rejects expired codes", async () => {
    const { user } = await makeUser();
    const { code, otp } = await issueOtp(user.id, "LOGIN");
    await db.otpCode.update({ where: { id: otp.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(verifyOtp(user.id, "LOGIN", code)).rejects.toMatchObject({ reason: "expired" });
  });

  it("keeps purposes apart (a login code cannot approve an MFA change)", async () => {
    const { user } = await makeUser();
    const { code } = await issueOtp(user.id, "LOGIN");
    await expect(verifyOtp(user.id, "MFA_TOGGLE", code)).rejects.toBeInstanceOf(OtpError);
  });
});

describe("recovery codes", () => {
  it("creates 10 single-use codes stored as hashes", async () => {
    const { user } = await makeUser();
    const codes = await regenerateRecoveryCodes(user.id);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    codes.forEach((c) => expect(c).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/));
    const rows = await db.recoveryCode.findMany({ where: { userId: user.id } });
    expect(rows.some((r) => codes.includes(r.codeHash))).toBe(false);

    expect(await useRecoveryCode(user.id, codes[0].toLowerCase())).toBe(true);
    expect(await useRecoveryCode(user.id, codes[0])).toBe(false);
    expect(await remainingRecoveryCodes(user.id)).toBe(9);
  });

  it("a code from one user does not work for another", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const codes = await regenerateRecoveryCodes(a.user.id);
    expect(await useRecoveryCode(b.user.id, codes[0])).toBe(false);
  });
});

describe("masking", () => {
  it("masks emails for display", () => {
    expect(maskEmail("akash.rathod@globalindia.in")).toBe("a****@g****.in");
  });
});
