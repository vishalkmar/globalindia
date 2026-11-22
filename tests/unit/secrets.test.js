import { randomBytes } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { REFRESH_TOKEN_TTL_SECONDS } from "@/lib/auth/cookies";
import { ACCESS_TOKEN_TTL_SECONDS } from "@/lib/auth/jwt";
import { requireSecret } from "@/lib/env";

/** Phase 23 todos 01, 02, 06: secret strength, one secret per purpose, token lifetimes. */

const set = [];
const env = (name, value) => {
  set.push(name);
  process.env[name] = value;
};
afterEach(() => {
  for (const n of set.splice(0)) delete process.env[n];
});

describe("secrets", () => {
  it("must be at least 64 random bytes (86 base64url characters)", () => {
    env("GI_TEST_SHORT", randomBytes(48).toString("base64url"));
    expect(() => requireSecret("GI_TEST_SHORT")).toThrow(/too short/);
    env("GI_TEST_LONG", randomBytes(64).toString("base64url"));
    expect(requireSecret("GI_TEST_LONG")).toHaveLength(86);
  });

  it("two purposes may not share one value", () => {
    const v = randomBytes(64).toString("base64url");
    env("GI_TEST_A", v);
    env("GI_TEST_B", v);
    expect(requireSecret("GI_TEST_A")).toBe(v);
    expect(() => requireSecret("GI_TEST_B")).toThrow(/must not share a value/);
  });

  it("the real auth secrets are all different", () => {
    const names = ["JWT_ACCESS_SECRET", "REFRESH_PEPPER", "OTP_PEPPER", "MFA_PENDING_SECRET", "IP_HASH_SALT", "TOTP_ENC_KEY"];
    const values = names.map((n) => process.env[n]);
    expect(new Set(values).size).toBe(names.length);
  });
});

describe("token lifetimes", () => {
  it("access 10 minutes, refresh 7 days", () => {
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(600);
    expect(REFRESH_TOKEN_TTL_SECONDS).toBe(7 * 24 * 3600);
  });
});
