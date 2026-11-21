import { randomBytes } from "node:crypto";

// Deterministic, test-only secrets. Real values come from .env.local / Vercel.
process.env.JWT_ACCESS_SECRET ??= randomBytes(64).toString("base64url");
process.env.JWT_ISSUER ??= "global-india-test";
process.env.JWT_AUDIENCE ??= "global-india-admin-test";
process.env.REFRESH_PEPPER ??= randomBytes(64).toString("base64url");
process.env.OTP_PEPPER ??= randomBytes(64).toString("base64url");
process.env.MFA_PENDING_SECRET ??= randomBytes(64).toString("base64url");
process.env.IP_HASH_SALT ??= randomBytes(32).toString("base64url");
process.env.TOTP_ENC_KEY ??= randomBytes(32).toString("base64");
