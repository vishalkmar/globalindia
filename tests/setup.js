import { randomBytes } from "node:crypto";

import { vi } from "vitest";

import { TEST_DB_URL } from "./db-config.js";

process.env.DATABASE_URL = TEST_DB_URL;
process.env.DIRECT_URL = TEST_DB_URL;

// next/server `after()` needs a request scope; in unit tests run the callback immediately.
vi.mock("next/server", async (orig) => ({
  ...(await orig()),
  after: (fn) =>
    Promise.resolve()
      .then(fn)
      .catch(() => {}),
}));

// Deterministic, test-only secrets. Real values come from .env.local / Vercel.
process.env.JWT_ACCESS_SECRET ??= randomBytes(64).toString("base64url");
process.env.JWT_ISSUER ??= "global-india-test";
process.env.JWT_AUDIENCE ??= "global-india-admin-test";
process.env.REFRESH_PEPPER ??= randomBytes(64).toString("base64url");
process.env.OTP_PEPPER ??= randomBytes(64).toString("base64url");
process.env.MFA_PENDING_SECRET ??= randomBytes(64).toString("base64url");
process.env.IP_HASH_SALT ??= randomBytes(32).toString("base64url");
process.env.TOTP_ENC_KEY ??= randomBytes(32).toString("base64");

// Unit tests call route handlers directly; CSRF is tested on its own in csrf.test.js.
globalThis.__giSkipCsrf = true;
globalThis.__giSkipStepUp = true; // step-up is tested on its own in mfa-hardening.test.js
